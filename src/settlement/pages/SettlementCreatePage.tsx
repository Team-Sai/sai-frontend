import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { settlementApi } from '../api/settlementApi';
import type {
  CreateRecurringSettlementPayload,
  CreateSharedSettlementPayload,
  LinkedSettlementAccount,
  ParticipantLookup,
  SettlementType,
} from '../types/settlement';
import '../styles/settlement-common.css';
import '../styles/settlement-create.css';
import '../styles/settlement-create-payer.css';

type Errors = Record<string,string>;
const sharedCategories=['여행','생활비','회식','공동구매','모임','기타'];
const recurringCategories=['생활비','회비','공과금','구독료','간병비','공동구매','기타'];
const fmtDate=(v:string)=>v?v.split('-').join('.'):'선택 전';

function getCurrentUserIdFromAccessToken(): number | null {
  try {
    let accessToken =
      sessionStorage.getItem('accessToken') ??
      sessionStorage.getItem('saiwonjangAccessToken');

    if (!accessToken) {
      const authJson = sessionStorage.getItem('saiwonjangAuth');
      if (authJson) {
        const auth = JSON.parse(authJson) as {
          accessToken?: string;
          token?: string;
        };
        accessToken = auth.accessToken ?? auth.token ?? null;
      }
    }

    if (!accessToken) {
      return null;
    }

    const token = accessToken.replace(/^Bearer\s+/i, '');
    const payloadPart = token.split('.')[1];

    if (!payloadPart) {
      return null;
    }

    const normalized = payloadPart
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - normalized.length % 4) % 4),
      '=',
    );
    const bytes = Uint8Array.from(
      atob(padded),
      (character) => character.charCodeAt(0),
    );
    const payload = JSON.parse(
      new TextDecoder().decode(bytes),
    ) as { sub?: string | number };
    const userId = Number(payload.sub);

    return Number.isFinite(userId) ? userId : null;
  } catch {
    return null;
  }
}

