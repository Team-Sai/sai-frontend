import type { MatchingReviewSource } from '../matching/types';

export type NotificationCategory = 'ALL' | 'SIGN' | 'SETTLEMENT' | 'SYSTEM';

/** GET /api/notifications (NotificationResponse). Unknown types remain SYSTEM. */
export interface NotificationResponse {
  notificationId: number | null;
  notificationType: string;
  title: string | null;
  content: string | null;
  referenceId: number | null;
  secondaryReferenceId: number | null;
  referenceTitle: string | null;
  referenceType: string | null;
  settlementType: string | null;
  relatedTransactionStatus: string | null;
  resolved: boolean;
  createdAt: string | null;
}

export interface NotificationDestination {
  url: string;
  label: string;
  available: boolean;
  /** 이동 전에 저장된 본인인증 결과를 비워 새로 인증받게 한다. */
  resetIdentity?: boolean;
}

export interface NotificationView {
  id: number | null;
  category: Exclude<NotificationCategory, 'ALL'>;
  categoryLabel: string;
  title: string;
  description: string;
  timeLabel: string;
  createdAt: string | null;
  destination: NotificationDestination | null;
  reviewSource: MatchingReviewSource | null;
  statusLabel: string | null;
  statusTone: 'success' | 'neutral' | 'failed';
}
