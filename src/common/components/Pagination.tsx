import { Button } from './Button';
import styles from './Pagination.module.css';

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
  ariaLabel?: string;
  className?: string;
};

/** 이전 · 현재 / 전체 · 다음 형태의 공통 페이지네이션. 페이지가 1개여도 항상 표시한다. */
export function Pagination({
  currentPage, totalPages, onChange, ariaLabel = '페이지 이동', className = '',
}: PaginationProps) {
  const total = Math.max(1, totalPages);
  const current = Math.min(Math.max(1, currentPage), total);
  return (
    <nav className={`${styles.pagination} ${className}`} aria-label={ariaLabel}>
      <Button variant="secondary" controlSize="sm" disabled={current <= 1}
        onClick={() => onChange(current - 1)}>
        이전
      </Button>
      <span className={styles.label} aria-current="page">
        {current} / {total}
      </span>
      <Button variant="secondary" controlSize="sm" disabled={current >= total}
        onClick={() => onChange(current + 1)}>
        다음
      </Button>
    </nav>
  );
}
