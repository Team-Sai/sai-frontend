export interface DashboardAmountDetail {
  totalAmount?: number;
  settlementAmount?: number;
  loanAmount?: number;
}

export interface DashboardAmountSummary {
  receivable?: DashboardAmountDetail;
  payable?: DashboardAmountDetail;
}

export type AttentionType =
  | 'LOAN_DUE_SOON'
  | 'SETTLEMENT_DUE_SOON'
  | string;

export interface DashboardAttentionItem {
  id?: number | string;
  type: AttentionType;
  remainingDays?: number;
  actionUrl?: string;
}

export interface DashboardMonthlySummary {
  completedTransactionCount?: number;
  inProgressSettlementCount?: number;
  inProgressLoanRepaymentCount?: number;
  transactionCompletionRate?: number;
}

export type TransactionType =
  | 'LOAN'
  | 'SETTLEMENT';

export type TransactionStatus =
  | 'COMPLETED'
  | 'IN_PROGRESS'
  | string;

export interface DashboardTransaction {
  id?: number | string;
  title: string;
  status: TransactionStatus;
  type: TransactionType;
  amount: number;
  detailUrl?: string;
}

export interface DashboardCalendarDay {
  date: string;
  hasInbound?: boolean;
  hasOutbound?: boolean;
}

export interface DashboardResponse {
  amountSummary?: DashboardAmountSummary | null;
  attentionItems?: DashboardAttentionItem[];
  monthlySummary?: DashboardMonthlySummary | null;
  recentTransactions?: DashboardTransaction[];
  calendarDays?: DashboardCalendarDay[];
}