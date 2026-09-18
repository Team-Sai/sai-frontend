import type { RepaymentMethod } from "./schedule";

export interface CurrentContractConditions {
    principalAmount: number;
    interestRate: number;
    maturityDate: string;
    repaymentType: RepaymentMethod;
    repaymentDay: number;
    terms: string | null;
}

export interface ContractChangeRequestInput {
    changeReason: string;
    newMaturityDate: string | null;
    newInterestRate: number | null;
    newRepaymentType: RepaymentMethod | null;
    newRepaymentDate: number | null;
    newTerms: string | null;
}

export interface ContractChangeResult {
    changeRequestId: number;
}