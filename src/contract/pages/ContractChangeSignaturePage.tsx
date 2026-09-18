import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../shared.css";
import SignatureAndSubmit from "../components/SignatureAndSubmit";
import { submitChangeRequestSignature } from "../api/contractChangeApi";

export default function ContractChangeSignaturePage() {
    const navigate = useNavigate();
    const {contractId, changeRequestId} = useParams<{
        contractId: string;
        changeRequestId: string;
    }>();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        if (!contractId || !changeRequestId) return;

        if (!sessionStorage.getItem("identityVerificationId")) {
            navigate(
                `/identity-test?returnTo=${encodeURIComponent(
                    `/contracts/${contractId}/change-requests/${changeRequestId}/signature`,
                )}`,
                {replace: true},
            );
        }
    }, [contractId, changeRequestId, navigate]);

    async function handleSubmit(signature: Blob) {
        if (!contractId || !changeRequestId) return;

        const identityVerificationId = sessionStorage.getItem("identityVerificationId");
        if (!identityVerificationId) {
            navigate(
                `/identity-test?returnTo=${encodeURIComponent(
                    `/contracts/${contractId}/change-requests/${changeRequestId}/signature`,
                )}`,
                {replace:true},
            );
            return;
        }

        setIsSubmitting(true);
        setIsError(false);
        setStatusMessage("서명을 제출하는 중입니다...");

        try {
            await submitChangeRequestSignature(
                Number(contractId),
                Number(changeRequestId),
                signature,
                identityVerificationId,
            );

            sessionStorage.removeItem("identityVerificationId");
            navigate(`/contracts/${contractId}/change-requests/sent`);
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
            <SignatureAndSubmit
            title="전 자 서 명"
            submitLabel="서명 제출"
            agreementText="위 변경 요청 내용을 확인하였으며, 전자서명을 통해 변경 요청 제출 의사를 기록합니다."
            isSubmitting={isSubmitting}
            statusMessage={statusMessage}
            isError={isError}
            onSubmit={handleSubmit}
            />
        </div>
    );
}