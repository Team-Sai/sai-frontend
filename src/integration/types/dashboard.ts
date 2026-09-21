export interface DashboardAmountDetail {
  totalAmount?: number;
  settlementAmount?: number;
  loanAmount?: number;
}

export interface DashboardAmountSummary {
  receivable?: DashboardAmountDetail;
  payable?: DashboardAmountDetail;
}

export interface DashboardAttentionItem {
  id?: number | string;
  type: string;
  remainingDays?: number;
  actionUrl?: string;
}

export interface DashboardMonthlySummary {
  completedTransactionCount?: number;
  inProgressSettlementCount?: number;
  inProgressLoanRepaymentCount?: number;
  transactionCompletionRate?: number;
}

export type DashboardTransactionType =
  | 'LOAN'
  | 'SETTLEMENT';

export interface DashboardTransaction {
  id?: number | string;
  title: string;
  status: string;
  type: DashboardTransactionType;
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