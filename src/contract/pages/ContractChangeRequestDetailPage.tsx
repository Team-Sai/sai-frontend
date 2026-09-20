import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../shared.css";
import "../styles/ContractChangeRequestDetailPage.css";
import {
  getChangeRequestDetail,
  rejectChangeRequest,
} from "../api/contractChangeApi";
import type { ChangeRequestDetail } from "../types/contractChange";

function formatCurrency(amount: number): string {
  return "₩" + Math.round(amount).toLocaleString("ko-KR");
}

function formatExtendedMonths(months: number): string {
  if (months > 0) return `${months}개월 연장`;
  if (months < 0) return `${Math.abs(months)}개월 단축`;
  return "변경 없음";
}

function formatDateTimeKorean(dateString: string): string {
  const dated = new Date(dateString);
  if (Number.isNaN(dated.getTime())) return dateString;
  const year = dated.getFullYear();
  const month = dated.getMonth() + 1;
  const date = dated.getDate();
  const hours = dated.getHours();
  const minutes = dated.getMinutes();
  return `${year}년 ${month}월 ${date}일 ${hours}시 ${minutes}분`;
}

export default function ContractChangeRequestDetailPage() {
  const { contractId, changeRequestId } = useParams();

  if (!contractId || !changeRequestId) {
    return (
      <div className="contract-scope contract-scope--change-detail">
        잘못된 접근입니다.
      </div>
    );
  }

  return (
    <ContractChangeRequestDetailContent
      key={`${contractId}-${changeRequestId}`}
      contractId={contractId}
      changeRequestId={changeRequestId}
    />
  );
}

function ContractChangeRequestDetailContent({
  contractId,
  changeRequestId,
}: {
  contractId: string;
  changeRequestId: string;
}) {
  const navigate = useNavigate();

  const [detail, setDetail] = useState<ChangeRequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [returnReasonInput, setReturnReasonInput] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getChangeRequestDetail(Number(contractId), Number(changeRequestId))
      .then((res) => {
        if (cancelled) return;
        setDetail(res);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError("변경 요청 정보를 불러오는 중 오류가 발생했습니다.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [contractId, changeRequestId]);

  const isPending = detail?.status === "승인 대기 중";
  const isRejectedView = Boolean(detail?.returnReason);

  function handleApproveClick() {
    if (!detail) return;

    if (isRejectedView) {
      navigate(`/contracts/${contractId}/change-request`);
      return;
    }

    if (!isPending) return;

    if (!detail.newContractId) {
      setLoadError("변경된 계약 정보를 아직 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    navigate(`/contracts/${detail.newContractId}/change-approval`);
  }

  function handleRejectClick() {
    if (isRejectedView) {
      navigate(`/contracts/${contractId}/contract-detail`);
      return;
    }
    if (!isPending) return;
    setIsRejectModalOpen(true);
  }

  function closeRejectModal() {
    setIsRejectModalOpen(false);
    setReturnReasonInput("");
    setRejectError(null);
  }

  function handleRejectConfirm() {
    const returnReason = returnReasonInput.trim();
    if (!returnReason) {
      setRejectError("반려 사유를 입력해주세요.");
      return;
    }

    setIsRejecting(true);
    setRejectError(null);

    rejectChangeRequest(Number(contractId), Number(changeRequestId), returnReason)
      .then(() => {
        navigate("/contracts/dashboard");
      })
      .catch(() => {
        setRejectError("반려 처리에 실패했습니다. 다시 시도해주세요.");
      })
      .finally(() => {
        setIsRejecting(false);
      });
  }

  if (isLoading) {
    return (
      <div className="contract-scope contract-scope--change-detail">
        불러오는 중이에요...
      </div>
    );
  }

  if (loadError && !detail) {
    return (
      <div className="contract-scope contract-scope--change-detail">
        {loadError}
      </div>
    );
  }

  if (!detail) {
    return null;
  }

  const bannerTitle = isRejectedView
    ? `${detail.rejectorName}님이 조건 변경을 반려했습니다.`
    : (
      <>
        <span>{detail.requesterName}</span>님이 계약 조건 변경을 요청했습니다.
      </>
    );

  return (
    <div className="contract-scope contract-scope--change-detail">
      <div className="banner">
        <p className="banner-title">{bannerTitle}</p>
        <div className="banner-sub">
          요청일자: {formatDateTimeKorean(detail.requestedAt)} | 현재 상태: {detail.status}
        </div>
        {detail.returnReason && (
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
            <span>{detail.currentMaturityDate}</span>
            <span>{detail.newMaturityDate}</span>
          </div>

          <div className="row">
            <span>연 이율</span>
            <span>{detail.currentInterestRate}%</span>
            <span>{detail.newInterestRate}%</span>
          </div>

          <div className="row">
            <span>예상 월 상환액</span>
            <span>{formatCurrency(detail.currentMonthlyPayment)}</span>
            <span>{formatCurrency(detail.newMonthlyPayment)}</span>
          </div>

          <div className="row">
            <span>상환 방식</span>
            <span>{detail.currentRepaymentType}</span>
            <span>{detail.newRepaymentType}</span>
          </div>

          <div className="row">
            <span>특약사항</span>
            <span>{detail.currentTerms || "-"}</span>
            <span>{detail.newTerms || "-"}</span>
          </div>

          <p className="disclaimer">
            * 본 화면에 표시된 예상 월 상환액은 참고용 안내이며, 실제 상환 금액은 변경 승인 및 정산
            시점에 별도로 산정될 예정입니다.
          </p>
        </div>

        <div className="side">
          <div className="reason-card">
            <h3>변경 요청 사유</h3>
            <p className="change-reason-text">{detail.changeReason}</p>
            {detail.returnReason && (
              <p className="return-reason">
                <strong>반려사유</strong> · {detail.returnReason}
              </p>
            )}
          </div>

          <div className="period-card">
            <h3>총 상환 기간 변화</h3>
            <p>{formatExtendedMonths(detail.extendedMonths)}</p>
          </div>
        </div>
      </div>

      {loadError && <p className="disclaimer">{loadError}</p>}

      {isPending || isRejectedView ? (
        <div className="action-group">
          <button type="button" className="btn-approve" onClick={handleApproveClick}>
            {isRejectedView ? "수정하기" : "변경 승인"}
          </button>
          <button type="button" className="btn-reject" onClick={handleRejectClick}>
            {isRejectedView ? "취소" : "변경 반려"}
          </button>
        </div>
      ) : (
        <p className="processed-note">이미 처리된 변경 요청입니다. (현재 상태: {detail.status})</p>
      )}

      {isRejectModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>변경 요청 반려</h3>
            <p className="modal-sub">반려 사유를 입력해주세요.</p>
            <textarea
              rows={4}
              placeholder="반려 사유를 입력하세요"
              value={returnReasonInput}
              onChange={(e) => setReturnReasonInput(e.target.value)}
            />
            {rejectError && <p className="modal-error">{rejectError}</p>}
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={closeRejectModal}>
                취소
              </button>
              <button
                type="button"
                className="btn-reject-confirm"
                disabled={isRejecting}
                onClick={handleRejectConfirm}
              >
                {isRejecting ? "처리 중..." : "반려 확정"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}