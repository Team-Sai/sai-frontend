import type { TransactionStatus } from './types';

export const transactionStatusLabels: Readonly<Record<TransactionStatus, string>> = {
  PENDING: '처리 대기',
  APPLIED: '반영 완료',
  UNMATCHED: '미매칭',
  NEEDS_CHECK: '확인 필요',
  FAILED: '처리 실패',
};

const moneyFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 20 });
const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit', minute: '2-digit',
});

export function formatMoney(amount: number): string {
  return Number.isFinite(amount) ? `${moneyFormatter.format(amount)}원` : '금액 미상';
}

export function formatTransactionDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '거래일시 미상';
  const dateLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return `${dateLabel} ${timeFormatter.format(date)}`;
}
