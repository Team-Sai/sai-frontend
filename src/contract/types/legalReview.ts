export type LegalReviewStatus =
  | 'PASS'
  | 'WARNING'
  | 'REVIEW'
  | 'ERROR';

export interface ContractLegalReviewRequest {
  principalAmount: number | null;
  interestRate: number | null;
  lateInterestRate: number | null;
  maturityDate: string | null;
}

export interface LegalReviewReference {
  documentId: string;
  lawName: string;
  articleNumber: string | null;
  articleTitle: string | null;
  score: number;
}

export interface LegalReviewItem {
  field: string;
  type: string;
  status: LegalReviewStatus;
  title: string;
  summary: string;
  detail: string;
  suggestion: string;
  references: LegalReviewReference[];
}

export interface LegalReviewSummary {
  total: number;
  passed: number;
  warning: number;
  error: number;
  review: number;
  message: string;
  description: string;
}

export interface ContractLegalReview {
  summary: LegalReviewSummary;
  items: LegalReviewItem[];
  disclaimer: string;
}

export interface ContractLegalReviewResponse {
  review: ContractLegalReview;
}