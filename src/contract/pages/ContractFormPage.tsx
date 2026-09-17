import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../shared.css';
import { authFetch } from '../../auth/authFetch';
import { getPreviousPrincipalSum } from '../api/contractApi';
import Stepper from '../components/Stepper';
import ContractDocument from '../components/ContractDocument';
import PartiesInfo from '../components/PartiesInfo';
import ContractActions from '../components/ContractActions';
import RiskModal from '../components/RiskModal';
import { LOAN_CONTRACT_DRAFT_KEY, toDraft, type ContractFormData, type CreditorInfo } from '../types/contract';

function createInitialFormData(): ContractFormData {
  return {
    relationType: 'ACQUAINTANCE',
    principalAmount: '',
    startDate: '',
    maturityDate: '',
    interestRate: '0.5',
    repaymentDay: '1',
    repaymentType: 'EQUAL_PRINCIPAL_AND_INTEREST',
    contractAlias: '',
    terms: '',
    creditorAddress: '',
    selectedLinkedAccountId: '',
  };
}

function validate(formData: ContractFormData): string | null {
  if (!formData.selectedLinkedAccountId) {
    return '대출금을 받을 계좌를 선택해 주세요.';
  }
  if (!formData.principalAmount || Number(formData.principalAmount) <= 0) {
    return '대출원금을 입력해 주세요.';
  }

  const rate = Number(formData.interestRate);
  if (!formData.interestRate || !Number.isFinite(rate) || rate < 0.5 || rate > 20 || !Number.isInteger(rate * 2)) {
    return '연이자율은 0.5% 이상 20% 이하이며, 0.5% 단위여야 합니다.';
  }
  if (!formData.startDate || !formData.maturityDate) {
    return '대출 시작일과 만기일을 입력해 주세요.';
  }
  if (!(new Date(formData.maturityDate) > new Date(formData.startDate))) {
    return '대출 만기일은 시작일 이후여야 합니다.';
  }

  const day = Number(formData.repaymentDay);
  if (formData.repaymentDay.trim() === '' || !Number.isInteger(day) || day < 1 || day > 31) {
    return '상환일은 1일부터 31일까지의 정수로 입력해 주세요.';
  }
  if (!formData.creditorAddress.trim()) {
    return '채권자 주소를 입력해 주세요.';
  }
  if (!formData.contractAlias.trim()) {
    return '계약의 목적을 입력해 주세요.';
  }

  return null;
}

export default function ContractFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState<ContractFormData>(() => ({
    ...createInitialFormData(),
    relationType: searchParams.get('relation') === 'FAMILY' ? 'FAMILY' : 'ACQUAINTANCE',
  }));
  const [creditorInfo, setCreditorInfo] = useState<CreditorInfo | null>(null);

  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [previousAmount, setPreviousAmount] = useState(0);

  useEffect(() => {
    if (!sessionStorage.getItem('identityVerificationId')) {
      navigate(`/identity-test?returnTo=${encodeURIComponent('/contracts/new')}`, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    async function loadCreditorInfo() {
      const res = await authFetch('/api/users/me', {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return;
      const user = await res.json();
      setCreditorInfo({ name: user.name, birthDate: user.birthDate });
    }

    loadCreditorInfo();
  }, []);

  function handleFieldChange<K extends keyof ContractFormData>(field: K, value: ContractFormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function proceedToSignature() {
    sessionStorage.setItem(LOAN_CONTRACT_DRAFT_KEY, JSON.stringify(toDraft(formData)));
    navigate('/contracts/signature');
  }

  async function handleNext() {
    const validationError = validate(formData);
    if (validationError) {
      setIsError(true);
      setStatusMessage(validationError);
      return;
    }

    if (formData.relationType !== 'FAMILY') {
      proceedToSignature();
      return;
    }

    setIsChecking(true);
    setIsError(false);
    setStatusMessage('이전 차용금 내역을 확인하는 중입니다...');

    try {
      const sum = await getPreviousPrincipalSum();
      setPreviousAmount(sum);
      setStatusMessage(null);
      setIsRiskModalOpen(true);
    } catch (error) {
      setIsError(true);
      setStatusMessage(
        error instanceof Error
          ? error.message
          : '이전 차용금 내역을 불러오지 못했습니다. 네트워크 상태를 확인 후 다시 시도해 주세요.',
      );
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <div className="page">
      <Stepper currentStep={2} />

      <div className="doc">
        <ContractDocument
          formData={formData}
          onFieldChange={handleFieldChange}
          creditorInfo={creditorInfo}
          disabled={isChecking}
        />

        <PartiesInfo
          creditorInfo={creditorInfo}
          creditorAddress={formData.creditorAddress}
          onCreditorAddressChange={(value) => handleFieldChange('creditorAddress', value)}
          disabled={isChecking}
        />

        <ContractActions
          isProcessing={isChecking}
          statusMessage={statusMessage}
          isError={isError}
          onNext={handleNext}
        />
      </div>

      {isRiskModalOpen && (
        <RiskModal
          previousAmount={previousAmount}
          currentAmount={Number(formData.principalAmount) || 0}
          interestRate={Number(formData.interestRate) || 0}
          onClose={() => setIsRiskModalOpen(false)}
          onApplySafeRate={(rate) => handleFieldChange('interestRate', String(rate))}
          onProceed={() => {
            setIsRiskModalOpen(false);
            proceedToSignature();
          }}
        />
      )}
    </div>
  );
}
