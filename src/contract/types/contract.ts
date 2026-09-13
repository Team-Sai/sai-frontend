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
