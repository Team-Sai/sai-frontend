import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { settlementApi } from '../api/settlementApi';
import { buildSettlementGroups } from '../utils/settlementList';
import MatchingReviewModal from '../components/MatchingReviewModal';
import LoadingSkeleton from '../../common/components/LoadingSkeleton';
import { formatTransactionSyncTime, getLastTransactionSyncAt, recordTransactionSync } from '../../transaction/syncTimestamp';
import type { SettlementListItem, SettlementSummary } from '../types/settlement';
import '../styles/settlement-common.css';
import '../styles/settlement-list.css';

const money = (v?: number) => Number(v ?? 0).toLocaleString('ko-KR');
const date = (v?: string | null) => v ? v.split('T')[0] : '-';
const period = (s?: string | null, e?: string | null) => !s ? '-' : `${date(s)} ~ ${e ? date(e) : '계속'}`;

function fetchSettlementListData(){
  return Promise.allSettled([settlementApi.list(),settlementApi.summary()]);
}

interface RecurringGroupToggle {
  id: number;
  open: boolean;
  count: number;
  totalCount: number;
  onToggle: () => void;
}

function SettlementRow({ s, group }: {
  s: SettlementListItem;
  group?: RecurringGroupToggle;
}) {
  const title = `${s.title || '이름 없는 정산'}${!group && s.settlementType === 'RECURRING' && s.cycleNo != null ? ` (${s.cycleNo}회차)` : ''}`;
  return <article className={`settlement-table settlement-row${group ? " settlement-group-heading" : ""}`}>
          <div className="settlement-name">{group ? <button type="button" className="settlement-group-toggle" aria-expanded={group.open} aria-controls={`recurring-cycles-${group.id}`} onClick={group.onToggle}>
            <strong>{title}</strong>
            <span className="settlement-group-count" title="필터에 맞는 회차 수 / 전체 회차 수">회차 {group.count === group.totalCount ? group.count : `${group.count}/${group.totalCount}`}개</span>
            <span className={`settlement-group-chevron${group.open ? " is-open" : ""}`} aria-hidden="true">›</span>
          </button> : <span>{title}</span>}</div>
          <span className={`type-badge ${s.settlementType === 'RECURRING' ? 'badge-recurring' : 'badge-role'}`}>{s.settlementType === 'RECURRING' ? '정기' : '공동'}</span>
          <span className={`status-badge ${s.role === 'OWNER' ? 'badge-role' : 'badge-debtor'}`}>{s.role === 'OWNER' ? '생성자' : '참여자'}</span>
          <span className="settlement-category">{s.settlementCategory || '-'}</span>
          <span className={`split-badge ${s.splitType === 'CUSTOM' ? 'badge-custom' : 'badge-split'}`}>{s.splitType === 'CUSTOM' ? '직접 설정' : '균등'}</span>
          <span title={group ? '전체 회차 중 최신 회차 기준' : undefined} className={`settlement-status status-badge ${s.settlementStatus === 'CLOSED' ? 'badge-completed' : 'badge-progress'}`}>{s.settlementStatus === 'CLOSED' ? '완료' : '진행 중'}</span>
          <span>{s.settlementType === 'RECURRING' ? period(s.startDate, s.endDate) : date(s.dueDate)}</span>
          {group ? <Link className="button button-secondary settlement-cycle-button" to={`/settlements/recurring/${group.id}`}>회차별 현황</Link>
            : <Link className="detail-link" to={`/settlements/${s.settlementId}`} aria-label={`${title} 상세 조회`}>›</Link>}
        </article>;
}

function SettlementCycleItem({ item }: { item: SettlementListItem }) {
  const cycle = item.cycleNo != null ? `${item.cycleNo}회차` : '회차 상세';
  return <Link className="settlement-cycle-item" to={`/settlements/${item.settlementId}`} aria-label={`${item.title || '정기정산'} (${cycle}) 상세 조회`}>
    <span className="settlement-cycle-label">{item.title || '정기정산'} ({cycle})</span>
    <span className="settlement-cycle-action" aria-hidden="true">›</span>
  </Link>;
}

