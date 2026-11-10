import { useEffect, useState } from "react";
import { Button } from "../../common/components";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getChangeRequestDetail } from "../api/contractChangeApi";
import "../shared.css";
import "../styles/ContractCompletePage.css";
import CompletionIcon from "../components/CompletionIcon";
import Stepper from "../components/Stepper";

export default function ContractChangeRequestSentPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const changeRequestId = searchParams.get("changeRequestId");

  const [newContractId, setNewContractId] = useState<number | null>(null);
  const [isResolving, setIsResolving] = useState(
    Boolean(contractId && changeRequestId),
  );

  useEffect(() => {
    if (!contractId || !changeRequestId) return;

    let cancelled = false;

    getChangeRequestDetail(Number(contractId), Number(changeRequestId))
      .then((detail) => {
        if (!cancelled) setNewContractId(detail.newContractId);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsResolving(false);
      });

    return () => {
      cancelled = true;
    };
  }, [contractId, changeRequestId]);

  return (
    <div className="page">
      <Stepper variant="changeRequest" currentStep={4} />

      <div className="success-container">
        <header className="success-header">
          <h1 className="success-title">변경 요청이 전송되었습니다.</h1>
          <CompletionIcon />
          <p className="success-description">
            상대방이 요청을 확인하고 승인하면 알림으로 안내해드립니다.
          </p>
        </header>

        <footer className="action-group">
          <Button
            type="button"
            className="complete-action complete-action--primary"
            onClick={() => navigate("/contracts/dashboard")}
          >
            <svg className="complete-action__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="9" />
              <rect x="14" y="3" width="7" height="5" />
              <rect x="14" y="12" width="7" height="9" />
              <rect x="3" y="16" width="7" height="5" />
            </svg>
            <span>대시보드로 이동</span>
          </Button>

          <Button
            type="button"
            variant="text"
            className="complete-action complete-action--secondary"
            disabled={!contractId || isResolving}
            onClick={() =>
              navigate(`/contracts/${newContractId ?? contractId}/contract-detail`)
            }
          >
            <svg className="complete-action__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>계약서 보기</span>
          </Button>
        </footer>
      </div>
    </div>
  );
}