export default function SettlementCreatePage(){
  const navigate=useNavigate();
  const [type,setType]=useState<SettlementType>('SHARED');
  const [title,setTitle]=useState('');
  const [category,setCategory]=useState('');
  const [dueDate,setDueDate]=useState('');
  const [cycleRule,setCycleRule]=useState('');
  const [startDate,setStartDate]=useState('');
  const [endDate,setEndDate]=useState('');
  const [amount,setAmount]=useState('');
  const [participantToken,setParticipantToken]=useState('');
  const [participants,setParticipants]=useState<ParticipantLookup[]>([]);
  const [accounts,setAccounts]=useState<LinkedSettlementAccount[]>([]);
  const [accountId,setAccountId]=useState('');
  const [ownerName,setOwnerName]=useState('나');
  const [errors,setErrors]=useState<Errors>({});
  const [toast,setToast]=useState<{text:string;error?:boolean}|null>(null);
  const [looking,setLooking]=useState(false);
  const lookupInFlightRef=useRef(false);
  const currentUserId=getCurrentUserIdFromAccessToken();
  const [submitting,setSubmitting]=useState(false);
  const now=new Date();
  const today=new Date(
    now.getTime()-now.getTimezoneOffset()*60_000,
  ).toISOString().slice(0,10);
  const rawAmount=Number(amount.replace(/[^\d]/g,''))||0;
  const perPerson=Math.floor(rawAmount/(participants.length+1));
  const selectedAccount=accounts.find(a=>String(a.linkedAccountId)===accountId);
  const categories=type==='SHARED'?sharedCategories:recurringCategories;
  const showToast=(text:string,error=false)=>{setToast({text,error});window.setTimeout(()=>setToast(null),3000)};
  const setError=(k:string,v:string)=>setErrors(prev=>({...prev,[k]:v}));

  useEffect(()=>{
    void (async()=>{
      try{
        const [accountResult,userResult]=await Promise.allSettled([settlementApi.linkedAccounts(),settlementApi.currentUser()]);
        if(accountResult.status==='fulfilled'){
          const data=accountResult.value;
          setAccounts(
            Array.isArray(data)
              ? data
              : Array.isArray(data?.data)
                ? data.data
                : [],
          );
        }
        if(userResult.status==='fulfilled') setOwnerName(userResult.value?.name||userResult.value?.userName||'나');
      }catch{/* handled individually */}
    })();
  },[]);

  async function addParticipant(){
    if(lookupInFlightRef.current)return;

    const token=participantToken.trim(); setError('participantLookup',''); setError('participants','');
    if(!token){setError('participantLookup','조회할 회원 코드를 입력해 주세요.');return}
    if(participants.some(p=>p.userToken===token)){setError('participantLookup','이미 추가한 참여자입니다.');return}

    lookupInFlightRef.current=true;
    try{
      setLooking(true); const u=await settlementApi.lookupParticipant(token);
      const p:ParticipantLookup={userId:u?.userId??u?.id,userToken:u?.userToken||u?.token||token,name:u?.name||u?.userName||u?.nickname||'이름 없는 회원'};

      if(currentUserId!==null&&p.userId===currentUserId){
        setError('participantLookup','생성자 본인은 참여자로 추가할 수 없습니다.');
        return;
      }

      if(participants.some(x=>x.userToken===p.userToken)){setError('participantLookup','이미 추가한 참여자입니다.');return}
      setParticipants(prev=>prev.some(x=>x.userToken===p.userToken)?prev:[...prev,p]);setParticipantToken('');showToast(`${p.name} 님을 참여자로 추가했습니다.`);
    }catch(e){setError('participantLookup',e instanceof Error?e.message:'회원 조회 중 오류가 발생했습니다.')}finally{lookupInFlightRef.current=false;setLooking(false)}
  }

  function validate(){
    const e:Errors={};
    if(!title.trim())e.title='정산명을 입력해 주세요.';
    if(!category)e.settlementCategory='정산 성격을 선택해 주세요.';
    if(!Number.isInteger(rawAmount)||rawAmount<=0)e.totalAmount='총 금액을 1원 이상 입력해 주세요.';
    if(participants.length===0)e.participants='참여자를 한 명 이상 추가해 주세요.';
    if(!accountId)e.linkedAccountId='정산 수취 계좌를 선택해 주세요.';
    if(type==='SHARED'){
      if(!dueDate)e.dueDate='정산 마감일을 입력해 주세요.'; else if(dueDate<today)e.dueDate='정산 마감일은 오늘 이후여야 합니다.';
    }else{
      if(!cycleRule)e.cycleRule='반복 주기를 선택해 주세요.';
      if(!startDate)e.startDate='시작일을 입력해 주세요.';
      else if(startDate<today)e.startDate='시작일은 오늘 이후여야 합니다.';
      if(startDate&&endDate&&endDate<startDate)e.endDate='종료일은 시작일보다 빠를 수 없습니다.';
    }
    setErrors(e); return Object.keys(e).length===0;
  }

  async function submit(ev:FormEvent){
    ev.preventDefault(); if(!validate()){showToast('필수 입력값을 확인해 주세요.',true);return}
    const common={
      settlementCategory:category,
      title:title.trim(),
      totalAmount:rawAmount,
      linkedAccountId:Number(accountId),
      participants:participants.map(p=>({userToken:p.userToken})),
    };

    try{
      setSubmitting(true);

      if(type==='SHARED'){
        const payload:CreateSharedSettlementPayload={
          ...common,
          dueDate,
        };
        const result=await settlementApi.createShared(payload);
        navigate(`/settlements?created=${encodeURIComponent(result.settlementId)}`);
      }else{
        const payload:CreateRecurringSettlementPayload={
          ...common,
          cycleRule:cycleRule as CreateRecurringSettlementPayload['cycleRule'],
          startDate,
          endDate:endDate||null,
        };
        const result=await settlementApi.createRecurring(payload);
        navigate(`/settlements?created=${encodeURIComponent(result.firstSettlementId)}`);
      }
    }catch(e){showToast(e instanceof Error?e.message:'요청 처리 중 오류가 발생했습니다.',true)}finally{setSubmitting(false)}
  }

  const summaryDue=type==='SHARED'?fmtDate(dueDate):fmtDate(startDate);
  return <>
    <main className="create-shell settlement-create-page">
      <div className="breadcrumb"><Link to="/settlements">정산 서비스</Link><span>/</span><strong>정산 생성</strong></div>
      <div className="create-heading unified-page-header"><h1 className="unified-page-title">새로운 정산 만들기</h1><p>{type==='SHARED'?'총 금액과 참여자를 선택하면 참여자별 납부 예정 금액을 균등하게 계산합니다.':'구독료, 회비, 공과금, 간병비처럼 반복되는 공동 비용을 정기적으로 관리합니다.'}</p></div>
      <div className="settlement-type-tabs" role="tablist"><button className={`type-tab${type==='SHARED'?' active':''}`} type="button" onClick={()=>{setType('SHARED');setCategory('');setErrors({})}}>공동정산</button><button className={`type-tab${type==='RECURRING'?' active':''}`} type="button" onClick={()=>{setType('RECURRING');setCategory('');setErrors({})}}>정기정산</button></div>
      <div className="create-layout">
        <form id="shared-settlement-form" className="form-column" onSubmit={submit} noValidate>
          <section className="form-card"><div className="card-title"><span className="card-icon">▤</span><h2>정산 기본 정보</h2></div><div className="field-grid two-column">
            <label className="form-field"><span>정산명 <em>(필수)</em></span><input value={title} onChange={e=>setTitle(e.target.value)} maxLength={200} placeholder={type==='SHARED'?'예: 제주 여행 경비':'예: 부모님 간병비 월 분담'} /><small className="field-error">{errors.title}</small></label>
            <label className="form-field"><span>정산 성격 <em>(필수)</em></span><select value={category} onChange={e=>setCategory(e.target.value)}><option value="">선택해 주세요</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select><small className="field-error">{errors.settlementCategory}</small></label>
          </div></section>
          {type==='SHARED'?<section className="form-card"><div className="card-title"><span className="card-icon">□</span><h2>정산 마감일</h2></div><label className="form-field date-field"><span>납부 마감일 <em>(필수)</em></span><input type="date" min={today} value={dueDate} onChange={e=>setDueDate(e.target.value)}/><small className="field-error">{errors.dueDate}</small></label></section>:
          <section className="form-card"><div className="card-title"><span className="card-icon">↻</span><h2>정기정산 설정</h2></div><div className="field-grid two-column"><label className="form-field"><span>반복 주기 <em>(필수)</em></span><select value={cycleRule} onChange={e=>setCycleRule(e.target.value)}><option value="">선택해 주세요</option><option value="DAILY">매일</option><option value="WEEKLY">매주</option><option value="MONTHLY">매월</option><option value="YEARLY">매년</option></select><small className="field-error">{errors.cycleRule}</small></label><label className="form-field"><span>시작일 <em>(필수)</em></span><input type="date" min={today} value={startDate} onChange={e=>{setStartDate(e.target.value);if(endDate&&e.target.value>endDate)setEndDate('')}}/><small className="field-error">{errors.startDate}</small></label><label className="form-field"><span>종료일</span><input type="date" min={startDate||today} value={endDate} onChange={e=>setEndDate(e.target.value)}/><small className="field-error">{errors.endDate}</small></label></div></section>}
          <section className="form-card"><div className="card-title"><span className="card-icon">≋</span><h2>분배 방식</h2></div><div className="choice-grid"><label className="choice-card selected"><input type="radio" checked readOnly/><span className="choice-title">균등 분배</span><span className="choice-description">총 금액을 생성자와 참여자 수로 균등하게 나눕니다.</span></label><label className="choice-card disabled"><input type="radio" disabled/><span className="choice-title">직접 설정</span><span className="choice-description">참여자별 금액 설정은 추후 지원할 예정입니다.</span></label></div></section>
          <section className="form-card"><div className="card-title"><span className="card-icon">▣</span><h2>{type==='SHARED'?'총 금액':'회차별 총금액'}</h2></div><label className="form-field"><span>{type==='SHARED'?'총 금액':'회차별 총금액'} <em>(필수)</em></span><input inputMode="numeric" value={amount} onChange={e=>{const raw=e.target.value.replace(/[^\d]/g,'').slice(0,13);setAmount(raw?Number(raw).toLocaleString('ko-KR'):'')}} placeholder="예: 450,000"/><small>원 단위로 입력해 주세요.</small><small className="field-error">{errors.totalAmount}</small></label></section>
          <section className="form-card payer-card"><div className="card-title"><span className="card-icon">♙</span><h2>참여자</h2></div><div className="participant-lookup"><label className="form-field participant-token-field"><span>회원 코드로 참여자 조회</span><input value={participantToken} onChange={e=>setParticipantToken(e.target.value)} onKeyDown={(e:KeyboardEvent<HTMLInputElement>)=>{if(e.key==='Enter'&&!looking){e.preventDefault();void addParticipant()}}} placeholder="예: SAI_ABCD1234" /></label><button type="button" className="button button-primary participant-lookup-button" disabled={looking} onClick={()=>void addParticipant()}>{looking?'조회 중...':'조회 후 추가'}</button></div><small className="field-error">{errors.participantLookup}</small><div className="participant-chips"><span className="participant-chip owner">{ownerName} (생성자)</span>{participants.map(p=><span key={p.userToken} className="participant-chip removable"><span className="participant-chip-name">{p.name}</span><span className="participant-chip-token">{p.userToken}</span><button type="button" className="participant-remove-button" onClick={()=>setParticipants(v=>v.filter(x=>x.userToken!==p.userToken))}>×</button></span>)}</div>{participants.length===0&&<p className="participant-help">생성자를 제외하고 참여자를 한 명 이상 추가해 주세요.</p>}<small className="field-error">{errors.participants}</small></section>
          <section className="form-card"><div className="card-title"><span className="card-icon">▥</span><h2>정산 수취 계좌</h2></div><label className="form-field"><span>수취 계좌 <em>(필수)</em></span><select value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">계좌를 선택해 주세요</option>{accounts.map(a=><option key={a.linkedAccountId} value={a.linkedAccountId}>{[a.bankName,a.accountAlias,a.maskedAccountNumber].filter(Boolean).join(' ')}</option>)}</select><small>사이원장에 연동한 본인 계좌 중 정산금을 받을 계좌를 선택해 주세요.</small><small className="field-error">{errors.linkedAccountId}</small></label></section>
        </form>
        <aside className="summary-panel"><div className="summary-header">{type==='SHARED'?'공동 정산 요약':'정기 정산 요약'}</div><div className="summary-body"><dl className="summary-list"><div><dt>정산명</dt><dd>{title.trim()||'입력 전'}</dd></div><div><dt>정산 성격</dt><dd>{category||'선택 전'}</dd></div><div><dt>참여자 수</dt><dd>{participants.length+1}명 (본인 포함)</dd></div><div><dt>분배 방식</dt><dd>균등 분배</dd></div><div><dt>총 금액</dt><dd>{rawAmount?`${rawAmount.toLocaleString('ko-KR')}원`:'입력 전'}</dd></div><div><dt>예상 1인당 금액</dt><dd>{perPerson?`${perPerson.toLocaleString('ko-KR')}원`:'계산 전'}</dd></div></dl><div className="summary-divider"></div><div className="account-summary"><span>정산 계좌</span><strong>{selectedAccount?[selectedAccount.bankName,selectedAccount.accountAlias,selectedAccount.maskedAccountNumber].filter(Boolean).join(' '):'아직 설정되지 않음'}</strong></div><dl className="summary-list compact"><div><dt>{type==='SHARED'?'정산 마감일':'정기 시작일'}</dt><dd>{summaryDue}</dd></div><div><dt>생성 후 상태</dt><dd>진행 중</dd></div></dl><button className="button button-primary submit-button" type="submit" form="shared-settlement-form" disabled={submitting}>{submitting?'생성 중...':type==='SHARED'?'공동정산 생성':'정기정산 생성'}</button><p className="submit-description">생성이 완료되면 선택한 참여자에게 정산 요청이 전송됩니다.</p></div></aside>
      </div>
    </main>
    {toast&&<div className={`toast visible${toast.error?' error':''}`}>{toast.text}</div>}
  </>
}
