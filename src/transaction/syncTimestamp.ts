const STORAGE_KEY = 'sai:last-transaction-sync-at';

export function clearTransactionSync(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be unavailable in restricted browser environments.
  }
}

export function getLastTransactionSyncAt(): string | null {
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    return value && Number.isFinite(new Date(value).getTime()) ? value : null;
  } catch {
    return null;
  }
}

export function recordTransactionSync(): string {
  const value = new Date().toISOString();
  try {
    window.sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // The current page can still show the timestamp when browser storage is unavailable.
  }
  return value;
}

export function formatTransactionSyncTime(value: string | null): string {
  if (!value) return '기록 없음';
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(date)
    : '기록 없음';
}
