import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import MatchingReviewModal from '../components/MatchingReviewModal';
import { settlementApi } from '../api/settlementApi';
import type { LinkedSettlementAccount, PaymentObligation, SettlementDetail, SettlementPaymentStatus } from '../types/settlement';
import '../settlement-common.css';
import '../settlement-detail.css';

const money=(v?:number)=>Number(v??0).toLocaleString('ko-KR');
const date=(v?:string|null)=>v?String(v).split('T')[0].split('-').join('.'):'-';
const dt=(v?:string|null)=>!v?'-':new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v));
const statusText=(v?:string)=>({IN_PROGRESS:'진행중',CLOSED:'완료',CANCELLED:'취소'} as Record<string,string>)[v||'']||'-';
const roleText=(v?:string)=>({OWNER:'정산자',MEMBER:'참여자'} as Record<string,string>)[v||'']||'-';
const splitText=(v?:string)=>({EQUAL:'균등',CUSTOM:'직접 설정'} as Record<string,string>)[v||'']||'-';
const paymentText=(o:PaymentObligation)=>o.obligationStatus==='WRITTEN_OFF'?'상각 처리':o.overdueSince&&o.paymentStatus!=='PAID'?'연체':({PAID:'입금 완료',PARTIALLY_PAID:'일부 입금',UNPAID:'미입금'} as Record<string,string>)[o.paymentStatus]||'-';
const paymentClass=(o:PaymentObligation)=>o.obligationStatus==='WRITTEN_OFF'?'status-written-off':o.overdueSince&&o.paymentStatus!=='PAID'?'status-overdue':o.paymentStatus==='PAID'?'status-paid':o.paymentStatus==='PARTIALLY_PAID'?'status-partial':'status-unpaid';

