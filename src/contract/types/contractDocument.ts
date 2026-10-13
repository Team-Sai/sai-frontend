import type {ContractInfo} from "./schedule";

export interface ContractDocument extends ContractInfo {
    creditorName: string;
    creditorBirthDate: string | null;
    creditorAddress: string | null;
    debtorName: string;
    debtorBirthDate: string | null;
    debtorAddress: string | null;
   principalAmount: number;
   startDate: string;
   repaymentDay: number;
   terms: string | null;
}

export interface ContractDocumentDetail {
    contract: ContractDocument;
    isCreditor: boolean;
    canRequestChange: boolean;
}
