import type { CSSProperties } from 'react';
import { useScrollScene } from '../hooks/useScrollScene';
import styles from './StatementScene.module.css';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const LINES: { text: string; accent?: boolean }[] = [
  { text: '가까운 사이일수록' },
  { text: '돈 얘기는 꺼내기 어렵죠.' },
  { text: '누가 얼마를 냈는지, 언제 갚기로 했는지' },
  { text: '이제 사이원장이 대신 기억할게요.', accent: true },
];

const FULL_TEXT = LINES.map((line) => line.text).join(' ');

/** 스크롤에 맞춰 문장이 한 단어씩 진하게 차오르는 장면 */
export default function StatementScene() {
  const ref = useScrollScene<HTMLElement>();
  const total = LINES.reduce((sum, line) => sum + line.text.split(' ').length, 0);
  let index = 0;

  return (
    <section ref={ref} className={styles.scene} style={{ '--n': total } as Vars}>
      <div className={styles.stage}>
        <p className={styles.srOnly}>{FULL_TEXT}</p>
        <p className={styles.text} aria-hidden="true">
          {LINES.map((line) => (
            <span key={line.text} className={`${styles.line} ${line.accent ? styles.accent : ''}`}>
              {line.text.split(' ').map((word) => {
                const wordIndex = index++;
                return (
                  <span key={wordIndex} className={styles.word} style={{ '--i': wordIndex } as Vars}>
                    {word}{' '}
                  </span>
                );
              })}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
