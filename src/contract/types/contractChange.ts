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

export interface ChangeRequestDetail {
    changeRequestId: number;
    newContractId: number | null;
    requesterName: string;
    rejectorName: string;
    requestedAt: string;
    status: string;
    currentMaturityDate: string;
    currentInterestRate: number;
    currentRepaymentType: string;
    currentTerms: string | null;
    currentMonthlyPayment: number;
    newMaturityDate: string;
    newInterestRate: number;
    newRepaymentType: string;
    newTerms: string | null;
    newMonthlyPayment: number;
    changeReason: string;
    extendedMonths: number;
    returnReason: string | null;
}