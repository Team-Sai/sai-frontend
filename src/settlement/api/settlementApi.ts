import { authFetch } from '../../auth/authFetch';
import type {
  CreateRecurringSettlementPayload,
  CreateRecurringSettlementResponse,
  CreateSharedSettlementPayload,
  CreateSharedSettlementResponse,
  CurrentUser,
  LinkedSettlementAccount,
  ParticipantLookup,
  SettlementAccount,
  SettlementDetail,
  SettlementListItem,
  SettlementPaymentStatus,
  SettlementSummary,
  SyncResult,
} from '../types/settlement';

type ApiEnvelope<T> = T | { data: T };

async function readBody(response: Response): Promise<any> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function requestJson<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await authFetch(url, options);
  const body = await readBody(response);

  if (!response.ok) {
    throw new Error(
      body?.message || `요청 처리에 실패했습니다. (HTTP ${response.status})`,
    );
  }

  return body as T;
}

async function requestOptionalJson<T>(
  url: string,
  options: RequestInit = {},
): Promise<T | null> {
  const response = await authFetch(url, options);

  if (response.status === 404) {
    return null;
  }

  const body = await readBody(response);

  if (!response.ok) {
    throw new Error(
      body?.message || `요청 처리에 실패했습니다. (HTTP ${response.status})`,
    );
  }

  return body as T;
}

export const settlementApi = {
  list: () =>
    requestJson<SettlementListItem[]>('/api/settlements'),

  summary: () =>
    requestJson<SettlementSummary>('/api/settlements/summary'),

  detail: (id: number) =>
    requestJson<SettlementDetail>(`/api/settlements/${id}`),

  paymentStatus: (id: number) =>
    requestJson<SettlementPaymentStatus>(
      `/api/settlements/${id}/payment-status`,
    ),

  account: (id: number) =>
    requestOptionalJson<SettlementAccount>(
      `/api/settlements/${id}/account`,
    ),

  linkedAccounts: () =>
    requestJson<ApiEnvelope<LinkedSettlementAccount[]>>(
      '/api/linked-accounts',
    ),

  lookupParticipant: (token: string) =>
    requestJson<ParticipantLookup>(
      `/api/users/by-token/${encodeURIComponent(token)}`,
    ),

  currentUser: () =>
    requestJson<CurrentUser>('/api/users/me'),

  createShared: (payload: CreateSharedSettlementPayload) =>
    requestJson<CreateSharedSettlementResponse>(
      '/api/settlements/shared',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    ),

  createRecurring: (payload: CreateRecurringSettlementPayload) =>
    requestJson<CreateRecurringSettlementResponse>(
      '/api/settlements/recurring',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    ),

  close: (id: number) =>
    requestJson<void>(
      `/api/settlements/${id}/close`,
      {
        method: 'POST',
      },
    ),

  syncAll: () =>
    requestJson<SyncResult>(
      '/api/transactions/sync',
      {
        method: 'POST',
      },
    ),
};
