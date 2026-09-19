import { useEffect, useRef, useState, type CSSProperties } from 'react';
import styles from '../IntroPage.module.css';

interface RevealTextProps {
  as: 'p' | 'h2';
  text: string;
  className?: string;
}

export default function RevealText({ as: Tag, text, className = '' }: RevealTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = ref.current;
    if (!target) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let observer: IntersectionObserver | undefined;
    let frame = 0;
    const reveal = () => {
      frame = requestAnimationFrame(() => setVisible(true));
      observer?.disconnect();
    };
    if (preference.matches || !('IntersectionObserver' in window)) {
      reveal();
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) reveal();
        },
        { threshold: 0.15 },
      );
      observer.observe(target);
    }
    const onPreference = () => {
      if (preference.matches) reveal();
    };
    preference.addEventListener('change', onPreference);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      preference.removeEventListener('change', onPreference);
    };
  }, []);

  return (
    <Tag className={`${className} ${visible ? styles['is-typing-in'] : ''}`}>
      <span className={styles.srOnly}>{text}</span>
      <span ref={ref} aria-hidden="true">
        {Array.from(text).map((letter, index) =>
          letter === '\n' ? (
            <br key={index} />
          ) : (
            <span
              key={index}
              className={styles['typing-character']}
              style={{ '--letter-delay': `${Math.min(index * 0.018, 1.4)}s` } as CSSProperties}
            >
              {letter}
            </span>
          ),
        )}
      </span>
    </Tag>
  );
}