export default function SettlementDetailPage(){
  const { settlementId }=useParams(); const id=Number(settlementId);
  const [detail,setDetail]=useState<SettlementDetail|null>(null);
  const [status,setStatus]=useState<SettlementPaymentStatus>({});
  const [account,setAccount]=useState<LinkedSettlementAccount|null>(null);
  const [syncTime,setSyncTime]=useState('-');
  const [toast,setToast]=useState<{text:string;error?:boolean}|null>(null);
  const [closeModal,setCloseModal]=useState(false);
  const [reviewOpen,setReviewOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const showToast=(text:string,error=false)=>{setToast({text,error});window.setTimeout(()=>setToast(null),3000)};

  const load=useCallback(async()=>{
    if(!Number.isFinite(id)) return;
    try{
      setBusy(true);
      const [d,s,a]=await Promise.all([settlementApi.detail(id),settlementApi.paymentStatus(id),settlementApi.account(id)]);
      setDetail(d);setStatus(s);setAccount(a);setSyncTime(dt(new Date().toISOString()));
    }catch(e){showToast(e instanceof Error?e.message:'정산 상세 정보를 불러오지 못했습니다.',true)}finally{setBusy(false)}
  },[id]);

  useEffect(()=>{void load()},[load]);
  const obligations=status.obligations||[];
  const paidCount=obligations.filter(o=>o.paymentStatus==='PAID').length;
  const attentionCount=obligations.filter(o=>o.obligationStatus==='WRITTEN_OFF'||(o.overdueSince&&o.paymentStatus!=='PAID')).length;
  const progress=Math.max(0,Math.min(100,Number(status.progressRate||0)));
  const participantProgress=obligations.length?Math.round((paidCount/obligations.length)*100):0;
  const recurring=detail?.settlementType==='RECURRING';

  async function sync(){
    if(!account?.linkedAccountId){showToast('동기화할 수취 계좌를 확인할 수 없습니다.',true);return}
    try{setBusy(true);const r=await settlementApi.syncAccount(account.linkedAccountId);showToast(`동기화 완료: 자동반영 ${r.appliedCount??0}건, 확인필요 ${r.needsCheckCount??0}건, 미매칭 ${r.unmatchedCount??0}건`);await load();setReviewOpen(true)}catch(e){showToast(e instanceof Error?e.message:'거래내역 동기화에 실패했습니다.',true)}finally{setBusy(false)}
  }
  async function closeSettlement(){
    try{setBusy(true);await settlementApi.close(id);setCloseModal(false);showToast('정산이 마감되었습니다.');await load()}catch(e){showToast(e instanceof Error?e.message:'정산 마감에 실패했습니다.',true)}finally{setBusy(false)}
  }

  if(!Number.isFinite(id)) return <main className="page-shell"><div className="empty-state">정산 ID를 확인할 수 없습니다.</div></main>;
  return <>
    <main className="page-shell">
      <section className="detail-heading"><div><div className="heading-badges"><span className={`badge ${detail?.settlementStatus==='CLOSED'?'badge-completed':'badge-progress'}`}>{statusText(detail?.settlementStatus)}</span><span className="badge badge-role">{roleText(detail?.role)}</span><span className="badge">{recurring?'정기정산':'공동정산'}</span></div><h1>{detail?.title||'정산 상세'}</h1></div><div className="heading-actions"><Link className="button button-secondary" to="/settlements">목록으로</Link>{detail?.role!=='MEMBER'&&<button className="button button-secondary" type="button" onClick={()=>void sync()} disabled={busy}>↻ 거래내역 동기화</button>}{detail?.role==='OWNER'&&<button className="button button-primary" type="button" disabled={detail.settlementStatus==='CLOSED'||!status.closable||busy} onClick={()=>setCloseModal(true)}>정산 마감</button>}</div></section>

      <section className="summary-card"><div className="summary-item"><span>전체 지출 합계</span><strong>{money(status.totalExpectedAmount)}원</strong></div><div className="summary-item"><span>입금 완료 금액</span><strong className="text-success">{money(status.totalPaidAmount)}원</strong></div><div className="summary-item"><span>미정산 금액</span><strong>{money(status.totalRemainingAmount)}원</strong></div><div className="summary-progress"><div className="progress-meta"><span>입금률</span><strong>{progress}%</strong></div><div className="progress-track"><div className="progress-bar" style={{width:`${progress}%`}}/></div><div className="progress-count"><strong>{paidCount}</strong>/<span>{obligations.length}</span></div></div></section>

      <section className="meta-card">{recurring?<><div className="meta-item"><span>시작일</span><strong>{date(detail?.startDate)}</strong></div><div className="meta-divider"/><div className="meta-item"><span>종료일</span><strong>{detail?.endDate?date(detail.endDate):'종료일 없음'}</strong></div></>:<div className="meta-item"><span>마감일</span><strong>{date(detail?.dueDate)}</strong></div>}<div className="meta-divider"/><div className="meta-item meta-grow"><span>정산 목적</span><strong>{detail?.settlementCategory||'-'}</strong></div><div className="meta-divider"/><div className="meta-item"><span>참여 인원</span><strong>{obligations.length}명</strong></div></section>

      <div className="detail-grid"><aside className="side-column"><section className="panel"><div className="panel-header"><h2>정산 요청 정보</h2><button className="text-button" type="button" disabled>요청 계좌 변경</button></div><div className="account-card"><div className="account-icon">₩</div><div><span>{account?.bankName||'수취 계좌'}</span><strong>{account?.maskedAccountNumber||'계좌 정보 없음'}</strong><small>{account?.accountHolderName||'-'}</small></div></div><dl className="info-list"><div><dt>분배 방식</dt><dd>{splitText(detail?.splitType)}</dd></div><div><dt>최근 동기화</dt><dd>{syncTime}</dd></div><div><dt>확인 필요</dt><dd className="text-danger">{attentionCount}명</dd></div></dl></section>
        <section className="panel"><div className="panel-header"><h2>참여자 정산 현황</h2><span className="panel-side-text">{participantProgress}%</span></div><div className="participant-avatar-list">{obligations.length?obligations.slice(0,6).map(o=><div key={o.participantId} className="participant-avatar"><div className="avatar-circle" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></div><strong>{o.participantName||`참여자 #${o.participantId}`}</strong><small>{paymentText(o)}</small></div>):<div className="participant-avatar"><small>참여자가 없습니다.</small></div>}</div></section></aside>
        <section className="panel participant-panel"><div className="panel-header participant-panel-header"><div><h2>참여자별 입금 현황</h2><p>정산 생성 시 만들어진 납부의무와 실제 입금 반영 결과입니다.</p></div><button className="button button-secondary button-small" type="button" onClick={()=>void load()} disabled={busy}>↻ 새로고침</button></div><div className="table-scroll"><table className="payment-table"><thead><tr><th>참여자</th><th>분담 금액</th><th>입금 금액</th><th>잔여 금액</th><th>최근 입금일</th><th>입금 상태</th><th>관리</th></tr></thead><tbody>{obligations.map(o=><tr key={o.participantId}><td className="name-cell">{o.participantName||`참여자 #${o.participantId}`}</td><td>{money(o.expectedAmount)}원</td><td>{money(o.paidAmount)}원</td><td>{money(o.remainingAmount)}원</td><td>{dt(o.latestPaymentAt)}</td><td><span className={`status-chip ${paymentClass(o)}`}>● {paymentText(o)}</span></td><td><button className="manage-button" type="button" disabled>-</button></td></tr>)}</tbody></table></div>{obligations.length===0&&<div className="empty-state">등록된 납부 대상이 없습니다.</div>}</section>
      </div>
    </main>
    {closeModal&&<div className="close-confirm-modal"><div className="close-confirm-card" role="dialog" aria-modal="true"><h2>정산을 마감할까요?</h2><p>마감 후에는 정산 상태가 완료로 변경됩니다.</p><div className="close-confirm-actions"><button type="button" className="button button-secondary" onClick={()=>setCloseModal(false)}>취소</button><button type="button" className="button button-primary" onClick={()=>void closeSettlement()}>완료</button></div></div></div>}
    {toast&&<div className={`toast visible${toast.error?' error':''}`}>{toast.text}</div>}
    <MatchingReviewModal open={reviewOpen} onClose={(changed)=>{setReviewOpen(false);if(changed)void load()}} options={{reviewChannel:'TRANSACTION_HISTORY',targetType:'SETTLEMENT',aggregateId:id}}/>
  </>
}
