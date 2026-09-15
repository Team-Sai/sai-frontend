import { authFetch } from '../../auth/authFetch';
import type {
  LinkedSettlementAccount,
  ParticipantLookup,
  SettlementDetail,
  SettlementListItem,
  SettlementPaymentStatus,
  SettlementSummary,
  SyncResult,
} from '../types/settlement';

async function readBody(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { message: text }; }
}

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await authFetch(url, options);
  const body = await readBody(response);
  if (!response.ok) {
    throw new Error(body?.message || `요청 처리에 실패했습니다. (HTTP ${response.status})`);
  }
  return body as T;
}

export const settlementApi = {
  list: () => requestJson<SettlementListItem[]>('/api/settlements'),
  summary: () => requestJson<SettlementSummary>('/api/settlements/summary'),
  detail: (id: number) => requestJson<SettlementDetail>(`/api/settlements/${id}`),
  paymentStatus: (id: number) => requestJson<SettlementPaymentStatus>(`/api/settlements/${id}/payment-status`),
  account: async (id: number): Promise<LinkedSettlementAccount | null> => {
    const response = await authFetch(`/api/settlements/${id}/account`);
    if (response.status === 404) return null;
    const body = await readBody(response);
    if (!response.ok) throw new Error(body?.message || '수취 계좌 조회에 실패했습니다.');
    return body;
  },
  linkedAccounts: () => requestJson<LinkedSettlementAccount[]>('/api/linked-accounts'),
  lookupParticipant: (token: string) => requestJson<ParticipantLookup>(`/api/users/by-token/${encodeURIComponent(token)}`),
  currentUser: () => requestJson<any>('/api/users/me'),
  createShared: (payload: unknown) => requestJson<any>('/api/settlements/shared', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }),
  createRecurring: (payload: unknown) => requestJson<any>('/api/settlements/recurring', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }),
  close: (id: number) => requestJson<any>(`/api/settlements/${id}/close`, { method: 'POST' }),
  syncAll: () => requestJson<SyncResult>('/api/transactions/sync', { method: 'POST' }),
  syncAccount: (linkedAccountId: number) => requestJson<SyncResult>(`/api/linked-accounts/${linkedAccountId}/sync`, { method: 'POST' }),
};
