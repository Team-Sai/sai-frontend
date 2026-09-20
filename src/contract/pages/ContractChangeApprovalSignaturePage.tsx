import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../shared.css";
import ChangeApprovalStepper from "../components/ChangeApprovalStepper";
import SignatureAndSubmit from "../components/SignatureAndSubmit";
import { submitChangeApproval } from "../api/contractChangeApi";

export default function ContractChangeApprovalSignaturePage() {
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!contractId) return;

    if (!sessionStorage.getItem("identityVerificationId")) {
      navigate(
        `/identity-test?returnTo=${encodeURIComponent(`/contracts/${contractId}/change-approval/signature`)}`,
        { replace: true },
      );
    }
  }, [contractId, navigate]);

  async function handleSubmit(signature: Blob) {
    if (!contractId) return;

    const identityVerificationId = sessionStorage.getItem("identityVerificationId");
    if (!identityVerificationId) {
      navigate(
        `/identity-test?returnTo=${encodeURIComponent(`/contracts/${contractId}/change-approval/signature`)}`,
        { replace: true },
      );
      return;
    }

    setIsSubmitting(true);
    setIsError(false);
    setStatusMessage("서명을 제출하는 중입니다...");

    try {
      await submitChangeApproval(Number(contractId), signature, identityVerificationId);
      sessionStorage.removeItem("identityVerificationId");
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

  return (
    <div className="page">
      <ChangeApprovalStepper currentStep={3} />

      <SignatureAndSubmit
        title="전 자 서 명"
        submitLabel="서명 제출"
        agreementText="위 변경된 계약 내용을 모두 확인하였으며, 전자서명을 통해 상기 계약 조건에 대한 최종 승인 의사를 기록합니다."
        isSubmitting={isSubmitting}
        statusMessage={statusMessage}
        isError={isError}
        onSubmit={handleSubmit}
      />
    </div>
  );
}