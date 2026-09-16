export type SettlementType = 'SHARED' | 'RECURRING';
export type SettlementStatus = 'IN_PROGRESS' | 'CLOSED';
export type SettlementRole = 'OWNER' | 'MEMBER';
export type SplitType = 'EQUAL' | 'CUSTOM';
export type ObligationStatus = 'ACTIVE' | 'WRITTEN_OFF' | 'EXCLUDED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export interface SettlementListItem {
  settlementId: number;
  title?: string;
  role: SettlementRole;
  settlementCategory?: string;
  settlementType: SettlementType;
  splitType?: SplitType;
  settlementStatus: SettlementStatus;
  totalAmount?: number;
  dueDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  cycleDate?: string | null;
}

export interface SettlementSummary {
  receivableAmount?: number;
  payableAmount?: number;
  receivableCount?: number;
  payableCount?: number;
}

export interface ParticipantLookup {
  userId?: number;
  id?: number;
  userToken: string;
  token?: string;
  name: string;
  userName?: string;
  nickname?: string;
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

export interface SettlementAccount {
  settlementAccountId?: number;
  settlementId?: number;
  linkedAccountId: number;
  accountStatus?: 'ACTIVE' | 'ENDED';
  bankName?: string;
  maskedAccountNumber?: string;
  accountHolderName?: string;
  selectedAt?: string | null;
}

export interface SettlementDetail {
  settlementId: number;
  title?: string;
  ownerName?: string;
  settlementCategory?: string;
  settlementType: SettlementType;
  settlementStatus: SettlementStatus;
  splitType?: SplitType;
  dueDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string | null;
  role: SettlementRole;
}

export interface PaymentObligation {
  paymentObligationId: number;
  participantId: number;
  participantName?: string;
  expectedAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  latestPaymentAt?: string | null;
  paymentStatus: PaymentStatus;
  obligationStatus?: ObligationStatus;
  overdueSince?: string | null;
}

export interface SettlementPaymentStatus {
  settlementId?: number;
  totalExpectedAmount?: number;
  totalPaidAmount?: number;
  totalRemainingAmount?: number;
  paidCount?: number;
  partiallyPaidCount?: number;
  unpaidCount?: number;
  progressRate?: number;
  closable?: boolean;
  obligations?: PaymentObligation[];
}

export interface SyncResult {
  appliedCount?: number;
  needsCheckCount?: number;
  unmatchedCount?: number;
}

export interface CurrentUser {
  name?: string;
  userName?: string;
}

export interface CreateSharedSettlementPayload {
  settlementCategory: string;
  title: string;
  dueDate: string;
  totalAmount: number;
  linkedAccountId: number;
  participants: Array<{ userToken: string }>;
}

export interface CreateRecurringSettlementPayload {
  settlementCategory: string;
  title: string;
  totalAmount: number;
  cycleRule: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  startDate: string;
  endDate: string | null;
  linkedAccountId: number;
  participants: Array<{ userToken: string }>;
}

export interface CreateSharedSettlementResponse {
  settlementId: number;
}

export interface CreateRecurringSettlementResponse {
  firstSettlementId: number;
  recurringSettlementId: number;
}
