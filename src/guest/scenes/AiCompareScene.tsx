import type { CSSProperties, ReactNode } from 'react';
import AppImage from '../../common/components/AppImage';
import { scrollToSceneStep, useScrollScene } from '../hooks/useScrollScene';
import styles from './AiCompareScene.module.css';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const IMG = '/images/guest/landing';

interface GenericChat {
  user: string;
  reply: ReactNode;
  flags: string[];
}

interface Step {
  tab: string;
  title: string;
  generic: GenericChat;
  points: string[];
  visual: ReactNode;
}

const REQUEST = '친구한테 500만 원 빌려줘. 늦게 갚으면 위약금 받는 조항 써줘';

/* 일반 챗봇 쪽은 실제 서비스가 아니라 흔히 생기는 문제를 보여주는 예시다. */
const STEPS: Step[] = [
  {
    tab: '근거',
    title: '외운 기억이 아니라\n법령 원문을 찾아서 써요',
    generic: {
      user: REQUEST,
      reply: (
        <>
          제6조(위약금) 채무자가 변제기로부터 30일이 지나도록 변제하지 않으면 원금의 20%를
          위약금으로 지급한다. 이 약정은 <mark>관련 법률에 따라</mark> 효력이 있다.
        </>
      ),
      flags: ['어느 법 몇 조인지 표시가 없어요', '지금도 유효한 조문인지 확인할 방법이 없어요'],
    },
    points: [
      '국가법령정보에서 받은 민법·이자제한법 등 5개 법령에서 근거를 찾아요',
      '조문 원문과 이 계약에서의 의미를 함께 보여줘요',
      '찾아온 근거에 없는 조문은 쓰지 않도록 규칙으로 막아요',
    ],
    visual: (
      <div className={styles.vLaw}>
        <div className={styles.shot}>
          <AppImage src={`${IMG}/ai-law-evidence.avif`} alt="조항 검토 화면. 핵심 근거 민법 제398조 배상액의 예정 원문이 보인다." width={900} height={888} />
        </div>
        <div className={styles.callout}>
          <b>민법 제398조</b>
          <span>배상액의 예정 · 핵심 근거</span>
        </div>
      </div>
    ),
  },
  {
    tab: '빈칸',
    title: '정하지 않은 조건은\n지어내지 않고 물어봐요',
    generic: {
      user: REQUEST,
      reply: (
        <>
          제6조(위약금) 채무자가 변제기로부터 <mark>30일</mark>이 지나도록 변제하지 않으면{' '}
          <mark>원금의 20%</mark>를 위약금으로 지급한다. 이 약정은 관련 법률에 따라 효력이 있다.
        </>
      ),
      flags: ['말한 적 없는 숫자가 계약서에 들어갔어요'],
    },
    points: [
      '작성 중인 계약서의 원금·이율·만기일과 내가 말한 값만 반영해요',
      '정하지 않은 조건은 [입력 필요]로 남겨요',
      '빈칸만 채우면 계약서에 바로 적용돼요',
    ],
    visual: (
      <div className={styles.vSlots}>
        <div className={`${styles.shot} ${styles.slotsClause}`}>
          <AppImage src={`${IMG}/ai-clause-slots.avif`} alt="계약서의 제6조 연체 위약금 초안. 위약금 산정 기준 등 다섯 곳이 입력 필요로 남아 있다." width={1200} height={366} />
        </div>
        <div className={`${styles.shot} ${styles.slotsModal}`}>
          <AppImage src={`${IMG}/ai-slot-modal.avif`} alt="계약 조건 입력 창. 입력이 필요한 조건이 노란색으로 표시되고 항목별 입력란이 있다." width={960} height={1168} />
        </div>
      </div>
    ),
  },
  {
    tab: '검증',
    title: '쓰고 나서\n한 번 더 확인해요',
    generic: {
      user: REQUEST,
      reply: (
        <>
          제6조(위약금) … 원금의 20%를 위약금으로 지급한다. 이 약정은 관련 법률에 따라{' '}
          <mark>효력이 있다.</mark>
        </>
      ),
      flags: ['법적 단정이나 모호한 표현을 걸러내는 단계가 없어요', '검토는 온전히 내 몫이에요'],
    },
    points: [
      '모호한 표현, 법적 단정, 계약 값 충돌을 정해진 규칙으로 먼저 검사해요',
      '걸리는 게 있을 때만 AI가 한 번 더 검토해요',
      '반영 전에 확인할 점을 함께 알려줘요',
    ],
    visual: (
      <div className={styles.vCheck}>
        <div className={styles.shot}>
          <AppImage src={`${IMG}/ai-panel-progress.avif`} alt="진행 단계. 계약 내용 확인, 조건 정리, 법령 확인, 문구 작성, 충돌 확인." width={520} height={503} />
        </div>
        <div className={`${styles.shot} ${styles.checkResult}`}>
          <AppImage src={`${IMG}/ai-panel-result.avif`} alt="결과 화면. 연체 위약금 조항 제안, 판단 이유, 확인한 법령 5건, 적용 전 확인할 점." width={520} height={975} />
        </div>
      </div>
    ),
  },
  {
    tab: '범위',
    title: '차용증과 상관없는 요청엔\n답하지 않아요',
    generic: {
      user: '김치찌개 레시피 좀 알려줘',
      reply: <>물론이죠! 김치 300g, 돼지고기 200g을 준비하고 냄비에 먼저 고기를 볶아주세요…</>,
      flags: ['무엇이든 답하다 보니 계약과 상관없는 내용도 섞여요'],
    },
    points: [
      '먼저 계약과 관련된 요청인지부터 판단해요',
      '관련 없으면 법령 검색이나 작성 없이 바로 안내해요',
      '엉뚱한 문장이 계약서에 들어갈 일이 없어요',
    ],
    visual: (
      <div className={styles.vScope}>
        <div className={styles.shot}>
          <AppImage src={`${IMG}/ai-out-of-scope.avif`} alt="김치찌개 레시피 요청에 요청 범위 밖이에요라고 답한 화면." width={520} height={501} />
        </div>
      </div>
    ),
  },
];

