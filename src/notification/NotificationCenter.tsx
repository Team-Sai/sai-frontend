import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent, SyntheticEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../common/components/Button';
import MatchingReviewModal from '../matching/MatchingReviewModal';
import type { MatchingReviewSource } from '../matching/types';
import { fetchNotifications } from './notificationApi';
import { normalizeNotification } from './normalizeNotification';
import type { NotificationCategory, NotificationView } from './types';
import styles from './NotificationCenter.module.css';

const categories: { value: NotificationCategory; label: string }[] = [
  { value: 'ALL', label: '전체' }, { value: 'SIGN', label: '서명·계약' },
  { value: 'SETTLEMENT', label: '정산' }, { value: 'SYSTEM', label: '시스템' },
];

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationView[] | null>(null);
  const [category, setCategory] = useState<NotificationCategory>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [source, setSource] = useState<MatchingReviewSource | null>(null);
  const request = useRef<{ id: number; controller: AbortController | null }>({ id: 0, controller: null });

  const refresh = useCallback(async () => {
    request.current.controller?.abort();
    const controller = new AbortController();
    const id = ++request.current.id;
    request.current.controller = controller;
    const current = () => !controller.signal.aborted && request.current.id === id;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchNotifications(controller.signal);
      if (!current()) return;
      const now = Date.now();
      setNotifications(rows.map(row => normalizeNotification(row, now)));
    } catch (cause) {
      if (!current()) return;
      setError(cause instanceof Error ? cause.message : '알림을 불러오지 못했습니다.');
    } finally {
      if (current()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const activeRequest = request.current;
    let disposed = false;
    // Defer the initial read; StrictMode cleanup cancels its first setup.
    queueMicrotask(() => {
      if (!disposed) void refresh();
    });
    return () => {
      disposed = true;
      activeRequest.controller?.abort();
      ++activeRequest.id;
    };
  }, [refresh]);

  // A failed read after a successful modal action is a page refresh error.
  // refresh handles that error and resolves, so it cannot mark the action failed.
  const handleStateChanged = useCallback(async () => {
    await refresh();
  }, [refresh]);

  function showComingSoon(event: SyntheticEvent) {
    event.preventDefault();
    setNotice('준비 중입니다. 계약·정산 상세 화면은 추후 제공됩니다.');
  }

  function preventAuxiliaryNavigation(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0) showComingSoon(event);
  }

  const filtered = notifications?.filter(item => category === 'ALL' || item.category === category) ?? [];

  return (
    <section className={styles.page} aria-labelledby="notification-heading">
      <header>
        <h1 id="notification-heading" className={styles.heading}>알림센터</h1>
        <p className={styles.subtitle}>계약과 정산 등 최근 발생한 중요 소식을 한눈에 확인하세요.</p>
      </header>
      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="알림 분류">
          {categories.map(item => (
            <Button key={item.value} variant="secondary" className={`${styles.filter} ${category === item.value ? styles.active : ''}`}
              aria-pressed={category === item.value} onClick={() => setCategory(item.value)}>
              {item.label}
            </Button>
          ))}
        </div>
        <Button variant="secondary" isLoading={loading} onClick={() => void refresh()}>
          새로고침
        </Button>
      </div>
      <div role="status" aria-live="polite" className={notice ? styles.notice : undefined}>{notice}</div>
      {error && (
        <div role="alert" className={styles.error}>
          <p>{error}{notifications !== null && ' 기존 알림을 표시하고 있습니다.'}</p>
          <Button variant="secondary" onClick={() => void refresh()}>다시 시도</Button>
        </div>
      )}
      {notifications === null && loading && <p className={styles.empty} role="status">알림을 불러오는 중입니다.</p>}
      {notifications !== null && (
        <ul className={styles.list} aria-label="알림 목록" aria-busy={loading}>
          {filtered.length === 0 && <li className={styles.empty}>{notifications.length === 0 ? '아직 도착한 알림이 없습니다.' : '해당 알림이 없습니다.'}</li>}
          {filtered.map((item, index) => (
            <li key={item.id ?? `missing-${index}`} className={styles.card}>
              <div className={styles.row}>
                <span className={`${styles.badge} ${styles[item.category]}`}>{item.categoryLabel}</span>
                <h2 className={styles.title}>
                  {item.destination ? (
                    <Link to={item.destination.url} className={styles.link} aria-label={`${item.title} — ${item.destination.label}${item.destination.available ? '' : ' (준비 중)'}`}
                      onClick={item.destination.available ? undefined : showComingSoon}
                      onAuxClick={item.destination.available ? undefined : preventAuxiliaryNavigation}
                      onContextMenu={item.destination.available ? undefined : showComingSoon}
                      onDragStart={item.destination.available ? undefined : showComingSoon} draggable={item.destination.available}>
                      {item.title || item.destination.label}
                    </Link>
                  ) : item.title}
                </h2>
                <p className={styles.description}>{item.description}</p>
                {item.createdAt && <time className={styles.time} dateTime={item.createdAt}>{item.timeLabel}</time>}
              </div>
              {item.reviewSource && <Button className={styles.review} onClick={() => setSource(item.reviewSource)}>매칭 확인하기</Button>}
              {item.statusLabel && <span className={`${styles.status} ${styles[item.statusTone]}`}>{item.statusLabel}</span>}
            </li>
          ))}
        </ul>
      )}
      {source && <MatchingReviewModal open source={source} onClose={() => setSource(null)} onStateChanged={handleStateChanged} />}
    </section>
  );
}
