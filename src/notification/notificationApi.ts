import { authFetch } from '../auth/authFetch';
import { isNotificationId } from './normalizeNotification';
import type { NotificationResponse } from './types';

function isNotification(value: unknown): value is NotificationResponse {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.notificationType === 'string' && typeof row.resolved === 'boolean'
    && ['notificationId', 'referenceId', 'secondaryReferenceId'].every(key => row[key] === null || isNotificationId(row[key]))
    && ['title', 'content', 'referenceTitle', 'referenceType', 'settlementType', 'relatedTransactionStatus', 'createdAt']
      .every(key => row[key] === null || typeof row[key] === 'string');
}

export async function fetchNotifications(signal?: AbortSignal): Promise<NotificationResponse[]> {
  const response = await authFetch('/api/notifications', {
    method: 'GET', headers: { Accept: 'application/json' }, signal,
  });
  if (!response.ok) throw new Error('알림을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
  const body: unknown = await response.json();
  signal?.throwIfAborted();
  if (!Array.isArray(body) || !body.every(isNotification)) {
    throw new Error('알림 응답 형식이 올바르지 않습니다. 다시 시도해 주세요.');
  }
  // Server order is intentional; never sort by timestamp or ID here.
  return body;
}
