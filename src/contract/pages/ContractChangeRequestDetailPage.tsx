import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../shared.css';
import '../styles/ContractChangeRequestDetailPage.css';
import { getChangeRequestDetail, rejectChangeRequest } from '../api/contractChangeApi';
import type { ChangeRequestDetail } from '../types/contractChange';

function formatCurrency(amount: number): string {
  return '₩' + Number(amount).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatExtendedMonths(months: number): string {
  if (months > 0) return `${months}개월 연장`;
  if (months < 0) return `${Math.abs(months)}개월 단축`;
  return '변경 없음';
}

function formatDateTimeKorean(dateString: string): string {
  const dated = new Date(dateString);
  if (Number.isNaN(dated.getTime())) return '-';
  return `${dated.getFullYear()}년 ${dated.getMonth() + 1}월 ${dated.getDate()}일 ${dated.getHours()}시 ${dated.getMinutes()}분 ${dated.getSeconds()}초`;
}

function statusTone(status: string): 'pending' | 'approved' | 'rejected' | 'cancelled' | 'default' {
  if (status.includes('대기')) return 'pending';
  if (status.includes('승인')) return 'approved';
  if (status.includes('거절')) return 'rejected';
  if (status.includes('취소')) return 'cancelled';
  return 'default';
}

interface SummaryItem {
  label: string;
  from: string;
  to: string;
}

export default function ContractChangeRequestDetailPage() {
  const navigate = useNavigate();
  const { contractId, changeRequestId } = useParams<{ contractId: string; changeRequestId: string }>();

  const [detail, setDetail] = useState<ChangeRequestDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [returnReasonInput, setReturnReasonInput] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    if (!contractId || !changeRequestId) return;

    let cancelled = false;

    getChangeRequestDetail(Number(contractId), Number(changeRequestId))
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError('변경 요청 정보를 불러오는 중 오류가 발생했습니다.');
      });

    return () => {
      cancelled = true;
    };
  }, [contractId, changeRequestId]);

  const isRejectedView = Boolean(detail?.returnReason);

  function handleApproveClick() {
    if (!contractId) return;

    if (isRejectedView) {
      navigate(`/contracts/${contractId}/change-request`);
      return;
    }

    if (!detail?.newContractId) {
      window.alert('변경된 계약 정보를 아직 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    navigate(`/contracts/${detail.newContractId}/change-approval`);
  }

  function handleRejectClick() {
    if (!contractId) return;

    if (isRejectedView) {
      navigate(`/contracts/${contractId}/contract-detail`);
      return;
    }

    setRejectModalOpen(true);
  }

  function handleRejectCancel() {
    setRejectModalOpen(false);
    setReturnReasonInput('');
    setRejectError(null);
  }

  async function handleRejectConfirm() {
    if (!contractId || !changeRequestId) return;

    const returnReason = returnReasonInput.trim();
    if (!returnReason) {
      setRejectError('반려 사유를 입력해주세요.');
      return;
    }

    setIsRejecting(true);
    setRejectError(null);

    try {
      await rejectChangeRequest(Number(contractId), Number(changeRequestId), returnReason);
      window.alert('변경 요청을 반려했습니다.');
      navigate('/contracts/dashboard');
    } catch {
      setRejectError('반려 처리에 실패했습니다. 다시 시도해주세요.');
      setIsRejecting(false);
    }
  }

  if (loadError) {
    return (
      <div className="page crd">
        <p className="doc__status is-error">{loadError}</p>
      </div>
    );
  }

  const tone = detail ? statusTone(detail.status) : 'default';
  const maturityChanged = detail ? detail.currentMaturityDate !== detail.newMaturityDate : false;
  const interestChanged = detail ? detail.currentInterestRate !== detail.newInterestRate : false;
  const paymentChanged = detail ? detail.currentMonthlyPayment !== detail.newMonthlyPayment : false;
  const repaymentTypeChanged = detail ? detail.currentRepaymentType !== detail.newRepaymentType : false;
  const termsChanged = detail ? (detail.currentTerms || '') !== (detail.newTerms || '') : false;

  const summaryItems: SummaryItem[] = detail
    ? ([
        maturityChanged && { label: '만기일', from: detail.currentMaturityDate, to: detail.newMaturityDate },
        interestChanged && {
          label: '연 이율',
          from: `${detail.currentInterestRate}%`,
          to: `${detail.newInterestRate}%`,
        },
        repaymentTypeChanged && {
          label: '상환 방식',
          from: detail.currentRepaymentType,
          to: detail.newRepaymentType,
        },
        termsChanged && {
          label: '특약사항',
          from: detail.currentTerms || '없음',
          to: detail.newTerms || '없음',
        },
      ].filter(Boolean) as SummaryItem[])
    : [];

  const paymentDelta = detail ? detail.newMonthlyPayment - detail.currentMonthlyPayment : 0;
  const paymentDeltaTone = paymentDelta > 0 ? 'up' : paymentDelta < 0 ? 'down' : 'flat';

  return (
    <div className="page crd">
      <div className="banner">
        <p className="banner-title">
          <span className="banner-icon" aria-hidden="true">📝</span>
          {isRejectedView
            ? `${detail?.rejectorName ?? '-'}님이 조건 변경을 반려했습니다.`
            : <><span>{detail?.requesterName ?? '-'}</span>님이 계약 조건 변경을 요청했습니다.</>}
        </p>
        <div className="banner-sub">
          요청일자: {detail ? formatDateTimeKorean(detail.requestedAt) : '-'}
          {detail && <span className={`status-badge is-${tone}`}>{detail.status}</span>}
        </div>
        {detail?.returnReason && (
          <div className="banner-return-reason">반려 사유: {detail.returnReason}</div>
        )}
      </div>

      <div className="content">
        <div className="detail-card">
          <h2>변경 사항 상세</h2>

          <div className="row">
            <span className="label">항목</span>
            <span className="label">현재 조건</span>
            <span className="label">변경 요청 조건</span>
          </div>

          <div className="row">
            <span>만기일</span>
            <span>{detail?.currentMaturityDate ?? '-'}</span>
            <span className={maturityChanged ? 'value-changed' : undefined}>{detail?.newMaturityDate ?? '-'}</span>
          </div>

          <div className="row">
            <span>연 이율</span>
            <span>{detail ? `${detail.currentInterestRate}%` : '-'}</span>
            <span className={interestChanged ? 'value-changed' : undefined}>
              {detail ? `${detail.newInterestRate}%` : '-'}
            </span>
          </div>

          <div className="row">
            <span>예상 월 상환액</span>
            <span>{detail ? formatCurrency(detail.currentMonthlyPayment) : '-'}</span>
            <span className={paymentChanged ? 'value-changed' : undefined}>
              {detail ? formatCurrency(detail.newMonthlyPayment) : '-'}
            </span>
          </div>

          <div className="row">
            <span>상환 방식</span>
            <span>{detail?.currentRepaymentType ?? '-'}</span>
            <span className={repaymentTypeChanged ? 'value-changed' : undefined}>
              {detail?.newRepaymentType ?? '-'}
            </span>
          </div>

          <div className="row">
            <span>특약사항</span>
            <span>{detail?.currentTerms || '-'}</span>
            <span className={termsChanged ? 'value-changed' : undefined}>{detail?.newTerms || '-'}</span>
          </div>

          <p className="disclaimer">
            * 본 화면에 표시된 예상 월 상환액은 참고용 안내이며,
            실제 상환 금액은 변경 승인 및 정산 시점에 별도로 산정될 예정입니다.
          </p>
        </div>

        <div className="side">
          <div className="reason-card">
            <h3>💬 변경 요청 사유</h3>
            <p className="change-reason-text">{detail?.changeReason ?? '-'}</p>
            {detail?.returnReason && (
              <p className="return-reason">
                <strong>반려사유</strong> · {detail.returnReason}
              </p>
            )}
          </div>

          <div className="reason-card summary-card">
            <h3>🔍 변경 요약</h3>
            {summaryItems.length > 0 ? (
              <ul>
                {summaryItems.map((item) => (
                  <li key={item.label}>
                    <span className="summary-label">{item.label}</span>
                    <span>{item.from}</span>
                    <span className="summary-arrow">→</span>
                    <span className="value-changed">{item.to}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="summary-empty">월 상환액 외에 바뀐 항목이 없습니다.</p>
            )}
          </div>

          <div className="period-card">
            <h3>💰 월 상환액 변화</h3>
            {detail && (
              <>
                <p className={`payment-delta is-${paymentDeltaTone}`}>
                  {paymentDeltaTone === 'up' && `▲ +${formatCurrency(paymentDelta)}`}
                  {paymentDeltaTone === 'down' && `▼ -${formatCurrency(Math.abs(paymentDelta))}`}
                  {paymentDeltaTone === 'flat' && '변동 없음'}
                </p>
                <p className="payment-delta-sub">
                  {formatCurrency(detail.currentMonthlyPayment)} → {formatCurrency(detail.newMonthlyPayment)}
                </p>
              </>
            )}
          </div>

          <div className="period-card">
            <h3>📅 총 상환 기간 변화</h3>
            <p>{detail ? formatExtendedMonths(detail.extendedMonths) : '-'}</p>
          </div>
        </div>
      </div>

      <div className="action-group">
        <button type="button" className="btn-approve" onClick={handleApproveClick}>
          {isRejectedView ? '수정하기' : '변경 승인'}
        </button>
        <button type="button" className="btn-reject" onClick={handleRejectClick}>
          {isRejectedView ? '취소' : '변경 반려'}
        </button>
      </div>

      {rejectModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>변경 요청 반려</h3>
            <p className="modal-sub">반려 사유를 입력해주세요.</p>
            <textarea
              className="modal-textarea"
              rows={4}
              placeholder="반려 사유를 입력하세요"
              value={returnReasonInput}
              onChange={(event) => setReturnReasonInput(event.target.value)}
              disabled={isRejecting}
            />
            {rejectError && <p className="modal-error">{rejectError}</p>}
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={handleRejectCancel} disabled={isRejecting}>
                취소
              </button>
              <button type="button" className="btn-reject-confirm" onClick={handleRejectConfirm} disabled={isRejecting}>
                {isRejecting ? '처리 중...' : '반려 확정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}