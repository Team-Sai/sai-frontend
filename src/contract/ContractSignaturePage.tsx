import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './shared.css';
import './components/ContractDocument.css';
import Stepper from './components/Stepper';
import SignatureAndSubmit from './components/SignatureAndSubmit';
import { createContract, submitCreditorSignature } from './api/contractApi';
import { LOAN_CONTRACT_DRAFT_KEY, type LoanContractDraft } from './types/contract';

export default function ContractSignaturePage() {
  const navigate = useNavigate();

  const [draft] = useState<LoanContractDraft | null>(() => {
    const raw = sessionStorage.getItem(LOAN_CONTRACT_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as LoanContractDraft) : null;
  });
  const [debtorUserToken, setDebtorUserToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [createdContractId, setCreatedContractId] = useState<number | null>(null);

  useEffect(() => {
    if (!draft) {
      alert('작성 중인 차용증 정보가 없습니다. 처음부터 다시 시도해 주세요.');
      navigate('/contracts/new', { replace: true });
      return;
    }

    if (!sessionStorage.getItem('identityVerificationId')) {
      navigate(`/identity-test?returnTo=${encodeURIComponent('/contracts/signature')}`, { replace: true });
    }
  }, [draft, navigate]);

  function handleCancel() {
    navigate('/contracts/new');
  }

  async function handleSubmit(signature: Blob) {
    if (!draft) return;

    const identityVerificationId = sessionStorage.getItem('identityVerificationId');
    if (!identityVerificationId) {
      navigate(`/identity-test?returnTo=${encodeURIComponent('/contracts/signature')}`, { replace: true });
      return;
    }

    setIsSubmitting(true);
    setIsError(false);
    setStatusMessage('차용증을 전송하는 중입니다...');

    try {
      // 본인인증은 1회용이라, 계약 생성엔 성공했는데 서명 업로드만 실패한 경우
      // createContract를 다시 호출하지 않고 이미 생성된 contractId로 서명만 재시도한다.
      let contractId = createdContractId;
      if (contractId == null) {
        contractId = await createContract(draft, identityVerificationId);
        setCreatedContractId(contractId);
      }

      await submitCreditorSignature(contractId, debtorUserToken.trim(), signature);

      sessionStorage.removeItem(LOAN_CONTRACT_DRAFT_KEY);
      navigate(`/contracts/complete?contractId=${contractId}`);
    } catch (error) {
      setIsError(true);
      setStatusMessage(
        error instanceof Error ? error.message : '차용증 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
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
      <Stepper currentStep={2} />

      <SignatureAndSubmit
        debtorUserToken={debtorUserToken}
        onDebtorUserTokenChange={setDebtorUserToken}
        isSubmitting={isSubmitting}
        statusMessage={statusMessage}
        isError={isError}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
