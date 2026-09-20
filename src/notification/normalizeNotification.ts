import type { NotificationDestination, NotificationResponse, NotificationView } from './types';

export function isNotificationId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export function formatNotificationTime(dateString: string | null, now: number): string {
  if (!dateString) return '';
  const timestamp = new Date(dateString).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const minutes = Math.floor(Math.max(now - timestamp, 0) / 60_000);
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)}일 전`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)}시간 전`;
  return minutes > 0 ? `${minutes}분 전` : '방금 전';
}

/** Centralize legacy URLs until their React destinations are implemented. */
export function getNotificationDestination(n: NotificationResponse): NotificationDestination | null {
  if (!isNotificationId(n.notificationId)) return null;
  const destination = (url: string, label: string, available = false): NotificationDestination => ({ url, label, available });
  if (n.notificationType === 'CONTRACT_REQUESTED' && isNotificationId(n.referenceId)) {
    return destination(`/contracts/${n.referenceId}/approve`, '서명하러 가기');
  }
  if (n.notificationType === 'CONTRACT_CHANGE' && isNotificationId(n.referenceId)) {
    return isNotificationId(n.secondaryReferenceId)
      ? destination(`/contracts/${n.referenceId}/change-requests/${n.secondaryReferenceId}`, '변경 요청 확인하기', true)
      : destination(`/contracts/${n.referenceId}/contract-detail`, '계약서 보기', true);
  }
  const isDue = ['SETTLEMENT_DUE_REMINDER_D3', 'SETTLEMENT_DUE_REMINDER_D1', 'SETTLEMENT_DUE_REMINDER_DDAY'].includes(n.notificationType);
  if (isDue || n.notificationType === 'SETTLEMENT_PARTICIPANT_ADDED') {
    const id = isDue ? n.secondaryReferenceId
      : n.referenceType === 'SETTLEMENT' ? n.referenceId : n.secondaryReferenceId;
    if (isNotificationId(id)) return destination(`/settlements/${id}`, '정산 보기');
  }
  return null;
}

/** Pure: callers supply the clock, and React escapes the returned plain text. */
export function normalizeNotification(n: NotificationResponse, now: number): NotificationView {
  const isSign = n.notificationType === 'CONTRACT_REQUESTED' || n.notificationType === 'CONTRACT_CHANGE';
  const isSettlement = ['SETTLEMENT_DUE_REMINDER_D3', 'SETTLEMENT_DUE_REMINDER_D1',
    'SETTLEMENT_DUE_REMINDER_DDAY', 'SETTLEMENT_PARTICIPANT_ADDED'].includes(n.notificationType);
  const category = isSign ? 'SIGN' : isSettlement ? 'SETTLEMENT' : 'SYSTEM';
  const participantAdded = n.notificationType === 'SETTLEMENT_PARTICIPANT_ADDED';
  const isReview = n.notificationType === 'BANK_TRANSACTION_MATCHING_REVIEW';
  const status = n.relatedTransactionStatus;
  const terminal = status === 'APPLIED' || status === 'UNMATCHED' || status === 'FAILED';
  const statusLabel = !isReview ? null : status === 'APPLIED' ? '반영 완료'
    : status === 'UNMATCHED' ? '미매칭' : status === 'FAILED' ? '처리 실패'
      : n.resolved ? '검토 종료' : null;

  return {
    id: n.notificationId,
    category,
    categoryLabel: isSign ? '차용증' : !isSettlement ? '공지사항'
      : n.settlementType === 'RECURRING' ? '정기정산' : n.settlementType === 'SHARED' ? '공동정산' : '정산',
    title: n.referenceTitle || (participantAdded ? '새로운 정산에 참여자로 등록되었습니다.' : n.title || ''),
    description: participantAdded ? '참여자로 등록되었습니다.' : n.content || '',
    timeLabel: formatNotificationTime(n.createdAt, now),
    createdAt: n.createdAt && Number.isFinite(new Date(n.createdAt).getTime()) ? n.createdAt : null,
    destination: getNotificationDestination(n),
    reviewSource: isReview && !n.resolved && !terminal && isNotificationId(n.notificationId)
      && isNotificationId(n.referenceId) && isNotificationId(n.secondaryReferenceId)
      ? { kind: 'transaction', bankTransactionId: n.referenceId, linkedAccountId: n.secondaryReferenceId }
      : null,
    statusLabel,
    statusTone: statusLabel && status === 'FAILED' ? 'error' : statusLabel && status === 'APPLIED' ? 'success' : 'neutral',
  };
}
