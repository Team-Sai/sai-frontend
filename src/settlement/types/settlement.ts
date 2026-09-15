export type SettlementType = 'SHARED' | 'RECURRING';
export type SettlementStatus = 'IN_PROGRESS' | 'CLOSED' | 'CANCELLED';
export type SettlementRole = 'OWNER' | 'MEMBER';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export interface SettlementListItem {
  settlementId: number;
  title?: string;
  settlementType: SettlementType;
  role: SettlementRole;
  settlementCategory?: string;
  splitType?: 'EQUAL' | 'CUSTOM';
  settlementStatus: SettlementStatus;
  totalAmount?: number;
  createdAt?: string;
  dueDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface SettlementSummary {
  receivableAmount?: number;
  payableAmount?: number;
  receivableCount?: number;
  payableCount?: number;
}

export interface ParticipantLookup {
  userId?: number;
  userToken: string;
  name: string;
  email?: string;
}

export interface LinkedSettlementAccount {
  linkedAccountId: number;
  bankCode?: string;
  bankName?: string;
  maskedAccountNumber?: string;
  accountAlias?: string | null;
  accountHolderName?: string;
  balance?: number;
  connectionStatus?: string;
}

export interface SettlementDetail {
  settlementId: number;
  title?: string;
  settlementType: SettlementType;
  settlementCategory?: string;
  splitType?: 'EQUAL' | 'CUSTOM';
  settlementStatus: SettlementStatus;
  role: SettlementRole;
  dueDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface PaymentObligation {
  participantId: number;
  participantName?: string;
  expectedAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  latestPaymentAt?: string | null;
  paymentStatus: PaymentStatus;
  obligationStatus?: string;
  overdueSince?: string | null;
}

export interface SettlementPaymentStatus {
  totalExpectedAmount?: number;
  totalPaidAmount?: number;
  totalRemainingAmount?: number;
  progressRate?: number;
  closable?: boolean;
  obligations?: PaymentObligation[];
}

export interface SyncResult {
  appliedCount?: number;
  needsCheckCount?: number;
  unmatchedCount?: number;
}

export interface CreateSettlementPayload {
  settlementCategory: string;
  title: string;
  totalAmount: number | null;
  linkedAccountId: number | null;
  participants: Array<{ userToken: string }>;
}
