export type IntegratedTransactionType = 'DEPOSIT' | 'WITHDRAWAL';
export type IntegratedTransactionStatus = 'PENDING' | 'APPLIED' | 'UNMATCHED' | 'NEEDS_CHECK' | 'FAILED';

export interface IntegratedTransaction {
  bankTransactionId: number;
  linkedAccountId: number;
  amount: number;
  transactionType: IntegratedTransactionType;
  processingStatus: IntegratedTransactionStatus;
  transactionAt: string;
  counterpartyName: string | null;
  memo: string | null;
  bankName: string;
  maskedAccountNumber: string;
}

export interface TransactionPage {
  content: IntegratedTransaction[];
  page: number;
  size: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
