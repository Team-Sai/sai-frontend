import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../shared.css';
import '../styles/ContractFormPage.css';
import ContractDocument from '../components/ContractDocument';
import PartiesInfo from '../components/PartiesInfo';
import Stepper from '../components/Stepper';
import { getContractDetail } from '../api/contractApi';
import type { ContractDetail, CreditorInfo } from '../types/contract';
import { clearIdentityVerification } from '../../identity/identityVerificationStorage';
import {
  noopClauseAction,
  noopFieldChange,
  parseStoredTerms,
  toContractFormData,
} from '../utils/storedContract';

interface HttpError extends Error {
  status?: number;
}

export default function ContractChangeApprovalFormPage() {
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();

  const [detail, setDetail] = useState<ContractDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!contractId) return;

    let cancelled = false;

    async function loadContract() {
      try {
        const data = await getContractDetail(Number(contractId));
        if (cancelled) return;

        setDetail(data);
        setLockMessage(data.status === 'COMPLETED' ? '이미 승인이 완료된 변경 건입니다.' : null);
        setIsLoading(false);
      } catch (error) {
        if (cancelled) return;

        const status = (error as HttpError).status;
        setIsError(true);
        setStatusMessage(
          status === 403
            ? '이 계약 변경 건에 접근할 권한이 없습니다.'
            : '계약서를 불러오지 못했습니다.',
        );
        setLockMessage('');
        setIsLoading(false);
      }
    }

    loadContract();

    return () => {
      cancelled = true;
    };
  }, [contractId]);

  function handleNext() {
    if (!contractId) return;
    clearIdentityVerification();
    navigate(
      `/identity-test?returnTo=${encodeURIComponent(`/contracts/${contractId}/change-approval/signature`)}`,
    );
  }

  const locked = lockMessage !== null && lockMessage !== '';

  const formData = useMemo(() => (detail ? toContractFormData(detail) : null), [detail]);

  const creditorInfo = useMemo<CreditorInfo | null>(
    () =>
      detail
        ? {
            name: detail.creditorName ?? '-',
            birthDate: detail.creditorBirthDate ?? '-',
          }
        : null,
    [detail],
  );

  const debtorInfo = useMemo(
    () =>
      detail
        ? {
            name: detail.debtorName ?? '-',
            birthDate: detail.debtorBirthDate ?? '-',
          }
        : null,
    [detail],
  );

  const appliedClauses = useMemo(
    () => parseStoredTerms(detail?.terms ?? null, contractId ?? 'unknown'),
    [detail?.terms, contractId],
  );

  return (
    <div className="page contract-review-page">
      <Stepper variant="changeApproval" currentStep={1} />

      {detail && !locked && (
        <div className="debtor-status-card" role="status">
          <div className="debtor-status-card__icon">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div className="debtor-status-card__content">
            <strong>변경 계약 내용 확인 대기 중</strong>
            <p>변경된 계약 내용을 확인한 후 본인인증과 전자서명을 진행해 주세요.</p>
          </div>
        </div>
      )}

      {isLoading && !detail && (
        <p className="doc__status" role="status">
          계약서를 불러오는 중입니다.
        </p>
      )}

      {!isLoading && !detail && (
        <p className={`doc__status ${isError ? 'is-error' : ''}`.trim()} role="status" aria-live="polite">
          {statusMessage}
        </p>
      )}

      {formData && detail && (
        <main className="contract-workspace__main" id="approveForm">
          <ContractDocument
            formData={formData}
            onFieldChange={noopFieldChange}
            creditorInfo={creditorInfo}
            debtorName={detail.debtorName}
            appliedClauses={appliedClauses}
            draftClause={null}
            recentlyAppliedClauseId={null}
            fieldWarnings={[]}
            onOpenClauseSettings={noopClauseAction}
            onRemoveClause={noopClauseAction}
            disabled
            readOnly
            documentStatusText={detail.status === 'COMPLETED' ? '체결 완료' : '변경 확인'}
          />

          <div className="contract-paper-footer">
            <PartiesInfo
              creditorInfo={creditorInfo}
              creditorAddress={detail.creditorAddress ?? ''}
              onCreditorAddressChange={() => undefined}
              debtorInfo={debtorInfo}
              debtorAddress={detail.debtorAddress ?? ''}
              mode="READ_ONLY"
              disabled
            />

            <p className="doc__hint">위 변경된 계약 내용을 확인한 뒤, 다음 단계에서 본인인증과 전자서명을 진행해 주세요.</p>

            {!locked && (
              <div className="doc__actions">
                <button type="button" className="btn btn--primary" disabled={isLoading} onClick={handleNext}>
                  {isLoading && <span className="button-spinner" aria-hidden="true" />}
                  확인
                </button>
              </div>
            )}

            <p className={`doc__status ${isError ? 'is-error' : ''}`.trim()} role="status" aria-live="polite">
              {lockMessage || statusMessage}
            </p>
          </div>
        </main>
      )}
    </div>
  );
}
