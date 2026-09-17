import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../shared.css";
import Stepper from "../components/Stepper";
import SignatureAndSubmit from "../components/SignatureAndSubmit";
import { submitDebtorApproval } from "../api/contractApi";
import {
  DEBTOR_APPROVAL_DRAFT_KEY,
  type DebtorApprovalDraft,
} from "../types/contract";

export default function DebtorSignaturePage() {
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();

  const [draft] = useState<DebtorApprovalDraft | null>(() => {
    const raw = sessionStorage.getItem(DEBTOR_APPROVAL_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as DebtorApprovalDraft) : null;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!contractId) return;

    if (!draft || !draft.debtorAddress) {
      navigate(`/contracts/${contractId}/approve`, { replace: true });
      return;
    }

    if (!sessionStorage.getItem("identityVerificationId")) {
      navigate(
        `/identity-test?returnTo=${encodeURIComponent(`/contracts/${contractId}/approve/signature`)}`,
        { replace: true },
      );
    }
  }, [contractId, draft, navigate]);

  async function handleSubmit(signature: Blob) {
    if (!contractId || !draft) return;

    const identityVerificationId = sessionStorage.getItem(
      "identityVerificationId",
    );
    if (!identityVerificationId) {
      navigate(
        `/identity-test?returnTo=${encodeURIComponent(`/contracts/${contractId}/approve/signature`)}`,
        { replace: true },
      );
      return;
    }

    setIsSubmitting(true);
    setIsError(false);
    setStatusMessage("서명을 제출하는 중입니다...");

    try {
      await submitDebtorApproval(
        Number(contractId),
        draft.debtorAddress,
        signature,
        identityVerificationId,
      );
      sessionStorage.removeItem("identityVerificationId");
      sessionStorage.removeItem(DEBTOR_APPROVAL_DRAFT_KEY);
      navigate(`/contracts/complete?contractId=${contractId}`);
    } catch (error) {
      setIsError(true);
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "서명 제출에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!draft) {
    return null;
  }

  return (
    <div className="page">
      <Stepper currentStep={3} />

      <SignatureAndSubmit
        title="전 자 서 명"
        submitLabel="서명 제출"
        agreementText="위 계약 내용을 모두 확인하였으며, 전자서명을 통해 상기 계약 조건에 대한 최종 합의 의사를 기록합니다."
        isSubmitting={isSubmitting}
        statusMessage={statusMessage}
        isError={isError}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
