import { useEffect, useState } from 'react';

type LoadingSkeletonProps = {
  className?: string;
  rows?: number;
};

/** Shows an unobtrusive skeleton only when a request lasts longer than a brief delay. */
export default function LoadingSkeleton({
  className = '',
  rows = 3,
}: LoadingSkeletonProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 180);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      className={`loading-skeleton ${visible ? 'is-visible' : ''} ${className}`.trim()}
      role="status"
      aria-label={visible ? '불러오는 중입니다.' : undefined}
      aria-hidden={!visible}
    >
      {Array.from({ length: rows }, (_, index) => (
        <span className="loading-skeleton__line" key={index} />
      ))}
    </div>
  );
}
