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
  statusTone: 'success' | 'neutral' | 'error';
}
