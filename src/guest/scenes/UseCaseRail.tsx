import { useEffect, useRef, type CSSProperties } from 'react';
import AppImage from '../../common/components/AppImage';
import { useScrollScene } from '../hooks/useScrollScene';
import styles from './UseCaseRail.module.css';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const CASES = [
  {
    tag: '모임·여행 회비',
    title: '넷이서 떠난 제주,\n84만 원 깔끔하게',
    image: '/images/guest/schedule.avif',
  },
  {
    tag: '친구·연인 사이 차용',
    title: '300만 원,\n서로 서운하지 않게',
    image: '/images/guest/safety-diagnosis.avif',
  },
  {
    tag: '정기 정산',
    title: '매달 돌아오는\n월세와 모임 회비',
    character: '/images/guest/character-settlement.avif',
    tone: 'green',
  },
  {
    tag: '가족 간 생활비',
    title: '형제끼리 나누는\n부모님 간병비',
    image: '/images/guest/settlement.avif',
  },
  {
    tag: '가족 간 목돈',
    title: '부모님께 빌린\n전세 자금도 안심하게',
    character: '/images/guest/character-diagnosis.avif',
    tone: 'blue',
  },
  {
    tag: '큰 금액 거래 전',
    title: '송금하기 전에\n안심거래진단부터',
    image: '/images/guest/loan-agreement.avif',
  },
] as const;

const lines = (text: string) =>
  text.split('\n').map((line, index) => (
    <span key={index}>
      {index > 0 && <br />}
      {line}
    </span>
  ));

/** 화면은 멈춘 채로, 세로 스크롤에 맞춰 사례 카드들이 가로로 흘러간다. */
export default function UseCaseRail() {
  const ref = useScrollScene<HTMLElement>();
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // 가로로 움직일 거리 = 카드 줄 전체 폭 - 보이는 폭. 이 거리만큼 섹션을 길게 만든다.
  useEffect(() => {
    const section = ref.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!section || !viewport || !track) return;
    const measure = () => {
      const distance = Math.max(0, track.scrollWidth - viewport.clientWidth);
      section.style.setProperty('--dist', `${distance}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(track);
    return () => observer.disconnect();
  }, [ref]);

  return (
    <section ref={ref} className={styles.scene} aria-labelledby="usecase-title">
      <div className={styles.stage}>
        <div className={styles.head}>
          <p className={styles.eyebrow}>이럴 때 사이원장</p>
          <h2 id="usecase-title">
            가까운 사이의{' '}
            <br />
            모든 돈 약속에
          </h2>
          <div className={styles.meter} aria-hidden="true">
            <i />
          </div>
        </div>
        <div ref={viewportRef} className={styles.viewport}>
          <div ref={trackRef} className={styles.track}>
            {CASES.map((item, index) => (
              <article
                key={item.tag}
                className={`${styles.card} ${'tone' in item ? styles[item.tone] : ''}`}
                style={{ '--k': index } as Vars}
              >
                {'image' in item ? (
                  <AppImage
                    src={item.image}
                    alt=""
                    width={360}
                    height={289}
                    loading="lazy"
                    className={styles.photo}
                  />
                ) : (
                  <AppImage
                    src={item.character}
                    alt=""
                    width={818}
                    height={1024}
                    loading="lazy"
                    className={styles.character}
                  />
                )}
                <div className={styles.cardCopy}>
                  <span className={styles.tag}>{item.tag}</span>
                  <h3>{lines(item.title)}</h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
