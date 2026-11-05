import type { CSSProperties } from 'react';
import { useInView } from '../hooks/useInView';
import styles from './FeatureBento.module.css';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/**
 * 핵심 기능 외에 함께 챙겨주는 기능 세 가지.
 * 카드 안의 작은 화면은 기능을 설명하는 그림이다.
 */
export default function FeatureBento() {
  const [ref, inView] = useInView<HTMLElement>(0.15);

  return (
    <section
      ref={ref}
      className={`${styles.scene} ${inView ? styles.isIn : ''}`}
      aria-labelledby="extras-title"
    >
      <header className={styles.head}>
        <p className={styles.eyebrow}>그리고 이런 것도</p>
        <h2 id="extras-title">놓치기 쉬운 부분까지 챙겨요</h2>
      </header>

      <div className={styles.grid}>
        <article className={styles.card} style={{ '--c': 0 } as Vars}>
          <div className={styles.copy}>
            <p className={styles.tag}>안심거래진단</p>
            <h3>가족 간 거래, 세금부터 확인</h3>
            <p>국세청 기준 이자율과 비교해 증여로 볼 여지가 있으면 안전한 이자율을 바로 제안해요.</p>
          </div>
          <div className={styles.visual} aria-hidden="true">
            <div className={styles.rate}>
              <div className={styles.rateTop}>
                <span>총 차용금 3억 원</span>
                <em>세금 안전 범위</em>
              </div>
              <div className={styles.rateRail}>
                <span className={styles.rateSafe} />
                <span className={styles.rateKnob} />
              </div>
              <div className={styles.rateScale}>
                <span>0%</span>
                <span className={styles.rateLine}>안전 이자선 1.5%</span>
                <span>국세청 기준 4.6%</span>
              </div>
            </div>
          </div>
        </article>

        <article className={styles.card} style={{ '--c': 1 } as Vars}>
          <div className={styles.copy}>
            <p className={styles.tag}>보관함</p>
            <h3>끝난 약속도 기록으로 남아요</h3>
            <p>마감한 정산과 서명한 차용증을 한곳에 모아 두고, 필요할 때 PDF로 내려받아요.</p>
          </div>
          <div className={styles.visual} aria-hidden="true">
            <ul className={styles.archive}>
              <li style={{ '--r': 0 } as Vars}>
                <span className={styles.fileIcon}>PDF</span>
                <div>
                  <b>금전소비대차 계약서</b>
                  <small>한민엽 · 박채연 · 서명 완료</small>
                </div>
              </li>
              <li style={{ '--r': 1 } as Vars}>
                <span className={styles.fileIcon}>PDF</span>
                <div>
                  <b>제주 여행 회비 정산</b>
                  <small>4명 · 정산 마감</small>
                </div>
              </li>
            </ul>
          </div>
        </article>

        <article className={styles.card} style={{ '--c': 2 } as Vars}>
          <div className={styles.copy}>
            <p className={styles.tag}>알림</p>
            <h3>챙겨야 할 날은 먼저 알려줘요</h3>
            <p>정산 마감일, 차용증 상환일, 확인이 필요한 입금이 생기면 바로 알려드려요.</p>
          </div>
          <div className={styles.visual} aria-hidden="true">
            <ul className={styles.notices}>
              <li style={{ '--r': 0 } as Vars}>
                <i className={styles.dotRed} />
                차용증 상환일이 오늘이에요
              </li>
              <li style={{ '--r': 1 } as Vars}>
                <i className={styles.dotGreen} />
                정산 마감일이 오늘이에요
              </li>
              <li style={{ '--r': 2 } as Vars}>
                <i className={styles.dotAmber} />
                확인이 필요한 내역이 있어요
              </li>
            </ul>
          </div>
        </article>
      </div>
    </section>
  );
}