export default function SettlementListPage() {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [items, setItems] = useState<SettlementListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listLoadError, setListLoadError] = useState(false);
  const [summary, setSummary] = useState<SettlementSummary>({});
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [sort, setSort] = useState('LATEST');
  const [syncing, setSyncing] = useState(false);
  const [syncTime, setSyncTime] = useState(() => formatTransactionSyncTime(getLastTransactionSyncAt()));
  const [toast, setToast] = useState<{text:string; error?:boolean}|null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const showToast = (text: string, error = false) => {
    setToast({ text, error });
    window.setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    const [listResult, summaryResult] = await fetchSettlementListData();
    if (listResult.status === 'fulfilled') {
      setItems(listResult.value);
      setListLoadError(false);
    } else { setItems([]); setListLoadError(true); showToast('정산 목록을 불러오지 못했습니다.', true); }
    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value);
    else { setSummary({}); showToast('정산 요약을 불러오지 못했습니다.', true); }
  }, []);

  useEffect(() => {
    let cancelled=false;
    fetchSettlementListData().then(([listResult,summaryResult])=>{
      if(cancelled)return;
      if(listResult.status==='fulfilled'){setItems(listResult.value);setListLoadError(false)}
      else{setItems([]);setListLoadError(true);showToast('정산 목록을 불러오지 못했습니다.',true)}
      if(summaryResult.status==='fulfilled')setSummary(summaryResult.value);
      else{setSummary({});showToast('정산 요약을 불러오지 못했습니다.',true)}
    }).finally(()=>{if(!cancelled)setIsLoading(false)});
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

  const groups = useMemo(() => buildSettlementGroups(items, { keyword, type, status, sort }),
    [items, keyword, type, status, sort]);

  function toggleGroup(id: number) {
    setExpanded(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function sync() {
    try {
      setSyncing(true);
      const result = await settlementApi.syncAll();
      showToast(`동기화 완료: 자동반영 ${result.appliedCount ?? 0}건, 확인필요 ${result.needsCheckCount ?? 0}건, 미매칭 ${result.unmatchedCount ?? 0}건`);
      await load();
      setSyncTime(formatTransactionSyncTime(recordTransactionSync()));
      setReviewOpen(true);
    } catch (e) { showToast(e instanceof Error ? e.message : '거래내역 동기화에 실패했습니다.', true); }
    finally { setSyncing(false); }
  }

  return <>
    <main className="page-shell settlement-list-page">
      <section className="page-heading unified-page-header">
        <div><h1 className="unified-page-title">정산 관리</h1></div>
        <div className="heading-actions">
          <p className="updated-text">최근 동기화 <span>{syncTime}</span></p>
          <button className="button button-secondary settlement-sync-button" type="button" onClick={sync} disabled={syncing}>{syncing && <span className="button-spinner" aria-hidden="true" />}↻ 거래내역 동기화</button>
          <Link className="button button-primary" to="/settlements/new">새 정산 등록</Link>
        </div>
      </section>

      <section className="summary-grid" aria-label="정산 요약">
        <article className="summary-card"><div><p className="summary-label">전체 정산 건수</p><p className="summary-value"><strong>{items.length}</strong><span>건</span></p></div><p className="summary-foot">전체 정산 내역</p></article>
        <article className="summary-card"><div><p className="summary-label">받을 정산금</p><p className="summary-value"><strong>{money(summary.receivableAmount)}</strong><span>원</span></p></div><span className="summary-arrow">↙</span><p className="summary-foot"><span>{summary.receivableCount ?? 0}건</span> 수령 예정 정산</p></article>
        <article className="summary-card"><div><p className="summary-label">지급 예정 정산금</p><p className="summary-value"><strong>{money(summary.payableAmount)}</strong><span>원</span></p></div><span className="summary-arrow positive">↗</span><p className="summary-foot"><span>{summary.payableCount ?? 0}건</span> 지급 예정 정산</p></article>
      </section>

      <section className="filter-panel">
        <label className="search-box"><span>⌕</span><input type="search" placeholder="정산명 검색" value={keyword} onChange={e=>setKeyword(e.target.value)} /></label>
        <label className="filter-field"><span>정산 유형</span><select value={type} onChange={e=>setType(e.target.value)}><option value="ALL">전체</option><option value="SHARED">공동정산</option><option value="RECURRING">정기정산</option></select></label>
        <label className="filter-field"><span>진행 상태</span><select value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">전체</option><option value="IN_PROGRESS">진행 중</option><option value="CLOSED">완료</option></select></label>
        <label className="filter-field"><span>정렬</span><select value={sort} onChange={e=>setSort(e.target.value)}><option value="LATEST">최신순</option><option value="AMOUNT_DESC">금액순</option><option value="DEADLINE">마감일순</option></select></label>
      </section>

      <section className="table-card" aria-label="정산 목록">
        <div className="settlement-table settlement-table-head"><span>정산명</span><span>정산 방식</span><span>참여 구분</span><span>정산 항목</span><span>분담 방식</span><span>정산 상태</span><span>정산 기간·기한</span><span>상세</span></div>
        {isLoading ? <LoadingSkeleton className="loading-skeleton--page" rows={6} /> : listLoadError ? <div className="empty-state" role="alert"><h2>정산 목록을 불러오지 못했습니다.</h2><button className="button button-secondary" type="button" onClick={()=>void load()}>다시 시도</button></div> : groups.length > 0 ? <div className="settlement-list">{groups.map(group => {
          const id = group.recurringId;
          if (id == null) return <SettlementRow key={group.key} s={group.latest} />;
          const open = expanded.has(id);
          const latest = group.latest;
          return <section key={group.key} className={`settlement-recurring-group${open ? " is-expanded" : ""}`} aria-label={latest.title || '정기정산'}>
            <SettlementRow s={latest} group={{ id, open, count: group.items.length, totalCount: group.totalCount, onToggle: () => toggleGroup(id) }} />
            <div className="settlement-cycle-panel" id={`recurring-cycles-${id}`} hidden={!open}>
              <div className="settlement-cycle-grid">{group.items.map(item => <SettlementCycleItem key={item.settlementId} item={item} />)}</div>
            </div>
          </section>;
        })}</div> : <div className="empty-state"><div className="empty-icon">₩</div><h2>아직 생성된 정산이 없습니다.</h2><p>공동정산이나 정기정산을 생성하면 이 화면에서 조회할 수 있습니다.</p><Link className="button button-primary" to="/settlements/new">첫 정산 만들기</Link></div>}
      </section>
    </main>
    {(toast || createdNotice) && <div className={`toast visible${toast?.error ? ' error' : ''}`} role="status">{toast?.text || `정산 #${createdNotice}이 생성되었습니다.`}</div>}
    {reviewOpen && <MatchingReviewModal key="settlement-list-review" open onClose={(changed) => { setReviewOpen(false); if (changed) void load(); }} options={{ reviewChannel:'TRANSACTION_HISTORY', targetType:'SETTLEMENT' }} />}
  </>;
}
