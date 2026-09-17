export type ContractRelationType = "FAMILY" | "ACQUAINTANCE";

export type RepaymentMethod =
  | "EQUAL_PRINCIPAL_AND_INTEREST"
  | "EQUAL_PRINCIPAL"
  | "BULLET_REPAYMENT";

export interface ContractFormData {
  relationType: ContractRelationType;
  principalAmount: string;
  interestRate: string;
  repaymentType: RepaymentMethod;
  startDate: string;
  maturityDate: string;
  repaymentDay: string;
  contractAlias: string;
  terms: string;
  creditorAddress: string;
  selectedLinkedAccountId: string;
}

export const REPAYMENT_METHOD_LABELS: Record<RepaymentMethod, string> = {
  EQUAL_PRINCIPAL_AND_INTEREST: "원리금균등상환",
  EQUAL_PRINCIPAL: "원금균등상환",
  BULLET_REPAYMENT: "만기일시상환",
};

export interface CreditorInfo {
  name: string;
  birthDate: string;
}

export const LOAN_CONTRACT_DRAFT_KEY = "loanContractDraft";

export interface LoanContractDraft {
  relationType: ContractRelationType;
  principalAmount: string;
  interestRate: string;
  startDate: string;
  maturityDate: string;
  repaymentDay: number;
  creditorAddress: string;
  contractAlias: string;
  terms: string | null;
  selectedLinkedAccountId: string;
  repaymentType: RepaymentMethod;
}

export function toDraft(formData: ContractFormData): LoanContractDraft {
  return {
    relationType: formData.relationType,
    principalAmount: formData.principalAmount,
    interestRate: formData.interestRate,
    startDate: formData.startDate,
    maturityDate: formData.maturityDate,
    repaymentDay: Number(formData.repaymentDay),
    creditorAddress: formData.creditorAddress,
    contractAlias: formData.contractAlias,
    terms: formData.terms.trim() ? formData.terms : null,
    selectedLinkedAccountId: formData.selectedLinkedAccountId,
    repaymentType: formData.repaymentType,
  };
}

export type ContractStatus = 'DRAFT' | 'PENDING' | 'COMPLETED';

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT: '작성중 (아직 채권자가 전송하지 않았습니다)',
  PENDING: '전송됨 (채무자 확인 대기중)',
  COMPLETED: '완료',
};

export interface ContractDetail {
  status: ContractStatus;
  previousContractId: number | null;
  creditorName: string | null;
  creditorBirthDate: string | null;
  creditorAddress: string | null;
  debtorName: string | null;
  debtorBirthDate: string | null;
  debtorAddress: string | null;
  principalAmount: number | null;
  interestRate: number | null;
  repaymentType: RepaymentMethod | null;
  startDate: string | null;
  maturityDate: string | null;
  repaymentDay: number | null;
  contractAlias: string | null;
  terms: string | null;
}

export const DEBTOR_APPROVAL_DRAFT_KEY = 'debtorApprovalDraft';

export interface DebtorApprovalDraft {
  debtorAddress: string;
}

export interface LoanContractResponse {
  contractId: number;
  previousContractId: number | null;
  creditorName: string;
  creditorBirthDate: string;
  creditorAddress: string | null;
  creditorSignature: string | null;
  debtorName: string | null;
  debtorBirthDate: string | null;
  debtorAddress: string | null;
  debtorSignature: string | null;
  relationType: ContractRelationType;
  principalAmount: number;
  interestRate: number;
  repaymentType: RepaymentMethod;
  startDate: string;
  maturityDate: string;
  repaymentDay: number;
  contractAlias: string;
  terms: string | null;
  status: ContractStatus;
  createdAt: string;
  updatedAt: string;
}
