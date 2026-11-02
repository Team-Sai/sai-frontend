import type { CSSProperties } from 'react';
import AppImage from '../../common/components/AppImage';
import { useScrollScene } from '../hooks/useScrollScene';
import styles from './AgentScene.module.css';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** 실제 스트리밍 단계(analysis → retrieval → generation → validation)를 그대로 보여준다. */
const PIPELINE = [
  { title: '요청 분석', body: '말로 설명한 조건에서 다뤄야 할 쟁점을 뽑아요' },
  { title: '법령 검색', body: '민법·이자제한법 등에서 근거 조문을 찾아요' },
  { title: '조항 작성', body: '찾은 근거를 바탕으로 계약 문구를 써요' },
  { title: '안전 검증', body: '법정 한도와 기존 조항과의 충돌을 다시 확인해요' },
];

const STATUS = [
  '질문을 받았어요',
  '요청을 분석하고 있어요',
  '관련 법령을 찾고 있어요',
  '조항을 작성하고 있어요',
  '검증을 마쳤어요',
];

const ISSUES = ['연체 시 처리 방법', '지연이자 상한', '부드러운 상환 요청'];

const REFERENCES = [
  { law: '민법 제397조', title: '금전채무불이행에 대한 특칙', score: 0.92 },
  { law: '이자제한법 제2조', title: '이자의 최고한도', score: 0.87 },
];

const CLAUSE =
  '제6조(지연 상환) 채무자가 약정한 상환일로부터 30일이 지나도록 원리금을 갚지 못한 때에는 채권자는 먼저 서면으로 상환을 요청한다. 그럼에도 상환되지 않으면 채무자는 남은 원금에 대하여 연 5%의 지연이자를 지급하되, 그 이율은 이자제한법상 최고이자율을 넘지 않는다.';

/**
 * AI 조항 에이전트 소개. 스크롤하면 질문 → 분석 → 법령 검색 → 작성 → 검증 순서로
 * 에이전트가 일하는 모습이 채워진다. 작성 단계에서는 조항이 스크롤에 맞춰 한 글자씩 써진다.
 */
export default function AgentScene() {
  const ref = useScrollScene<HTMLElement>({ steps: 5 });
  const characters = Array.from(CLAUSE);

  return (
    <section
      id="agent"
      ref={ref}
      className={styles.scene}
      data-step="0"
      style={{ '--n': characters.length } as Vars}
      aria-labelledby="agent-title"
    >
      <div className={styles.stage}>
        <div className={styles.glow} aria-hidden="true" />
        <div className={styles.inner}>
          <div className={styles.copy}>
            <p className={styles.badge}>
              <span>NEW</span> AI 조항 에이전트
            </p>
            <h2 id="agent-title">
              계약 문구가 막막할 땐
              <br />
              <em>AI 에이전트 '사이'</em>에게
              <br />
              물어보세요
            </h2>
            <p className={styles.description}>
              원하는 내용을 말로 설명하면 관련 법령을 찾아
              <br />
              근거와 함께 조항을 쓰고, 검증까지 마쳐 드려요.
            </p>
            <ol className={styles.pipeline}>
              {PIPELINE.map((item, index) => (
                <li key={item.title} style={{ '--k': index + 1 } as Vars}>
                  <span className={styles.dot}>{index + 1}</span>
                  <div>
                    <b>{item.title}</b>
                    <small>{item.body}</small>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className={styles.panel} aria-hidden="true">
            <div className={styles.panelHead}>
              <AppImage
                src="/images/guest/sai-guide-head.avif"
                alt=""
                width={40}
                height={40}
                className={styles.avatar}
              />
              <div>
                <b>사이</b>
                <span className={styles.status}>
                  {STATUS.map((text, index) => (
                    <i key={text} style={{ '--k': index } as Vars}>
                      {text}
                    </i>
                  ))}
                </span>
              </div>
              <span className={styles.live} />
            </div>

            <div className={styles.question}>
              친구한테 빌려주는 거라 바로 독촉하긴 어려워요. 늦게 갚으면 어떻게 할지 부드럽게 넣어줄래요?
            </div>

            <div className={styles.block} style={{ '--k': 1 } as Vars}>
              <p className={styles.blockLabel}>확인할 쟁점</p>
              <div className={styles.chips}>
                {ISSUES.map((issue, index) => (
                  <span key={issue} style={{ '--r': index } as Vars}>
                    {issue}
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.block} style={{ '--k': 2 } as Vars}>
              <p className={styles.blockLabel}>참고한 법령</p>
              <div className={styles.refs}>
                {REFERENCES.map((ref, index) => (
                  <div key={ref.law} className={styles.ref} style={{ '--r': index } as Vars}>
                    <b>{ref.law}</b>
                    <span>{ref.title}</span>
                    <i style={{ '--score': ref.score } as Vars} />
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.block} style={{ '--k': 3 } as Vars}>
              <p className={styles.blockLabel}>제안 조항</p>
              <p className={styles.clause}>
                {characters.map((char, index) => (
                  <span key={index} style={{ '--i': index } as Vars}>
                    {char}
                  </span>
                ))}
                <span className={styles.caret} />
              </p>
            </div>

            <div className={`${styles.block} ${styles.result}`} style={{ '--k': 4 } as Vars}>
              <span className={styles.check}>✓</span>
              <div>
                <b>검증 통과</b>
                <small>법정 최고이자율 이내 · 기존 조항과 충돌 없음</small>
              </div>
              <span className={styles.apply}>계약서에 반영</span>
            </div>
          </div>
        </div>

        <AppImage
          src="/images/guest/sai-guide-full.avif"
          alt=""
          width={1122}
          height={1402}
          loading="lazy"
          className={styles.mascot}
        />
      </div>
    </section>
  );
}
