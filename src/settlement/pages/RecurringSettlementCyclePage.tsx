import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import MatchingReviewModal from '../components/MatchingReviewModal';
import LoadingSkeleton from '../../common/components/LoadingSkeleton';
import { formatTransactionSyncTime, getLastTransactionSyncAt, recordTransactionSync } from '../../transaction/syncTimestamp';
import { settlementApi } from '../api/settlementApi';
import type {
  PaymentObligation,
  RecurringSettlementCycle,
  RecurringSettlementCycleList,
  SettlementAccount,
  SettlementDetail,
  SettlementPaymentStatus,
} from '../types/settlement';
import '../styles/settlement-common.css';
import '../styles/settlement-detail.css';
import '../styles/settlement-recurring-cycle.css';

const money = (v?: number) => Number(v ?? 0).toLocaleString('ko-KR');
const date = (v?: string | null) => v ? String(v).split('T')[0] : '-';
const dt = (v?: string | null) => {
  if (!v) return '-';
  const value = new Date(v);
  if (Number.isNaN(value.getTime())) return '-';
  const dateLabel = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  const timeLabel = new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(value);
  return `${dateLabel} ${timeLabel}`;
};
const rate = (v?: number) => Math.max(0, Math.min(100, Number(v ?? 0)));
const roleText = (v?: string) => ({ OWNER: '생성자', MEMBER: '참여자' } as Record<string, string>)[v || ''] || '-';
const splitText = (v?: string) => ({ EQUAL: '균등', CUSTOM: '직접 설정' } as Record<string, string>)[v || ''] || '-';
const cycleRuleText = (v?: string) => ({ DAILY: '매일', WEEKLY: '매주', MONTHLY: '매월', YEARLY: '매년' } as Record<string, string>)[v || ''] || '-';
const paymentText = (o: PaymentObligation) =>
  o.obligationStatus === 'WRITTEN_OFF' ? '상각 처리'
    : o.overdueSince && o.paymentStatus !== 'PAID' ? '연체'
      : ({ PAID: '입금 완료', PARTIALLY_PAID: '일부 입금', UNPAID: '미입금' } as Record<string, string>)[o.paymentStatus] || '-';

const cycleStatusText = (c: RecurringSettlementCycle) =>
  c.settlementStatus === 'CLOSED' ? '정산 완료' : '정산 중';
const cycleStatusClass = (c: RecurringSettlementCycle) =>
  c.settlementStatus === 'CLOSED' ? 'status-paid' : 'status-partial';

interface LatestCycleData {
  detail: SettlementDetail | null;
  status: SettlementPaymentStatus;
  account: SettlementAccount | null;
  // 부가 정보 조회 실패는 사이드 패널에만 표시하고 회차 표는 그대로 보여준다
  requestInfoFailed: boolean;
  statusFailed: boolean;
}

const emptyLatest: LatestCycleData = { detail: null, status: {}, account: null, requestInfoFailed: false, statusFailed: false };
const SIDE_PANEL_ERROR = '정보를 불러오지 못했습니다.';

// 정산 요청 정보·참여자 현황은 회차마다 다르므로 최신 회차 기준으로 보여준다
async function fetchCyclePageData(recurringSettlementId: number) {
  const cycleList = await settlementApi.recurringCycles(recurringSettlementId);
  const latestCycle = cycleList.cycles?.[0];

  if (!latestCycle) {
    return { cycleList, latest: emptyLatest };
  }

  const [detailResult, statusResult, accountResult] = await Promise.allSettled([
    settlementApi.detail(latestCycle.settlementId),
    settlementApi.paymentStatus(latestCycle.settlementId),
    settlementApi.account(latestCycle.settlementId),
  ]);
  const statusFailed = statusResult.status === 'rejected';

  return {
    cycleList,
    latest: {
      detail: detailResult.status === 'fulfilled' ? detailResult.value : null,
      status: statusResult.status === 'fulfilled' ? statusResult.value : {},
      account: accountResult.status === 'fulfilled' ? accountResult.value : null,
      requestInfoFailed: detailResult.status === 'rejected' || accountResult.status === 'rejected' || statusFailed,
      statusFailed,
    },
  };
}

