import { authFetch } from '../auth/authFetch';
import type { TransactionPage, IntegratedTransactionStatus, IntegratedTransactionType } from './integratedTypes';

export interface IntegratedTransactionQuery {
  linkedAccountId?: number;
  transactionType?: IntegratedTransactionType;
  processingStatus?: IntegratedTransactionStatus;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
}

export async function getIntegratedTransactions(query: IntegratedTransactionQuery = {}, signal?: AbortSignal): Promise<TransactionPage> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const response = await authFetch(`/api/linked-accounts/transactions?${params.toString()}`, {
    method: 'GET', headers: { Accept: 'application/json' }, signal,
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string'
      ? body.message : '거래내역을 불러오지 못했습니다.';
    throw new Error(message);
  }
  if (!body || typeof body !== 'object' || !('content' in body) || !Array.isArray(body.content)
      || !('totalCount' in body) || typeof body.totalCount !== 'number'
      || !('totalPages' in body) || typeof body.totalPages !== 'number'
      || !('page' in body) || typeof body.page !== 'number'
      || !('size' in body) || typeof body.size !== 'number'
      || !('hasNext' in body) || typeof body.hasNext !== 'boolean'
      || !('hasPrevious' in body) || typeof body.hasPrevious !== 'boolean') {
    throw new Error('거래내역 응답 형식이 올바르지 않습니다.');
  }
  return body as TransactionPage;
}
