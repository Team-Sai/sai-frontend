import type {ContractInfo} from "./schedule";

export interface ContractDocument extends ContractInfo {
    creditorName: string;
   debtorName: string;
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