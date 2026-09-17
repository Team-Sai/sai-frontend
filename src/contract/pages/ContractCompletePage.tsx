import { Button } from '../../common/components';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../shared.css';
import './ContractCompletePage.css';
import Stepper from '../components/Stepper';
import { getContractSummary } from '../api/contractApi';

export default function ContractCompletePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contractId = searchParams.get('contractId');

  const [title, setTitle] = useState('금전소비대차계약이 성공적으로 체결되었습니다!');

  useEffect(() => {
    if (!contractId) return;

    getContractSummary(Number(contractId))
      .then((summary) => {
        if (summary.previousContractId) {
          setTitle('계약 변경이 완료되었습니다!');
        }
      })
      .catch(() => {});
  }, [contractId]);

  return (
    <div className="page">
      <Stepper currentStep={4} />

      <div className="success-container">
        <header className="success-header">
          <h1 className="success-title">{title}</h1>
          <div className="success-icon" aria-hidden="true">
            🎉
          </div>
          <p className="success-description">
            "전자서명이 완료된 원본 차용증은 언제든지 조회 및 발급이 가능합니다."
          </p>
        </header>

        <section className="contract-card">
          <h2 className="contract-card__title">금 전 소 비 대 차 계 약 서</h2>

          <div className="contract-card__decorations" aria-hidden="true">
            <span className="decor-line" />
            <span className="decor-line" />
            <span className="decor-line" />
            <span className="decor-line" />
            <span className="decor-line" />
          </div>

          <div className="stamp-seal" aria-label="체결완료">
            <span className="stamp-seal__text">체결완료</span>
          </div>

          <div className="contract-card__badge-group">
            <span className="badge badge--digital">
              <svg className="badge__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              디지털 원본
            </span>
          </div>
        </section>

        <footer className="action-group">
          <Button
            type="button"
            className="complete-action complete-action--primary"
            disabled={!contractId}
            onClick={() => navigate(`/contracts/${contractId}/contract-detail`)}
          >
            <svg className="complete-action__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>차용증 확인</span>
          </Button>

          <Button type="button" variant="text" className="complete-action complete-action--secondary" onClick={() => navigate('/integration/dashboard')}>
            <svg className="complete-action__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="9" />
              <rect x="14" y="3" width="7" height="5" />
              <rect x="14" y="12" width="7" height="9" />
              <rect x="3" y="16" width="7" height="5" />
            </svg>
            <span>대시보드로 이동</span>
          </Button>
        </footer>
      </div>
    </div>
  );
}
