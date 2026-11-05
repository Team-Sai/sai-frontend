import type { ReactNode } from 'react';
import styles from './BrowserFrame.module.css';

interface BrowserFrameProps {
  children: ReactNode;
  /** 주소창에 보일 경로 */
  path?: string;
  className?: string;
  tone?: 'light' | 'dark';
}

/** 웹 화면 캡처를 감싸는 브라우저 창 틀. 장식용 틀이라 주소창은 보조기기에 숨긴다. */
export default function BrowserFrame({
  children,
  path = '/contracts/new',
  className = '',
  tone = 'light',
}: BrowserFrameProps) {
  return (
    <div className={`${styles.frame} ${styles[tone]} ${className}`}>
      <div className={styles.bar} aria-hidden="true">
        <span className={styles.dots}>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.url}>saiwonjang.shinhanacademy.co.kr{path}</span>
      </div>
      <div className={styles.view}>{children}</div>
    </div>
  );
}
