import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../shared.css";
import "../styles/ContractChangeFormPage.css";
import {
  getCurrentContractConditions,
  requestContractChange,
} from "../api/contractChangeApi";
import type { CurrentContractConditions } from "../types/contractChange";
import { REPAYMENT_METHOD_LABELS } from "../types/schedule";
import type { RepaymentMethod } from "../types/schedule";

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

  const [changeReason, setChangeReason] = useState("");
  const [newMaturityDate, setNewMaturityDate] = useState("");
  const [newInterestRate, setNewInterestRate] = useState("");
  const [newRepaymentType, setNewRepaymentType] = useState("");
  const [newRepaymentDate, setNewRepaymentDate] = useState("");
  const [newTerms, setNewTerms] = useState("");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      newRepaymentDate ||
      newTerms.trim();

    if (!hasAnyChange) {
      return "변경할 계약 조건을 입력해주세요.";
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
    setIsSubmitting(true);

    requestContractChange(Number(contractId), {
      changeReason,
      newMaturityDate: newMaturityDate || null,
      newInterestRate: newInterestRate ? Number(newInterestRate) : null,
      newRepaymentType: (newRepaymentType || null) as RepaymentMethod | null,
      newRepaymentDate: newRepaymentDate ? Number(newRepaymentDate) : null,
      newTerms: newTerms.trim() || null,
    })
      .then((result) => {
        navigate(`/contracts/${contractId}/change-requests/${result.changeRequestId}/signature`);
      })
      .catch((err: Error) => {
        setSubmitError(err.message);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  if (isLoading) {
    return (
      <div className="contract-scope contract-scope--change-form">
        불러오는 중이에요...
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
    <div className="contract-scope contract-scope--change-form">
      <div className="page-header">
        <h1 className="page-title">계약 조건 변경 요청</h1>
        <p className="page-description">
          협의된 새로운 계약 조건들을 입력해주세요. 제출 시 상대방에게 알림이
          전송됩니다.
        </p>
      </div>

      <div className="change-form-layout">
        <form className="change-form" onSubmit={handleSubmit}>
          <label htmlFor="changeReason">변경 사유</label>
          <textarea
            id="changeReason"
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            placeholder="변경하고자 하는 구체적인 사유를 입력해주세요."
          />

          <label htmlFor="newMaturityDate">변경 만기일</label>
          <input
            type="date"
            id="newMaturityDate"
            value={newMaturityDate}
            onChange={(e) => setNewMaturityDate(e.target.value)}
          />

          <label htmlFor="newInterestRate">변경 이율</label>
          <input
            type="number"
            id="newInterestRate"
            step={0.5}
            min={0.5}
            max={20}
            value={newInterestRate}
            onChange={(e) => setNewInterestRate(e.target.value)}
            placeholder="0.5% 단위로 입력해주세요."
          />
          <label htmlFor="newRepaymentType">상환방식</label>
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

          <label htmlFor="newRepaymentDate">상환일 변경</label>
          <input
            type="number"
            id="newRepaymentDate"
            min={1}
            max={31}
            placeholder="예: 15"
            value={newRepaymentDate}
            onChange={(e) => setNewRepaymentDate(e.target.value)}
          />

          <label htmlFor="newTerms">특약사항 변경</label>
          <textarea
            id="newTerms"
            value={newTerms}
            onChange={(e) => setNewTerms(e.target.value)}
            placeholder="변경할 특약사항을 입력해주세요."
          />

          {submitError && <p className="form-error">{submitError}</p>}

          <div className="change-form__actions">
            <button type="button" onClick={() => navigate(-1)}>
              변경 취소
            </button>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "제출 중..." : "변경 요청 보내기"}
            </button>
          </div>
        </form>

        <div className="current-contract">
          <h2>현재 계약조건</h2>
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
            <dd>{current.terms || "없음"}</dd>
          </dl>
        </div>
      </div>

      <p className="disclaimer">
        * 본 변경 요청서에 기재된 내용(특약사항 포함)은 당사자 간 입력 정보를
        기반으로 기록되는 것으로, 서명 및 본인확인 절차의 방식에 따라 그 법적
        효력의 범위나 효력 발생 요건에 관한 해석이 달라질 수 있어 구체적인 법적
        효력 여부는 별도 확인이 필요할 수 있습니다.
      </p>
    </div>
  );
}
