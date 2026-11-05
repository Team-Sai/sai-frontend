import type { CSSProperties } from 'react';
import AppImage from '../../common/components/AppImage';
import BrowserFrame from '../components/BrowserFrame';
import { useScrollScene } from '../hooks/useScrollScene';
import styles from './HeroScene.module.css';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const CARDS = [
  { key: 'tl', src: '/images/guest/settlement.avif', label: '정산', w: 288, h: 231 },
  { key: 'bl', src: '/images/guest/loan-agreement.avif', label: '금전소비대차', w: 360, h: 289 },
  { key: 'tr', src: '/images/guest/safety-diagnosis.avif', label: '안심거래진단', w: 324, h: 260 },
  { key: 'br', src: '/images/guest/schedule.avif', label: '거래일정', w: 265, h: 216 },
] as const;

/**
 * 첫 화면. 스크롤을 내리면
 * 1) 헤드라인이 흐려지며 물러나고
 * 2) 네 모서리의 사진 카드가 가운데로 빨려 들어가고
 * 3) 아래에서 차용증 작성 화면이 떠오르며 두 번째 문장이 나타난다.
 */
export default function HeroScene() {
  const ref = useScrollScene<HTMLElement>();

  return (
    <section id="intro" ref={ref} className={styles.scene} aria-labelledby="intro-title">
      <div className={styles.stage}>
        <div className={styles.blobs} aria-hidden="true">
          <span className={styles.blobA} />
          <span className={styles.blobB} />
          <span className={styles.blobC} />
          <span className={styles.blobD} />
        </div>

        {CARDS.map((card, index) => (
          <div
            key={card.key}
            className={`${styles.card} ${styles[card.key]}`}
            style={{ '--i': index } as Vars}
            aria-hidden="true"
          >
            <div className={styles.cardInner}>
              <AppImage src={card.src} alt="" width={card.w} height={card.h} />
              <span>{card.label}</span>
            </div>
          </div>
        ))}

        <div className={styles.copy}>
          <h1 id="intro-title">
            당신의 거래는 어떤
            <br />
            <em>이야기</em>를 담고 있나요?
          </h1>
          <p>
            단순한 숫자 뒤에 숨겨진 신뢰와 약속의 흐름,
            <br />
            사이원장이 명료한 서사로 풀어냅니다
          </p>
        </div>

        <div className={styles.cue} aria-hidden="true">
          <span>아래로 스크롤</span>
          <i />
        </div>

        <div className={styles.copyNext}>
          <p className={styles.eyebrow}>사이원장</p>
          <h2>
            흩어진 돈 약속을
            <br />
            하나의 원장으로
          </h2>
          <p className={styles.lead}>
            정산부터 차용증, 입금 확인, 상환 일정까지.
            <br />
            가까운 사이의 돈 관계를 한 곳에서 정리해요.
          </p>
        </div>

        <div className={styles.device}>
          <BrowserFrame path="/contracts/new">
            <AppImage
              src="/images/guest/landing/ai-workspace.avif"
              alt="차용증 작성 화면. 왼쪽 계약서에 AI가 쓴 연체 위약금 조항이 들어가고, 오른쪽 계약 조항 도우미에 확인한 법령이 표시된다."
              width={1600}
              height={949}
            />
          </BrowserFrame>
        </div>
      </div>
    </section>
  );
}
