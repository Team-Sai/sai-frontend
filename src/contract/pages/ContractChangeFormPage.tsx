import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LoadingSkeleton from "../../common/components/LoadingSkeleton";
import Stepper from "../components/Stepper";
import "../shared.css";
import "../styles/ContractChangeFormPage.css";
import { getCurrentContractConditions } from "../api/contractChangeApi";
import {
  clearContractChangeDraft,
  loadContractChangeDraft,
  saveContractChangeDraft,
} from "../utils/contractChangeDraft";
import { clearIdentityVerification } from "../../identity/identityVerificationStorage";
import type { CurrentContractConditions } from "../types/contractChange";
import { REPAYMENT_METHOD_LABELS } from "../types/schedule";

export default function ContractChangeFormPage() {
  const { contractId } = useParams();

  if (!contractId) {
    return (
      <div className="contract-scope contract-scope--change-form">
        잘못된 접근입니다.
      </div>
    );
  }

  return <ContractChangeFormContent key={contractId} contractId={contractId} />;
}

function ContractChangeFormContent({ contractId }: { contractId: string }) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState<CurrentContractConditions | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [draft] = useState(() => loadContractChangeDraft(contractId));

  const [changeReason, setChangeReason] = useState(draft?.changeReason ?? "");
  const [newMaturityDate, setNewMaturityDate] = useState(
    draft?.newMaturityDate ?? "",
  );
  const [newInterestRate, setNewInterestRate] = useState(
    draft?.newInterestRate ?? "",
  );
  const [newRepaymentType, setNewRepaymentType] = useState(
    draft?.newRepaymentType ?? "",
  );
  const [newRepaymentDate, setNewRepaymentDate] = useState(
    draft?.newRepaymentDate ?? "",
  );

  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getCurrentContractConditions(Number(contractId))
      .then((res) => {
        if (cancelled) return;
        setCurrent(res);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError("계약 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [contractId]);

  function validate(): string | null {
    const hasAnyChange =
      newMaturityDate ||
      newInterestRate ||
      newRepaymentType ||
      newRepaymentDate;      
    if (!hasAnyChange) {
      return "만기일·이율·상환 방식·상환일 중 하나 이상을 바꿔 주세요.";
    }

    if (!changeReason.trim()) {
      return "변경 사유를 입력해주세요.";
    }

    if (newInterestRate !== "") {
      const rate = Number(newInterestRate);
      if (
        !Number.isFinite(rate) ||
        rate < 0.5 ||
        rate > 20 ||
        !Number.isInteger(rate * 2)
      ) {
        return "이율은 0.5% 이상 20% 이하이며, 0.5% 단위여야 합니다.";
      }
    }

    if (newRepaymentDate !== "") {
      const day = Number(newRepaymentDate);
      if (
        !Number.isFinite(day) ||
        !Number.isInteger(day) ||
        day < 1 ||
        day > 31
      ) {
        return "상환일은 1일에서 31일 사이여야 합니다.";
      }
    }

    return null;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const validationMessage = validate();
    if (validationMessage) {
      setSubmitError(validationMessage);
      return;
    }

    setSubmitError(null);

    try {
      saveContractChangeDraft({
        contractId,
        changeReason,
        newMaturityDate,
        newInterestRate,
        newRepaymentType,
        newRepaymentDate,
        newTerms: "", // 특약은 변경 요청에서 바꾸지 않는다
      });
    } catch {
      setSubmitError("입력 내용을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    clearIdentityVerification();
    navigate(
      `/identity-test?returnTo=${encodeURIComponent(`/contracts/${contractId}/change-request/signature`)}`,
    );
  }

  function handleCancel() {
    clearContractChangeDraft();
    navigate(`/contracts/${contractId}/contract-detail`);
  }

  if (isLoading) {
    return (
      <div className="contract-scope contract-scope--change-form">
        <LoadingSkeleton className="loading-skeleton--page" rows={6} />
      </div>
    );
  }

  if (loadError || !current) {
    return (
      <div className="contract-scope contract-scope--change-form">
        {loadError ?? "데이터가 없습니다."}
      </div>
    );
  }

  return (
    <div className="contract-scope contract-scope--change-form contract-change-page">
      <Stepper variant="changeRequest" currentStep={1} />

      <header className="change-page-heading">
        <h1>계약 변경 요청</h1>
      </header>

      <div className="change-form-layout">
        <form className="change-form" onSubmit={handleSubmit}>
          <div className="change-form__section-heading">
            <h2>변경할 내용</h2>
            <span>만기일·이율·상환 방식·상환일 중 하나 이상을 바꿔야 요청할 수 있어요.</span>
          </div>

          <div className="change-form__field change-form__field--wide">
            <label htmlFor="changeReason">변경 사유 (필수)</label>
            <textarea
              id="changeReason"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="변경 사유를 입력해주세요."
            />
          </div>

          <div className="change-form__field">
            <label htmlFor="newMaturityDate">변경 만기일</label>
            <input
              type="date"
              id="newMaturityDate"
              value={newMaturityDate}
              onChange={(e) => setNewMaturityDate(e.target.value)}
            />
          </div>

          <div className="change-form__field">
            <label htmlFor="newInterestRate">변경 이율</label>
            <div className="change-form__input-suffix">
              <input
                type="number"
                id="newInterestRate"
                step={0.5}
                min={0.5}
                max={20}
                value={newInterestRate}
                onChange={(e) => setNewInterestRate(e.target.value)}
                placeholder="0.5 단위"
              />
              <span>%</span>
            </div>
          </div>

          <div className="change-form__field">
            <label htmlFor="newRepaymentType">상환 방식</label>
            <select
              id="newRepaymentType"
              value={newRepaymentType}
              onChange={(e) => setNewRepaymentType(e.target.value)}
            >
              <option value="">선택해주세요</option>
              <option value="EQUAL_PRINCIPAL_AND_INTEREST">원리금균등상환</option>
              <option value="EQUAL_PRINCIPAL">원금균등상환</option>
              <option value="BULLET_REPAYMENT">만기일시상환</option>
            </select>
          </div>

          <div className="change-form__field">
            <label htmlFor="newRepaymentDate">상환일</label>
            <div className="change-form__input-suffix">
              <input
                type="number"
                id="newRepaymentDate"
                min={1}
                max={31}
                placeholder="1~31"
                value={newRepaymentDate}
                onChange={(e) => setNewRepaymentDate(e.target.value)}
              />
              <span>일</span>
            </div>
          </div>

          {submitError && <p className="form-error" role="alert">{submitError}</p>}

          <div className="change-form__actions">
            <button type="button" onClick={handleCancel}>
              취소
            </button>
            <button type="submit">다음 (본인인증)</button>
          </div>
        </form>

        <div className="current-contract">
          <div className="current-contract__heading">
            <span aria-hidden="true">✓</span>
            <h2>현재 계약 조건</h2>
          </div>
          <dl>
            <dt>계약 금액</dt>
            <dd>{current.principalAmount.toLocaleString("ko-KR")}원</dd>
            <dt>현재 이율</dt>
            <dd>{current.interestRate}%</dd>
            <dt>만기일</dt>
            <dd>{current.maturityDate}</dd>
            <dt>상환 방식</dt>
            <dd>{REPAYMENT_METHOD_LABELS[current.repaymentType]}</dd>
            <dt>상환일</dt>
            <dd>매월 {current.repaymentDay}일</dd>
            <dt>특약사항</dt>
            <dd className="current-contract__terms">{current.terms || "없음"}</dd>
          </dl>
          <p className="current-contract__note">
            🔒 특약사항은 다른 조건과 얽혀 있어 변경 요청에서 바꿀 수 없어요.
            특약을 바꾸려면 상대방과 상의한 뒤 새 차용증을 작성해 주세요.
            조건을 바꾸면 기존 특약과 맞는지도 함께 확인해 주세요.
          </p>
        </div>
      </div>

      <p className="disclaimer">
        * 본 변경 요청서에 기재된 내용은 당사자 간 입력 정보를
        기반으로 기록되는 것으로, 서명 및 본인확인 절차의 방식에 따라 그 법적
        효력의 범위나 효력 발생 요건에 관한 해석이 달라질 수 있어 구체적인 법적
        효력 여부는 별도 확인이 필요할 수 있습니다.
      </p>
    </div>
  );
}
