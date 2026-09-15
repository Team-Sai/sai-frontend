// ------ 보관함 (차용증) -------

export type ArchiveContractRole = "CREDITOR" | "DEBTOR";
export type ArchiveContractStatus = "ONGOING" | "COMPLETED";

export const ARCHIVE_ROLE_LABELS: Record<ArchiveContractRole, string> = {
  CREDITOR: "채권자",
  DEBTOR: "채무자",
};

export const ARCHIVE_CONTRACT_STATUS_LABELS: Record<
  ArchiveContractStatus,
  string
> = {
  ONGOING: "진행중",
  COMPLETED: "완료",
};

export interface ArchiveContractRow {
  contractId: number;
  contractAlias: string;
  role: ArchiveContractRole;
  principalAmount: number;
  maturityDate: string;
  contractStatus: ArchiveContractStatus;
}

export interface ArchiveContractListResponse {
  contracts: ArchiveContractRow[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

// ------ 보관함 (정산) -------

export type ArchiveSettlementType = "SHARED" | "RECURRING";
export type ArchiveSettlementStatus = "IN_PROGRESS" | "CLOSED";

export const ARCHIVE_SETTLEMENT_TYPE_LABELS: Record<
  ArchiveSettlementType,
  string
> = {
  SHARED: "공동정산",
  RECURRING: "정기정산",
};

export const ARCHIVE_SETTLEMENT_STATUS_LABELS: Record<
  ArchiveSettlementStatus,
  string
> = {
  IN_PROGRESS: "진행중",
  CLOSED: "완료",
};

export interface ArchiveSettlementRow {
  settlementId: number;
  title: string;
  role: string;
  settlementCategory: string;
  settlementType: ArchiveSettlementType;
  splitType: string;
  settlementStatus: ArchiveSettlementStatus;
  totalAmount: number;
  dueDate: string | null;
  startDate: string | null;
  endDate: string | null;
  cycleDate: string | null;
}

export type SettlementPaymentStatusType = "UNPAID" | "PARTIALLY_PAID" | "PAID";
export type SettlementPaymentSourceType = "AUTO_MATCH" | "MANUAL";

export const SETTLEMENT_SPLIT_TYPE_LABELS: Record<string, string> = {
  EQUAL: "균등분담",
  CUSTOM: "직접입력",
};

export const SETTLEMENT_SOURCE_TYPE_LABELS: Record<
  SettlementPaymentSourceType,
  string
> = {
  AUTO_MATCH: "자동매칭",
  MANUAL: "수동",
};

export interface SettlementPaymentObligation {
  paymentObligationId: number;
  participantId: number;
  participantName: string;
  expectedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  latestPaymentAt: string | null;
  paymentStatus: SettlementPaymentStatusType;
  obligationStatus: string;
  overdueSince: string | null;
}

export interface SettlementPaymentStatus {
  settlementId: number;
  obligations: SettlementPaymentObligation[];
  totalExpectedAmount: number;
  totalPaidAmount: number;
  totalRemainingAmount: number;
  paidCount: number;
  partiallyPaidCount: number;
  unpaidCount: number;
  progressRate: number;
  closable: boolean;
}

export interface SettlementPaymentHistory {
  paymentRecordId: number;
  recordedAt: string;
  payerName: string;
  amount: number;
  sourceType: SettlementPaymentSourceType;
  bankTransactionId: number | null;
  counterpartyName: string | null;
  externalTransactionId: string | null;
}

export interface SettlementAccount {
  settlementAccountId: number;
  settlementId: number;
  linkedAccountId: number;
  accountStatus: string;
  bankName: string;
  maskedAccountNumber: string;
  accountHolderName: string;
  selectedAt: string | null;
}

export interface SettlementArchivePreview {
  settlementId: number;
  settlementDisplayId: string;
  title: string;
  ownerName: string;
  settlementType: ArchiveSettlementType;
  settlementCategory: string;
  settlementStatus: ArchiveSettlementStatus;
  splitType: string;
  dueDate: string | null;
  createdAt: string;
  paymentStatus: SettlementPaymentStatus;
  paymentHistory: SettlementPaymentHistory[];
  settlementAccount: SettlementAccount | null;
  documentVersion: string;
}
