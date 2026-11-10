import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../shared.css";
import Stepper from "../components/Stepper";
import SignatureAndSubmit from "../components/SignatureAndSubmit";
import {
  cancelChangeRequest,
  requestContractChange,
  submitChangeRequestSignature,
} from "../api/contractChangeApi";
import {
  clearContractChangeDraft,
  loadContractChangeDraft,
  toContractChangeInput,
} from "../utils/contractChangeDraft";
import {
  clearIdentityVerification,
  isIdentityVerifiedFor,
} from "../../identity/identityVerificationStorage";

export default function ContractChangeSignaturePage() {
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();

  const [draft] = useState(() =>
    contractId ? loadContractChangeDraft(contractId) : null,
  );
  const [createdChangeRequestId, setCreatedChangeRequestId] = useState<
    number | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const formPath = `/contracts/${contractId}/change-request`;
  const identityPath = `/identity-test?returnTo=${encodeURIComponent(`${formPath}/signature`)}`;

  useEffect(() => {
    if (!draft) {
      navigate(formPath, { replace: true });
      return;
    }

    if (!isIdentityVerifiedFor(formPath)) {
      clearIdentityVerification();
      navigate(identityPath, { replace: true });
    }
  }, [draft, formPath, identityPath, navigate]);

  /* 입력값은 draft에 남아 있으므로 작성 화면으로 돌아가면 그대로 복구된다. */
  async function handleCancel() {
    if (createdChangeRequestId != null) {
      setIsSubmitting(true);

      try {
        await cancelChangeRequest(Number(contractId), createdChangeRequestId);
      } catch (error) {
        setIsError(true);
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "변경 요청을 취소하지 못했습니다.",
        );
        setIsSubmitting(false);
        return;
      }
    }

    navigate(formPath);
  }

  async function handleSubmit(signature: Blob) {
    if (!draft) return;

    const identityVerificationId = sessionStorage.getItem(
      "identityVerificationId",
    );
    if (!identityVerificationId) {
      navigate(identityPath, { replace: true });
      return;
    }

    setIsSubmitting(true);
    setIsError(false);
    setStatusMessage("변경 요청을 전송하는 중입니다...");

    try {
      let changeRequestId = createdChangeRequestId;

      if (changeRequestId == null) {
        const result = await requestContractChange(
          Number(contractId),
          toContractChangeInput(draft),
        );
        changeRequestId = result.changeRequestId;
        setCreatedChangeRequestId(changeRequestId);
      }

      await submitChangeRequestSignature(
        Number(contractId),
        changeRequestId,
        signature,
        identityVerificationId,
      );

      clearIdentityVerification();
      clearContractChangeDraft();
      navigate(`/contracts/${contractId}/change-requests/sent`);
    } catch (error) {
      setIsError(true);
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "변경 요청 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.",
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
      <Stepper variant="changeRequest" currentStep={3} />

      <SignatureAndSubmit
        submitLabel="서명 제출"
        agreementText="위 변경 요청 내용을 확인하였으며, 전자서명을 통해 변경 요청 제출 의사를 기록합니다."
        isSubmitting={isSubmitting}
        statusMessage={statusMessage}
        isError={isError}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