const lines = (text: string) =>
  text.split('\n').map((line, index) => (
    <span key={index}>
      {index > 0 && <br />}
      {line}
    </span>
  ));

/**
 * 일반 AI 챗봇과 사이원장 AI를 네 가지 차이로 나란히 비교한다.
 * 화면은 고정된 채 스크롤하면 단계가 바뀐다.
 */
export default function AiCompareScene() {
  const ref = useScrollScene<HTMLElement>({ steps: STEPS.length });

  return (
    <section ref={ref} className={styles.scene} data-step="0" aria-labelledby="ai-compare-title">
      <div className={styles.stage}>
        <div className={styles.inner}>
          <header className={styles.head}>
            <p id="ai-compare-title" className={styles.kicker}>
              일반 AI 챗봇 vs 사이원장 AI
            </p>
            <div className={styles.tabs} role="tablist" aria-label="비교 항목">
              {STEPS.map((step, index) => (
                <button
                  key={step.tab}
                  type="button"
                  role="tab"
                  className={styles.tab}
                  style={{ '--k': index } as Vars}
                  onClick={() => scrollToSceneStep(ref.current, index, STEPS.length)}
                >
                  {step.tab}
                  <i aria-hidden="true" />
                </button>
              ))}
            </div>
            <div className={styles.titles}>
              {STEPS.map((step, index) => (
                <h3 key={step.tab} className={styles.title} style={{ '--k': index } as Vars}>
                  {lines(step.title)}
                </h3>
              ))}
            </div>
          </header>

          <div className={styles.body}>
            <div className={styles.generic}>
              <p className={styles.sideLabel}>
                <span className={styles.grayDot} /> 일반 AI 챗봇 <small>예시</small>
              </p>
              <div className={styles.slides}>
                {STEPS.map((step, index) => (
                  <div key={step.tab} className={styles.slide} style={{ '--k': index } as Vars}>
                    <p className={styles.userBubble}>{step.generic.user}</p>
                    <p className={styles.botBubble}>{step.generic.reply}</p>
                    <ul className={styles.flags}>
                      {step.generic.flags.map((flag) => (
                        <li key={flag}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.ours}>
              <p className={styles.sideLabel}>
                <span className={styles.mintDot} /> 사이원장 S-AI <small>실제 화면</small>
              </p>
              <div className={styles.slides}>
                {STEPS.map((step, index) => (
                  <div key={step.tab} className={styles.oursSlide} style={{ '--k': index } as Vars}>
                    <div className={styles.visual}>{step.visual}</div>
                    <ul className={styles.points}>
                      {step.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
