import type { Transaction, TransactionStatus } from '../transaction/types';

export type MatchingTargetType = 'LOAN' | 'SETTLEMENT';
export type MatchingReviewChannel = 'NOTIFICATION' | 'TRANSACTION_HISTORY';
export type MatchingReviewSource =
  | { kind: 'transaction'; linkedAccountId: number; bankTransactionId: number }
  | { kind: 'list'; reviewChannel: MatchingReviewChannel; targetType?: MatchingTargetType; aggregateId?: number };

export interface MatchCandidate {
  matchCandidateId: number;
  targetType: MatchingTargetType;
  targetId: number;
  aggregateId: number;
  targetName: string | null;
  participantName: string | null;
  expectedRemainingAmount: number;
  amountMatchType: 'EXACT' | 'PARTIAL' | 'EXCESS';
}

export interface MatchingReview {
  transaction: Transaction;
  reviewChannel: MatchingReviewChannel;
  candidates: MatchCandidate[];
}

export interface ReviewPage {
  content: MatchingReview[];
  page: number;
  size: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ProcessResult {
  bankTransactionId: number;
  processingStatus: TransactionStatus;
  reviewResult: 'APPLIED' | 'REJECTED' | 'CANDIDATE_INVALIDATED';
}

export function transactionKey(transaction: Pick<Transaction, 'linkedAccountId' | 'bankTransactionId'>) {
  return `${transaction.linkedAccountId}:${transaction.bankTransactionId}`;
}

export function canReview(transaction: Transaction) {
  return transaction.processingStatus === 'NEEDS_CHECK' && transaction.transactionType === 'DEPOSIT';
}
