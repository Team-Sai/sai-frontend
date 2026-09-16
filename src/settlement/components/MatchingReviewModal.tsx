import { useEffect, useState } from 'react';
import { authFetch } from '../../auth/authFetch';
import './matching-review-modal.css';

type Options = { reviewChannel: string; targetType?: string | null; aggregateId?: string | number | null };
type Props = { open: boolean; onClose: (changed: boolean) => void; options: Options };

type Candidate = { matchCandidateId:number; targetType:string; targetName?:string; aggregateId?:number; participantName?:string; expectedRemainingAmount?:number; amountMatchType?:string };
type Review = { transaction:{ bankTransactionId:number; linkedAccountId:number; amount?:number; counterpartyName?:string; transactionAt?:string; memo?:string }; candidates:Candidate[] };

const money=(v?:number)=>`${Number(v??0).toLocaleString('ko-KR')}원`;
const dt=(v?:string)=>v?new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'거래일시 미상';

export default function MatchingReviewModal({ open, onClose, options }: Props) {
  const [reviews,setReviews]=useState<Review[]>([]);
  const [total,setTotal]=useState(0);
  const [page,setPage]=useState(0);
  const [selected,setSelected]=useState<Record<number,number>>({});
  const [results,setResults]=useState<Record<number,{type:string;message:string}>>({});
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState('');
  const [changed,setChanged]=useState(false);
  const [rejectId,setRejectId]=useState<number|null>(null);

  async function load(append=false){
    setLoading(true); setMessage('');
    try{
      const q=new URLSearchParams({reviewChannel:options.reviewChannel,page:String(append?page:0),size:'20'});
      if(options.targetType) q.set('targetType',options.targetType);
      if(options.aggregateId!=null) q.set('aggregateId',String(options.aggregateId));
      const r=await authFetch(`/api/matching-reviews?${q}`); const b=await r.json().catch(()=>null);
      if(!r.ok) throw new Error(b?.message||'확인 필요 거래를 불러오지 못했습니다.');
      setReviews(prev=>append?[...prev,...(b?.content||[])]:b?.content||[]); setTotal(Number(b?.totalCount||0)); setPage(Number(b?.page||0)+1);
    }catch(e){setMessage(e instanceof Error?e.message:'조회 실패');}finally{setLoading(false)}
  }

  useEffect(()=>{ if(open){ setReviews([]);setResults({});setSelected({});setChanged(false);setPage(0); void load(false);} },[open, options.reviewChannel, options.targetType, options.aggregateId]);
  if(!open) return null;

  async function apply(review:Review){
    const id=review.transaction.bankTransactionId; const cid=selected[id]; if(!cid) return;
    try{
      const r=await authFetch(`/api/linked-accounts/${review.transaction.linkedAccountId}/transactions/${id}/matching-review/apply`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({matchCandidateId:cid})});
      const b=await r.json().catch(()=>null); if(!r.ok) throw new Error(b?.message||'선택한 후보를 반영하지 못했습니다.');
      setChanged(true); setResults(v=>({...v,[id]:{type:'APPLIED',message:b?.message||'선택한 거래를 반영했습니다.'}}));
    }catch(e){setMessage(e instanceof Error?e.message:'반영 실패')}
  }
  async function reject(){
    const review=reviews.find(x=>x.transaction.bankTransactionId===rejectId); if(!review||rejectId==null)return;
    try{
      const r=await authFetch(`/api/linked-accounts/${review.transaction.linkedAccountId}/transactions/${rejectId}/matching-review/reject`,{method:'POST'}); const b=await r.json().catch(()=>null);
      if(!r.ok) throw new Error(b?.message||'미매칭 처리하지 못했습니다.'); setChanged(true); setResults(v=>({...v,[rejectId]:{type:'UNMATCHED',message:'이 거래는 어느 후보에도 반영되지 않았습니다.'}})); setRejectId(null);
    }catch(e){setMessage(e instanceof Error?e.message:'미매칭 처리 실패')}
  }
  const completed=(Object.values(results) as Array<{type:string;message:string}>).filter(v=>v.type!=='DEFERRED').length;
  return <>
    <div className="matching-review-overlay">
      <section className="matching-review-modal" role="dialog" aria-modal="true">
        <header className="matching-review-modal__header"><div><h2>{`확인이 필요한 거래 ${total}건`}</h2><p>{completed}건 처리 · {Math.max(total-completed,0)}건 남음</p></div><button className="matching-review-icon-button" onClick={()=>onClose(changed)}>×</button></header>
        {message && <div className="matching-review-message is-error">{message}</div>}
        <div className="matching-review-modal__body">
          {loading && reviews.length===0 && <div className="matching-review-loading">확인 필요 거래를 불러오는 중입니다.</div>}
          {!loading && reviews.length===0 && !message && <div className="matching-review-empty">현재 화면에서 확인할 거래가 없습니다.</div>}
          {reviews.map(review=>{
            const t=review.transaction; const result=results[t.bankTransactionId];
            if(result) return <article key={t.bankTransactionId} className={`matching-review-card matching-review-card--result${result.type==='UNMATCHED'?' is-unmatched':''}`}><div className="matching-review-result-icon">{result.type==='UNMATCHED'?'–':'✓'}</div><div><h3>{result.type==='UNMATCHED'?'미매칭 처리 완료':result.type==='DEFERRED'?'나중에 확인':'처리 완료'}</h3><p>{result.message}</p></div></article>;
            return <article key={t.bankTransactionId} className="matching-review-card">
              <header className="matching-review-card__header"><div className="matching-review-card__amount">{money(t.amount)} 입금</div><div className="matching-review-card__meta">{t.counterpartyName||'입금자 미상'} · {dt(t.transactionAt)}{t.memo?` · ${t.memo}`:''}</div><div className="matching-review-card__badges"><span className="matching-review-badge matching-review-badge--warning">확인 필요</span>{review.candidates.length>1&&<span className="matching-review-badge">복수 후보</span>}</div></header>
              <div className="matching-review-card__content"><p className="matching-review-card__instruction">다음 중 반영할 대상을 하나 선택해 주세요.</p><div className="matching-review-candidates">
                {review.candidates.map(c=>{const diff=Number(t.amount||0)-Number(c.expectedRemainingAmount||0); return <label key={c.matchCandidateId} className={`matching-review-candidate${selected[t.bankTransactionId]===c.matchCandidateId?' is-selected':''}`}><input type="radio" name={`c-${t.bankTransactionId}`} checked={selected[t.bankTransactionId]===c.matchCandidateId} onChange={()=>setSelected(v=>({...v,[t.bankTransactionId]:c.matchCandidateId}))}/><span className="matching-review-candidate__main"><strong>{c.targetName||`${c.targetType==='LOAN'?'차용증':'정산'} #${c.aggregateId}`}</strong><small><span className={`matching-review-badge matching-review-badge--${c.targetType==='LOAN'?'loan':'settlement'}`}>{c.targetType==='LOAN'?'차용증':'정산'}</span> 참여자 {c.participantName||'-'}</small></span><span className="matching-review-candidate__money"><small>예정 잔여금액</small><strong>{money(c.expectedRemainingAmount)}</strong></span><span className={`matching-review-candidate__difference${diff<0?' is-short':''}`}><small>{({EXACT:'정확 일치',PARTIAL:'부분입금',EXCESS:'초과입금'} as Record<string,string>)[c.amountMatchType||'']||'금액 확인'}</small><span>{diff===0?'정확히 일치':diff>0?`${money(diff)} 초과`:`${money(Math.abs(diff))} 부족`}</span></span></label>})}
              </div><footer className="matching-review-card__actions"><button className="matching-review-button matching-review-button--ghost" onClick={()=>setResults(v=>({...v,[t.bankTransactionId]:{type:'DEFERRED',message:'거래는 확인 필요 상태로 유지되며 나중에 다시 표시됩니다.'}}))}>나중에 하기</button><button className="matching-review-button matching-review-button--secondary" onClick={()=>setRejectId(t.bankTransactionId)}>어느 후보도 아님</button><button className="matching-review-button matching-review-button--primary" disabled={!selected[t.bankTransactionId]} onClick={()=>void apply(review)}>선택하여 반영</button></footer></div>
            </article>
          })}
        </div>
        {reviews.length<total && <footer className="matching-review-modal__footer"><button className="matching-review-button matching-review-button--secondary" disabled={loading} onClick={()=>void load(true)}>더 보기</button></footer>}
      </section>
    </div>
    {rejectId!=null&&<div className="matching-review-confirm-overlay"><section className="matching-review-confirm" role="alertdialog" aria-modal="true"><h3>어느 후보도 아닌가요?</h3><p>이 거래를 어느 정산이나 차용증에도 반영하지 않으시겠어요?</p><small>미매칭 처리하면 현재 확인 목록에서 제외됩니다.</small><div className="matching-review-confirm__actions"><button className="matching-review-button matching-review-button--secondary" onClick={()=>setRejectId(null)}>취소</button><button className="matching-review-button matching-review-button--danger" onClick={()=>void reject()}>미매칭 처리</button></div></section></div>}
  </>;
}
