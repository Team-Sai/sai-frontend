import type { CSSProperties } from 'react';
import { useInView } from '../hooks/useInView';
import styles from './SafetyScene.module.css';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const TRANSACTIONS = [
  { who: '이영희', what: '여행 회비 입금', amount: '+210,000원' },
  { who: '김신한', what: '차용금 상환', amount: '+500,000원' },
  { who: '처음 보는 계좌', what: '송금 요청', amount: '−3,000,000원', flagged: true },
  { who: '이몽룡', what: '여행 회비 입금', amount: '+80,000원' },
];

const SIGNALS = ['평소보다 큰 금액', '처음 거래하는 계좌', '짧은 시간 반복 요청'];

const LEGAL_CHECKS = [
  { title: '이자율 연 5.0%', note: '이자제한법 최고이자율 이내', status: '안전' },
  { title: '지연이자 연 5.0%', note: '법정 한도 이내', status: '안전' },
  { title: '상환일 2028. 05. 20', note: '분할 상환일과 만기일을 다시 확인해 주세요', status: '확인 필요', warn: true },
];

/** FDS(이상거래탐지), 가족 간 증여세 진단, 계약 조건 법령 검토를 한 화면에 모아 보여준다. */
export default function SafetyScene() {
  const [ref, inView] = useInView<HTMLElement>(0.25);

  return (
    <section
      id="safety"
      ref={ref}
      className={`${styles.scene} ${inView ? styles.isIn : ''}`}
      aria-labelledby="safety-title"
    >
      <header className={styles.head}>
        <p className={styles.eyebrow}>안심거래</p>
        <h2 id="safety-title">
          거래 전에도, 거래 후에도
          <br />
          위험 신호는 먼저 알려드려요
        </h2>
        <p className={styles.description}>
          수상한 거래는 걸러내고, 놓치기 쉬운 세금과 법적 한도는 미리 짚어드려요.
        </p>
      </header>

      <div className={styles.grid}>
        {/* FDS */}
        <article className={`${styles.card} ${styles.fds}`} style={{ '--c': 0 } as Vars}>
          <div className={styles.cardHead}>
            <p className={styles.tag}>
              <span>NEW</span> 이상거래탐지 FDS
            </p>
            <h3>평소와 다른 거래는 바로 잡아내요</h3>
            <p className={styles.cardText}>
              거래 패턴을 실시간으로 살펴보다가 의심스러운 신호가 보이면 돈이 오가기 전에 알려드려요.
            </p>
          </div>

          <div className={styles.fdsBody} aria-hidden="true">
            <div className={styles.feed}>
              <span className={styles.beam} />
              {TRANSACTIONS.map((tx, index) => (
                <div
                  key={tx.who}
                  className={`${styles.tx} ${tx.flagged ? styles.flagged : ''}`}
                  style={{ '--r': index } as Vars}
                >
                  <span className={styles.txIcon} />
                  <div>
                    <b>{tx.who}</b>
                    <small>{tx.what}</small>
                  </div>
                  <strong>{tx.amount}</strong>
                  {tx.flagged && <em className={styles.flag}>의심 거래</em>}
                </div>
              ))}
            </div>

            <div className={styles.alert}>
              <div className={styles.gauge}>
                <svg viewBox="0 0 120 70">
                  <path className={styles.track} d="M10 62a50 50 0 0 1 100 0" />
                  <path className={styles.value} d="M10 62a50 50 0 0 1 100 0" />
                </svg>
                <b>82</b>
                <small>위험도</small>
              </div>
              <div className={styles.signals}>
                <p>이런 신호를 감지했어요</p>
                {SIGNALS.map((signal, index) => (
                  <span key={signal} style={{ '--r': index } as Vars}>
                    {signal}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </article>

        {/* 증여세 진단 */}
        <article className={`${styles.card} ${styles.tax}`} style={{ '--c': 1 } as Vars}>
          <div className={styles.cardHead}>
            <p className={styles.tag}>가족 간 증여세 진단</p>
            <h3>이자 하나로 세금이 달라져요</h3>
            <p className={styles.cardText}>
              국세청 기준 이자율과 비교해 증여로 볼 여지가 있으면 안전한 이자율을 바로 제안해요.
            </p>
          </div>
          <div className={styles.taxBody} aria-hidden="true">
            <div className={styles.taxTop}>
              <span>총 차용금 3억 원</span>
              <span className={styles.badges}>
                <em className={styles.danger}>증여세 과세 위험</em>
                <em className={styles.safe}>세금 안전 범위</em>
              </span>
            </div>
            <div className={styles.slider}>
              <div className={styles.rail}>
                <span className={styles.safeZone} />
                <span className={styles.knob}>
                  <b className={styles.rateLow}>1.0%</b>
                  <b className={styles.rateHigh}>1.5%</b>
                </span>
              </div>
              <div className={styles.scale}>
                <span>0%</span>
                <span>안전 이자선 1.5%</span>
                <span>국세청 기준 4.6%</span>
              </div>
            </div>
          </div>
        </article>

        {/* 법령 검토 */}
        <article className={`${styles.card} ${styles.legal}`} style={{ '--c': 2 } as Vars}>
          <div className={styles.cardHead}>
            <p className={styles.tag}>계약 조건 법령 검토</p>
            <h3>서명 전에 한 번 더 확인해요</h3>
          </div>
          <ul className={styles.checks}>
            {LEGAL_CHECKS.map((check, index) => (
              <li key={check.title} style={{ '--r': index } as Vars}>
                <div>
                  <b>{check.title}</b>
                  <small>{check.note}</small>
                </div>
                <em className={check.warn ? styles.warn : ''}>{check.status}</em>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
