import { Button } from "../../common/components";
import { useParams, useNavigate } from "react-router-dom";
import "../shared.css";
import "../styles/ContractCompletePage.css";

export default function ContractChangeRequestSentPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="success-container">
        <header className="success-header">
          <h1 className="success-title">변경 요청이 전송되었습니다.</h1>
          <div className="success-icon" aria-hidden="true">
            📨
          </div>
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
            <span>대시보드로 이동</span>
          </Button>

          <Button
            type="button"
            variant="text"
            className="complete-action complete-action--secondary"
            disabled={!contractId}
            onClick={() => navigate(`/contracts/${contractId}/contract-detail`)}
          >
            <span>계약서 보기</span>
          </Button>
        </footer>
      </div>
    </div>
  );
}
