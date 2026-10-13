// Mirrors BankTransactionDetailResponse and the backend transaction enums.
// List responses omit linkedAccountId; callers supply their account context.
export type TransactionStatus = 'PENDING' | 'APPLIED' | 'UNMATCHED' | 'NEEDS_CHECK' | 'FAILED';
export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL';

export interface Transaction {
  bankTransactionId: number;
  linkedAccountId: number;
  amount: number;
  transactionType: TransactionType;
  processingStatus: TransactionStatus;
  transactionAt: string;
  counterpartyName: string | null;
  memo: string | null;
  syncedAt?: string | null;
}
