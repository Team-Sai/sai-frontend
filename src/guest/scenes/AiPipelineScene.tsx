import type { CSSProperties } from 'react';
import { useScrollScene } from '../hooks/useScrollScene';
import styles from './AiPipelineScene.module.css';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const STAGES = [
  {
    rail: '법령 준비',
    stat: '5개 법령',
    title: '법령 원문을 미리 준비해요',
    body: '국가법령정보에서 민법, 이자제한법, 민사집행법, 전자서명법, 전자문서법을 받아 조문 단위로 정리해 둬요.',
  },
  {
    rail: '쟁점 분석',
    stat: '12가지 쟁점',
    title: '요청을 법률 쟁점으로 바꿔요',
    body: '‘늦게 갚으면 위약금’ 같은 말을 12가지 쟁점 중 하나로 분류하고, 쟁점마다 찾아볼 법을 정해요. 계약과 상관없는 요청은 여기서 멈춰요.',
  },
  {
    rail: '법령 검색',
    stat: '후보 16개',
    title: '관련 조문을 넓게 찾아요',
    body: '법률 용어로 한 번, 내가 쓴 표현으로 한 번. 두 방향으로 찾아서 놓치는 조문을 줄여요.',
  },
  {
    rail: '다시 채점',
    stat: '근거 3개',
    title: '가장 관련 있는 근거만 남겨요',
    body: '같은 조문은 합치고, 질문과 조문을 함께 읽는 모델로 다시 채점해서 상위 3개만 남겨요.',
  },
  {
    rail: '조항 작성',
    stat: '근거 안에서만',
    title: '찾은 근거 안에서만 써요',
    body: '근거에 없는 조문은 쓰지 않고, 정하지 않은 조건은 [입력 필요]로 남겨요.',
  },
  {
    rail: '검증',
    stat: '한 번 더 확인',
    title: '규칙으로 먼저, 필요하면 AI가 한 번 더',
    body: '모호한 표현, 법적 단정, 계약 값 충돌을 규칙으로 먼저 확인하고, 걸리는 게 있을 때만 AI가 다시 검토해요.',
  },
];

const LAWS = ['민법', '이자제한법', '민사집행법', '전자서명법', '전자문서법'];
const TOP_REFS = ['민법 제398조', '민법 제395조', '민법 제392조'];

/** 사이원장 AI가 조항 하나를 쓰기까지: 근거가 16개 → 5개 → 3개로 좁혀지는 과정을 보여준다. */
export default function AiPipelineScene() {
  const ref = useScrollScene<HTMLElement>({ steps: STAGES.length });

  return (
    <section ref={ref} className={styles.scene} data-step="0" aria-labelledby="pipeline-title">
      <div className={styles.stage}>
        <div className={styles.inner}>
          <div className={styles.copy}>
            <p className={styles.kicker}>사이원장 AI가 조항 하나를 쓰기까지</p>
            <h2 id="pipeline-title">
              근거는 좁히고,{' '}
              <br />
              확인은 한 번 더
            </h2>
            <div className={styles.steps}>
              {STAGES.map((stage, index) => (
                <div key={stage.rail} className={styles.stepText} style={{ '--k': index } as Vars}>
                  <b>{stage.title}</b>
                  <p>{stage.body}</p>
                </div>
              ))}
            </div>
            <p className={styles.note}>
              사이원장 AI가 쓴 조항은 법률 자문을 대신하지 않아요. 근거 법령과 확인할 점을 함께
              보여드리니 반영 전에 꼭 읽어 주세요.
            </p>
          </div>

          <div className={styles.board} aria-hidden="true">
            <ol className={styles.rail}>
              {STAGES.map((stage, index) => (
                <li key={stage.rail} style={{ '--k': index } as Vars}>
                  <span />
                  {stage.rail}
                </li>
              ))}
            </ol>

            <div className={styles.field}>
              <div className={styles.laws}>
                {LAWS.map((law, index) => (
                  <span key={law} style={{ '--i': index } as Vars}>
                    {law}
                  </span>
                ))}
              </div>

              <div className={styles.issues}>
                <small>‘늦게 갚으면 위약금’ → 법률 쟁점</small>
                <span>위약금</span>
                <span>연체</span>
                <em>찾아볼 법: 민법</em>
              </div>

              <div className={styles.docs}>
                {Array.from({ length: 16 }, (_, index) => (
                  <i
                    key={index}
                    style={{ '--i': index, '--col': index % 8, '--row': Math.floor(index / 8) } as Vars}
                  >
                    {index < 3 && <em>{TOP_REFS[index]}</em>}
                  </i>
                ))}
              </div>

              <div className={styles.draft}>
                <p className={styles.draftTitle}>제6조 (연체 위약금)</p>
                <p className={styles.draftBody}>
                  채무자가 정한 변제기까지 변제금을 지급하지 않은 경우, 채무자는 채권자에게 위약금으로{' '}
                  <span className={styles.slot}>입력 필요: 위약금 산정 기준</span>에 따라 산정한 금액을
                  지급한다.
                </p>
                <div className={styles.checks}>
                  <span>모호한 표현</span>
                  <span>법적 단정</span>
                  <span>계약 값 충돌</span>
                </div>
              </div>
            </div>

            <div className={styles.stats}>
              {STAGES.map((stage, index) => (
                <strong key={stage.rail} style={{ '--k': index } as Vars}>
                  {stage.stat}
                </strong>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
