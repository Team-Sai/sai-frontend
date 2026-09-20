export interface CalendarDayMarker {
  date: string; 
  hasInbound: boolean;
  hasOutbound: boolean;
}

export type CalendarItemType = "LOAN" | "SETTLEMENT";

export interface CalendarItem {
  targetId: number;
  type: CalendarItemType;
  title: string;
  subLabel: string;
  amount: number;
  detailUrl: string;
  counterpartyName: string | null;
  categoryLabel: string | null;
  installmentInfo: string | null;
  overdue: boolean;
  maturityDate: string | null;
  principalAmount: number | null;
  interestRate: number | null;
  settlementTypeLabel: string | null;
  splitTypeLabel: string | null;
  periodStartDate: string | null;
  periodEndDate: string | null;
}