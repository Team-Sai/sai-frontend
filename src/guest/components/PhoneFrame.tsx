import type { ReactNode } from 'react';
import styles from './PhoneFrame.module.css';

interface PhoneFrameProps {
  children: ReactNode;
  className?: string;
}

/** 소개 페이지에서 앱 화면을 보여줄 때 쓰는 휴대폰 목업. 장식용이라 보조기기에는 숨긴다. */
export default function PhoneFrame({ children, className = '' }: PhoneFrameProps) {
  return (
    <div className={`${styles.phone} ${className}`} aria-hidden="true">
      <div className={styles.screen}>
        <div className={styles.status}>
          <span>9:41</span>
          <span className={styles.island} />
          <span className={styles.icons}>
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