export default function RecurringSettlementCyclePage() {
  const { recurringSettlementId } = useParams();
  const id = Number(recurringSettlementId);
  const [data, setData] = useState<RecurringSettlementCycleList | null>(null);
  const [latest, setLatest] = useState<LatestCycleData>(emptyLatest);
  const [loadedId, setLoadedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncTime, setSyncTime] = useState(() => formatTransactionSyncTime(getLastTransactionSyncAt()));
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const showToast = (text: string, isError = false) => {
    setToast({ text, error: isError });
    window.setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    try {
      const result = await fetchCyclePageData(id);
      setData(result.cycleList);
      setLatest(result.latest);
      setError(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '정기정산 회차 현황을 불러오지 못했습니다.', true);
    }
  }, [id]);

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    let cancelled = false;
    fetchCyclePageData(id)
      .then((result) => {
        if (cancelled) return;
        setData(result.cycleList);
        setLatest(result.latest);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '정기정산 회차 현황을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoadedId(id);
      });
    return () => { cancelled = true; };
  }, [id]);

  async function sync() {
    try {
      setBusy(true);
      const result = await settlementApi.syncAll();
      setSyncTime(formatTransactionSyncTime(recordTransactionSync()));
      showToast(`동기화 완료: 자동반영 ${result.appliedCount ?? 0}건, 확인필요 ${result.needsCheckCount ?? 0}건, 미매칭 ${result.unmatchedCount ?? 0}건`);
      await load();
      setReviewOpen(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '거래내역 동기화에 실패했습니다.', true);
    } finally {
      setBusy(false);
    }
  }

  if (!Number.isFinite(id)) {
    return <main className="page-shell settlement-detail-page"><div className="empty-state">정기정산 ID를 확인할 수 없습니다.</div></main>;
  }
  if (loadedId !== id) {
    return <main className="page-shell settlement-detail-page"><LoadingSkeleton className="loading-skeleton--page" rows={8} /></main>;
  }
  if (error || !data) {
    return <main className="page-shell settlement-detail-page"><div className="empty-state" role="alert">{error || '정기정산 회차 현황을 불러오지 못했습니다.'}</div></main>;
  }

  const cycles = data.cycles || [];
  const latestCycle = cycles[0];
  const inProgressCount = cycles.filter((c) => c.settlementStatus === 'IN_PROGRESS').length;
  const totalExpected = cycles.reduce((sum, c) => sum + Number(c.totalExpectedAmount ?? 0), 0);
  const totalPaid = cycles.reduce((sum, c) => sum + Number(c.totalPaidAmount ?? 0), 0);
  const totalRemaining = cycles.reduce((sum, c) => sum + Number(c.totalRemainingAmount ?? 0), 0);
  const overallProgress = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;

  const obligations = latest.status.obligations || [];
  const paidCount = obligations.filter((o) => o.paymentStatus === 'PAID').length;
  const attentionCount = obligations.filter((o) => o.obligationStatus === 'WRITTEN_OFF' || (o.overdueSince && o.paymentStatus !== 'PAID')).length;
  const participantProgress = obligations.length ? Math.round((paidCount / obligations.length) * 100) : 0;
  const latestLabel = latestCycle ? `${latestCycle.cycleNo}회차 기준` : '';

  return <>
    <main className="page-shell settlement-detail-page recurring-cycle-page">
      <section className="detail-heading">
        <div>
          <div className="heading-badges">
            <span className="badge badge-recurring">정기정산</span>
            <span className="badge badge-role">{roleText(data.role)}</span>
          </div>
          <h1>{data.title || '정기정산'}</h1>
        </div>
        <div className="heading-actions">
          <Link className="button button-secondary" to="/settlements">목록으로</Link>
          <button className="button button-secondary settlement-sync-button" type="button" onClick={() => void sync()} disabled={busy}>
            {busy && <span className="button-spinner" aria-hidden="true" />}↻ 거래내역 동기화
          </button>
        </div>
      </section>

      <section className="summary-card">
        <div className="summary-item"><span>누적 회차</span><strong>{cycles.length}회 <small className="cycle-sub">진행 중 {inProgressCount}회</small></strong></div>
        <div className="summary-item"><span>누적 입금 금액</span><strong className="text-success">{money(totalPaid)}원</strong></div>
        <div className="summary-item"><span>누적 미정산 금액</span><strong>{money(totalRemaining)}원</strong></div>
        <div className="summary-progress">
          <div className="progress-meta"><span>누적 입금률</span><strong>{overallProgress}%</strong></div>
          <div className="progress-track"><div className="progress-bar" style={{ width: `${overallProgress}%` }} /></div>
          <div className="progress-count"><strong>{money(totalPaid)}</strong>/<span>{money(totalExpected)}원</span></div>
        </div>
      </section>

      <section className="meta-card">
        <div className="meta-item"><span>정산 주기</span><strong>{cycleRuleText(data.cycleRule)}</strong></div>
        <div className="meta-divider" />
        <div className="meta-item"><span>시작일</span><strong>{date(data.startDate)}</strong></div>
        <div className="meta-divider" />
        <div className="meta-item"><span>종료일</span><strong>{data.endDate ? date(data.endDate) : '종료일 없음'}</strong></div>
        <div className="meta-divider" />
        <div className="meta-item meta-grow"><span>정산 목적</span><strong>{data.settlementCategory || '-'}</strong></div>
        <div className="meta-divider" />
        <div className="meta-item"><span>회차별 금액</span><strong>{money(data.totalAmount)}원</strong></div>
      </section>

      <div className="detail-grid">
        <aside className="side-column">
          <section className="panel">
            <div className="panel-header"><h2>정산 요청 정보</h2><span className="panel-side-text">{latestLabel}</span></div>
            {latest.requestInfoFailed ? <div className="empty-state" role="alert">{SIDE_PANEL_ERROR}</div> : <>
            <div className="account-card">
              <div className="account-icon">₩</div>
              <div>
                <span>{latest.account?.bankName || '수취 계좌'}</span>
                <strong>{latest.account?.maskedAccountNumber || '계좌 정보 없음'}</strong>
                <small>{latest.account?.accountHolderName || '-'}</small>
              </div>
            </div>
            <dl className="info-list">
              <div><dt>분배 방식</dt><dd>{splitText(latest.detail?.splitType)}</dd></div>
              <div><dt>회차 생성일</dt><dd>{dt(latest.detail?.createdAt)}</dd></div>
              <div><dt>최근 동기화</dt><dd>{syncTime}</dd></div>
              <div><dt>확인 필요</dt><dd className="text-danger">{attentionCount}명</dd></div>
            </dl>
            </>}
          </section>

          <section className="panel">
            <div className="panel-header"><h2>참여자 정산 현황</h2>{!latest.statusFailed && <span className="panel-side-text">{participantProgress}%</span>}</div>
            {latest.statusFailed ? <div className="empty-state" role="alert">{SIDE_PANEL_ERROR}</div> : <div className="participant-avatar-list">
              {obligations.length ? obligations.slice(0, 6).map((o) => (
                <div key={o.paymentObligationId || o.participantId} className="participant-avatar">
                  <div className="avatar-circle" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg></div>
                  <strong>{o.participantName || `참여자 #${o.participantId}`}</strong>
                  <small>{paymentText(o)}</small>
                </div>
              )) : <div className="participant-avatar"><small>참여자가 없습니다.</small></div>}
            </div>}
          </section>
        </aside>

        <section className="panel participant-panel">
          <div className="panel-header participant-panel-header">
            <div>
              <h2>회차별 정산 현황</h2>
              <p>{data.role === 'OWNER' ? '진행 중인 회차와 완료된 회차를 최신 회차부터 보여줍니다.' : '내가 참여한 회차만 최신 회차부터 보여줍니다.'}</p>
            </div>
          </div>
          <div className="table-scroll">
            <table className="payment-table">
              <thead>
                <tr><th>회차</th><th>정산일</th><th>정산 금액</th><th>입금 금액</th><th>잔여 금액</th><th>입금률</th><th>입금 인원</th><th>정산 상태</th></tr>
              </thead>
              <tbody>
                {cycles.map((c) => (
                  <tr key={c.settlementId} className={c.settlementStatus === 'IN_PROGRESS' ? 'cycle-row-active' : undefined}>
                    <td className="name-cell">{c.cycleNo}회차</td>
                    <td>{date(c.cycleDate)}</td>
                    <td>{money(c.totalExpectedAmount)}원</td>
                    <td>{money(c.totalPaidAmount)}원</td>
                    <td>{money(c.totalRemainingAmount)}원</td>
                    <td>
                      <div className="cycle-progress">
                        <div className="progress-track"><div className="progress-bar" style={{ width: `${rate(c.progressRate)}%` }} /></div>
                        <span>{rate(c.progressRate)}%</span>
                      </div>
                    </td>
                    <td>{c.paidCount ?? 0}/{(c.paidCount ?? 0) + (c.partiallyPaidCount ?? 0) + (c.unpaidCount ?? 0)}명</td>
                    <td><span className={`status-chip ${cycleStatusClass(c)}`}>● {cycleStatusText(c)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cycles.length === 0 && <div className="empty-state">조회할 수 있는 회차가 없습니다.</div>}
        </section>
      </div>
    </main>
    {toast && <div className={`toast visible${toast.error ? ' error' : ''}`} role="status">{toast.text}</div>}
    {reviewOpen && <MatchingReviewModal key={`recurring-settlement-review-${id}`} open onClose={(changed) => { setReviewOpen(false); if (changed) void load(); }} options={{ reviewChannel: 'TRANSACTION_HISTORY', targetType: 'SETTLEMENT' }} />}
  </>;
}
