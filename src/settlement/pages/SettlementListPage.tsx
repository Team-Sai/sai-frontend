import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { settlementApi } from '../api/settlementApi';
import MatchingReviewModal from '../components/MatchingReviewModal';
import type { SettlementListItem, SettlementSummary } from '../types/settlement';
import '../styles/settlement-common.css';
import '../styles/settlement-list.css';

const money = (v?: number) => Number(v ?? 0).toLocaleString('ko-KR');
const date = (v?: string | null) => v ? v.split('T')[0].split('-').join('.') : '-';
const period = (s?: string | null, e?: string | null) => !s ? '-' : `${date(s)} ~ ${e ? date(e) : '계속'}`;

function fetchSettlementListData(){
  return Promise.allSettled([settlementApi.list(),settlementApi.summary()]);
}

export default function SettlementListPage() {
  const [items, setItems] = useState<SettlementListItem[]>([]);
  const [summary, setSummary] = useState<SettlementSummary>({});
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [sort, setSort] = useState('LATEST');
  const [syncing, setSyncing] = useState(false);
  const [syncTime, setSyncTime] = useState(() =>
    new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(new Date()),
  );
  const [toast, setToast] = useState<{text:string; error?:boolean}|null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const showToast = (text: string, error = false) => {
    setToast({ text, error });
    window.setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    const [listResult, summaryResult] = await fetchSettlementListData();
    if (listResult.status === 'fulfilled') setItems(listResult.value);
    else { setItems([]); showToast('정산 목록을 불러오지 못했습니다.', true); }
    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value);
    else { setSummary({}); showToast('정산 요약을 불러오지 못했습니다.', true); }
  }, []);

  useEffect(() => {
    let cancelled=false;
    fetchSettlementListData().then(([listResult,summaryResult])=>{
      if(cancelled)return;
      if(listResult.status==='fulfilled')setItems(listResult.value);
      else{setItems([]);showToast('정산 목록을 불러오지 못했습니다.',true)}
      if(summaryResult.status==='fulfilled')setSummary(summaryResult.value);
      else{setSummary({});showToast('정산 요약을 불러오지 못했습니다.',true)}
    });
    return()=>{cancelled=true};
  }, []);

  useEffect(() => {
    const created = searchParams.get('created');
    if (!created) return;
    const timeout=window.setTimeout(()=>{
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('created');
      setSearchParams(nextParams, { replace: true });
    },3000);
    return()=>window.clearTimeout(timeout);
  }, [searchParams, setSearchParams]);

  const createdNotice=searchParams.get('created');

  const filtered = useMemo(() => {
    const copy = items.filter((s) => {
      const keywordMatch = !keyword || String(s.title || '').toLowerCase().includes(keyword.toLowerCase());
      return keywordMatch && (type === 'ALL' || s.settlementType === type) && (status === 'ALL' || s.settlementStatus === status);
    });
    if (sort === 'LATEST') {
      copy.sort((a, b) => b.settlementId - a.settlementId);
    }

    if (sort === 'AMOUNT_DESC') {
      copy.sort(
        (a, b) => Number(b.totalAmount || 0) - Number(a.totalAmount || 0),
      );
    }

    if (sort === 'DEADLINE') {
      const deadline = (item: SettlementListItem) =>
        item.settlementType === 'RECURRING'
          ? item.cycleDate || item.startDate || item.endDate || ''
          : item.dueDate || '';

      copy.sort((a, b) => deadline(a).localeCompare(deadline(b)));
    }
    return copy;
  }, [items, keyword, type, status, sort]);

  async function sync() {
    try {
      setSyncing(true);
      const result = await settlementApi.syncAll();
      showToast(`동기화 완료: 자동반영 ${result.appliedCount ?? 0}건, 확인필요 ${result.needsCheckCount ?? 0}건, 미매칭 ${result.unmatchedCount ?? 0}건`);
      await load();
      setSyncTime(new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(new Date()));
      setReviewOpen(true);
    } catch (e) { showToast(e instanceof Error ? e.message : '거래내역 동기화에 실패했습니다.', true); }
    finally { setSyncing(false); }
  }

  return <>
    <main className="page-shell settlement-list-page">
      <section className="page-heading unified-page-header">
        <div><h1 className="unified-page-title">내 정산</h1></div>
        <div className="heading-actions">
          <p className="updated-text">최근 동기화 <span>{syncTime}</span></p>
          <button className="button button-secondary" type="button" onClick={sync} disabled={syncing}>↻ {syncing ? '동기화 중...' : '거래내역 동기화'}</button>
          <Link className="button button-primary" to="/settlements/new">정산 생성</Link>
        </div>
      </section>

      <section className="summary-grid" aria-label="정산 요약">
        <article className="summary-card"><div><p className="summary-label">전체 정산 수</p><p className="summary-value"><strong>{items.length}</strong><span>건</span></p></div><p className="summary-foot">전체 정산 내역</p></article>
        <article className="summary-card"><div><p className="summary-label">받을 금액</p><p className="summary-value"><strong>{money(summary.receivableAmount)}</strong><span>원</span></p></div><span className="summary-arrow">↙</span><p className="summary-foot"><span>{summary.receivableCount ?? 0}건</span> 받아야하는 정산</p></article>
        <article className="summary-card"><div><p className="summary-label">보낼 금액</p><p className="summary-value"><strong>{money(summary.payableAmount)}</strong><span>원</span></p></div><span className="summary-arrow positive">↗</span><p className="summary-foot"><span>{summary.payableCount ?? 0}건</span> 보내야하는 정산</p></article>
      </section>

      <section className="filter-panel">
        <label className="search-box"><span>⌕</span><input type="search" placeholder="정산명 검색" value={keyword} onChange={e=>setKeyword(e.target.value)} /></label>
        <label className="filter-field"><span>정산 유형</span><select value={type} onChange={e=>setType(e.target.value)}><option value="ALL">전체</option><option value="SHARED">공동정산</option><option value="RECURRING">정기정산</option></select></label>
        <label className="filter-field"><span>진행 상태</span><select value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">전체</option><option value="IN_PROGRESS">진행 중</option><option value="CLOSED">완료</option></select></label>
        <label className="filter-field"><span>정렬</span><select value={sort} onChange={e=>setSort(e.target.value)}><option value="LATEST">최신순</option><option value="AMOUNT_DESC">금액순</option><option value="DEADLINE">마감일순</option></select></label>
      </section>

      <section className="table-card" aria-label="정산 목록">
        <div className="settlement-table settlement-table-head"><span>정산명</span><span>정산 유형</span><span>역할</span><span>구분</span><span>분배 방식</span><span>상태</span><span>일정</span><span>상세</span></div>
        {filtered.length > 0 ? <div className="settlement-list">{filtered.map(s => <article key={s.settlementId} className="settlement-table settlement-row">
          <div className="settlement-name"><span>{s.title || '이름 없는 정산'}</span></div>
          <span className={`type-badge ${s.settlementType === 'RECURRING' ? 'badge-recurring' : 'badge-role'}`}>{s.settlementType === 'RECURRING' ? '정기' : '공동'}</span>
          <span className={`status-badge ${s.role === 'OWNER' ? 'badge-role' : 'badge-debtor'}`}>{s.role === 'OWNER' ? '정산자' : '참여자'}</span>
          <span>{s.settlementCategory || '-'}</span>
          <span className={`split-badge ${s.splitType === 'CUSTOM' ? 'badge-custom' : 'badge-split'}`}>{s.splitType === 'CUSTOM' ? '직접 설정' : '균등'}</span>
          <span className={`status-badge ${s.settlementStatus === 'CLOSED' ? 'badge-completed' : 'badge-progress'}`}>{s.settlementStatus === 'CLOSED' ? '완료' : '진행 중'}</span>
          <span>{s.settlementType === 'RECURRING' ? period(s.startDate, s.endDate) : date(s.dueDate)}</span>
          <Link className="detail-link" to={`/settlements/${s.settlementId}`} aria-label={`${s.title || '정산'} 상세 조회`}>›</Link>
        </article>)}</div> : <div className="empty-state"><div className="empty-icon">₩</div><h2>아직 생성된 정산이 없습니다.</h2><p>공동정산이나 정기정산을 생성하면 이 화면에서 조회할 수 있습니다.</p><Link className="button button-primary" to="/settlements/new">첫 정산 만들기</Link></div>}
      </section>
    </main>
    {(toast || createdNotice) && <div className={`toast visible${toast?.error ? ' error' : ''}`} role="status">{toast?.text || `정산 #${createdNotice}이 생성되었습니다.`}</div>}
    {reviewOpen && <MatchingReviewModal key="settlement-list-review" open onClose={(changed) => { setReviewOpen(false); if (changed) void load(); }} options={{ reviewChannel:'TRANSACTION_HISTORY', targetType:'SETTLEMENT' }} />}
  </>;
}
