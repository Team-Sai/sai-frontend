import { useState, type CSSProperties } from 'react';
import AppImage from '../../common/components/AppImage';
import { useInView } from '../hooks/useInView';
import styles from './SaibankScene.module.css';

type Vars = CSSProperties & Record<`--${string}`, string | number>;
type RuleId = 'R01' | 'R02' | 'R03' | 'R04';

/** 사이뱅크 FDS의 네 가지 탐지 규칙. 점수는 FdsRuleService 상수와 같다. */
const RULES: { id: RuleId; name: string; detail: string; score: number }[] = [
  { id: 'R01', name: '소액 쪼개기 송금', detail: '5분 안에 1,000원 이하를 20번 이상, 5개 이상 계좌로', score: 40 },
  { id: 'R02', name: '입금 직후 여러 계좌로 분산', detail: '100만 원 이상 입금 후 10분 안에 3개 이상 계좌로 80% 이상', score: 50 },
  { id: 'R03', name: '한 계좌로 반복 송금', detail: '5분 안에 같은 계좌로 15번 이상', score: 30 },
  { id: 'R04', name: '해외 IP에서 접속', detail: '송금 요청이 해외에서 들어온 경우', score: 90 },
];

interface Scenario {
  label: string;
  request: string;
  matched: RuleId[];
  /** R02와 함께 볼 때만 의미가 있는 복합 위험 신호 */
  newAccounts?: boolean;
  surge?: boolean;
}

const SCENARIOS: Scenario[] = [
  { label: '평소 송금', request: '친구에게 여행 회비 210,000원 보내기', matched: [] },
  { label: '소액 쪼개기', request: '5분 사이 1,000원 이하 송금이 20번째, 받는 계좌는 5곳째', matched: ['R01'] },
  {
    label: '입금 직후 분산',
    request: '200만 원이 들어온 지 10분 안에 처음 보는 3개 계좌로 170만 원 송금',
    matched: ['R02'],
    newAccounts: true,
    surge: true,
  },
  { label: '해외 접속', request: '해외 IP에서 300만 원 송금 요청', matched: ['R04'] },
];

/** FdsRiskCalculator와 같은 계산 */
function riskScore({ matched, newAccounts, surge }: Scenario) {
  const has = (id: RuleId) => matched.includes(id);
  if (has('R04')) return 90;
  if (has('R02') && newAccounts && surge) return 90;
  const p1 = Math.max(has('R01') ? 40 : 0, has('R03') ? 30 : 0);
  const p2 = has('R02') ? 50 : 0;
  return Math.min(59, p1 + p2);
}

/* LOW/MEDIUM 경계값은 FdsRiskCalculator의 등급 기준과 맞춰 주세요. HIGH는 60점 이상이다. */
function riskLevel(score: number) {
  if (score >= 60) return { key: 'high', grade: '높음', action: '송금을 잠시 멈추고 담당자가 확인해요' };
  if (score >= 30) return { key: 'mid', grade: '중간', action: '송금은 진행하고 기록을 남겨요' };
  return { key: 'low', grade: '낮음', action: '바로 송금돼요' };
}

/**
 * 사이원장과 연계된 사이뱅크의 이상거래탐지(FDS) 소개.
 * 사이원장 자체 기능이 아니라는 점이 보이도록 사이뱅크 브랜드 색으로 구분한다.
 */
export default function SaibankScene() {
  const [ref, inView] = useInView<HTMLElement>(0.15);
  const [selected, setSelected] = useState(2);
  const scenario = SCENARIOS[selected];
  const score = riskScore(scenario);
  const level = riskLevel(score);

  return (
    <section
      id="saibank"
      ref={ref}
      className={`${styles.scene} ${inView ? styles.isIn : ''}`}
      aria-labelledby="saibank-title"
    >
      <div className={styles.inner}>
        <header className={styles.head}>
          <div className={styles.brand}>
            <AppImage src="/images/guest/landing/saibank-logo.png" alt="사이뱅크" width={119} height={44} />
            <span>연계 서비스</span>
          </div>
          <h2 id="saibank-title">
            사이뱅크 계좌로 송금할 땐
            <br />
            이상거래탐지가 한 번 더 지켜요
          </h2>
          <p className={styles.description}>
            사이원장과 연결된 사이뱅크는 송금 요청이 들어오는 순간 최근 거래 흐름과 접속 위치를 네 가지
            규칙으로 확인해요. 위험이 높으면 송금을 잠시 멈추고 담당자가 직접 확인한 뒤 결과를 바로
            알려드려요.
          </p>
        </header>

        <div className={styles.body}>
          <div className={styles.scenarios} role="radiogroup" aria-label="송금 상황 고르기">
            <p className={styles.pickLabel}>상황을 골라 보세요</p>
            {SCENARIOS.map((item, index) => (
              <button
                key={item.label}
                type="button"
                role="radio"
                aria-checked={selected === index}
                className={`${styles.scenario} ${selected === index ? styles.active : ''}`}
                onClick={() => setSelected(index)}
              >
                <b>{item.label}</b>
                <span>{item.request}</span>
              </button>
            ))}
          </div>

          <div
            className={`${styles.panel} ${styles[level.key]}`}
            style={{ '--score': score } as Vars}
            aria-live="polite"
          >
            <p className={styles.request}>
              <small>송금 요청</small>
              {scenario.request}
            </p>

            <ul className={styles.rules}>
              {RULES.map((rule) => {
                const hit = scenario.matched.includes(rule.id);
                return (
                  <li key={rule.id} className={hit ? styles.hit : ''}>
                    <span className={styles.ruleMark}>{hit ? '!' : ''}</span>
                    <div>
                      <b>{rule.name}</b>
                      <small>{rule.detail}</small>
                    </div>
                    <em>{hit ? `+${rule.score}` : '해당 없음'}</em>
                  </li>
                );
              })}
            </ul>

            {scenario.newAccounts && scenario.surge && (
              <p className={styles.combo}>
                처음 보내는 계좌 3곳 이상 + 송금 빈도 급증이 겹쳐 <b>복합 위험</b>으로 판단했어요
              </p>
            )}

            <div className={styles.meter}>
              <div className={styles.meterHead}>
                <span>위험 점수</span>
                <strong>
                  {score}
                  <small>/100</small>
                </strong>
              </div>
              <div className={styles.track}>
                <i />
                <span className={styles.line} title="60점 이상이면 담당자 확인" />
              </div>
              <div className={styles.scale}>
                <span>0</span>
                <span className={styles.reviewMark}>60점부터 담당자 확인</span>
                <span>100</span>
              </div>
            </div>

            <div className={styles.result}>
              <span className={styles.grade}>위험 {level.grade}</span>
              <b>{level.action}</b>
            </div>

            {level.key === 'high' && (
              <ol className={styles.flow}>
                <li>송금 보류</li>
                <li>담당자 확인</li>
                <li>승인 또는 거절</li>
                <li>결과 실시간 알림</li>
              </ol>
            )}
          </div>
        </div>

        <p className={styles.footnote}>
          이상거래탐지는 사이원장이 아닌 사이뱅크의 기능으로, 사이뱅크 계좌를 연결해 송금할 때 적용돼요.
        </p>
      </div>
    </section>
  );
}
