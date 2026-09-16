export type RepaymentScheduleStatus = "PENDING" | "OVERDUE" | "PAID" | "WRITTEN_OFF";
export const SCHEDULE_STATUS_LABELS: Record<RepaymentScheduleStatus, string> = {
    PENDING: "납부예정",
    OVERDUE: "연체",
    PAID: "납부완료",
    WRITTEN_OFF: "상각 처리",
};

export type ContractStatus = "DRAFT" | "PENDING" | "COMPLETED" | "SUPERSEDED" | "TERMINATED" | "CHANGE_REJECTED";

export const CONTRACT_STATUS_LABELS: Partial<Record<ContractStatus, string>> = {
    DRAFT: "작성중",
    PENDING: "서명대기",
    COMPLETED: "진행중",
};

export type RepaymentMethod = "EQUAL_PRINCIPAL_AND_INTEREST" | "EQUAL_PRINCIPAL" | "BULLET_REPAYMENT";

export const REPAYMENT_METHOD_LABELS: Record<RepaymentMethod, string> = {
    EQUAL_PRINCIPAL_AND_INTEREST: "원리금균등상환",
    EQUAL_PRINCIPAL: "원금균등상환",
    BULLET_REPAYMENT: "만기일시상환",
};

export interface RepaymentScheduleRow {
  scheduleId: number;
  sequence: number;
  dueDate: string;
  totalPaymentDue: number;
  paidAt: string | null;
  status: RepaymentScheduleStatus;
}

export interface RepaymentScheduleSummary {
  creditorName: string;
  debtorName: string;
  nextDueDate: string | null;
  totalScheduledAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paidCount: number;
  totalCount: number;
  schedules: RepaymentScheduleRow[];
}

export interface ContractInfo {
  contractAlias: string;
  status: ContractStatus;
  interestRate: number;
  maturityDate: string;
  repaymentType: RepaymentMethod;
  createdAt: string;
}

export interface ContractDetailForSchedule {
  contract: ContractInfo;
  isCreditor: boolean;
}