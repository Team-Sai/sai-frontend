import type { TransactionStatus } from './types';

export const transactionStatusLabels: Readonly<Record<TransactionStatus, string>> = {
  PENDING: '처리 대기',
  APPLIED: '반영 완료',
  UNMATCHED: '미매칭',
  NEEDS_CHECK: '확인 필요',
  FAILED: '처리 실패',
};

const moneyFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 20 });
const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit',
});

export function formatMoney(amount: number): string {
  return Number.isFinite(amount) ? `${moneyFormatter.format(amount)}원` : '금액 미상';
}

export function formatTransactionDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '거래일시 미상' : dateFormatter.format(date);
}
