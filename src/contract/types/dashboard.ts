// ------ 대시보드 -------

export type ContractRole = "CREDITOR" | "DEBTOR";
export type DashboardContractStatus = "ONGOING" | "COMPLETED";
export type DashboardPaymentStatus = "ONGOING" | "PAID";

export const CONTRACT_ROLE_LABELS: Record<ContractRole, string> = {
  CREDITOR: "대여",
  DEBTOR: "차용",
};

export const CONTRACT_STATUS_LABELS: Record<DashboardContractStatus, string> = {
  ONGOING: "진행중",
  COMPLETED: "완료",
};

export const PAYMENT_STATUS_LABELS: Record<DashboardPaymentStatus, string> = {
  ONGOING: "진행중",
  PAID: "납부완료",
};

export interface DashboardContractRow {
  contractId: number;
  contractAlias: string;
  role: ContractRole;
  principalAmount: number;
  totalRemainingAmount: number;
  contractStatus: DashboardContractStatus;
  paymentStatus: DashboardPaymentStatus;
  maturityDate: string;
  nearestScheduleDueDate: string | null;
  nextDueAmount: number | null;
}

export interface DashboardSummary {
  totalContractCount: number;
  totalLentAmount: number;
  totalBorrowedAmount: number;
  thisMonthDueAmount: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  contracts: DashboardContractRow[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}
