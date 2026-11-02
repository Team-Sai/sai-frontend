import type { CSSProperties } from 'react';
import { useInView } from '../hooks/useInView';
import styles from './AiTableScene.module.css';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const ROWS = [
  ['법령 근거', '학습한 기억에 기대서 조문이 틀릴 수 있어요', '법령 원문을 검색해서 근거로 써요'],
  ['내 계약 정보', '매번 직접 붙여넣어야 해요', '원금·이율·만기일을 자동으로 반영해요'],
  ['정하지 않은 조건', '그럴듯하게 알아서 채우곤 해요', '[입력 필요]로 남기고 되물어요'],
  ['작성 후 검증', '내가 직접 읽고 판단해야 해요', '규칙으로 검사하고, 필요하면 AI가 다시 검토해요'],
  ['근거 확인', '출처가 없거나 확인하기 어려워요', '사용한 법령명과 조문 번호를 보여줘요'],
  ['요청 범위', '무엇이든 답해요', '금전소비대차 특약만 도와요'],
];

/** AI 비교 내용을 한 장의 표로 정리한다. */
export default function AiTableScene() {
  const [ref, inView] = useInView<HTMLElement>(0.2);

  return (
    <section
      ref={ref}
      className={`${styles.scene} ${inView ? styles.isIn : ''}`}
      aria-labelledby="ai-table-title"
    >
      <div className={styles.inner}>
        <h2 id="ai-table-title">한눈에 비교해 보면</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">비교 항목</span>
                </th>
                <th scope="col">일반 AI 챗봇</th>
                <th scope="col" className={styles.ours}>
                  사이원장 AI
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, generic, ours], index) => (
                <tr key={label} style={{ '--r': index } as Vars}>
                  <th scope="row">{label}</th>
                  <td>{generic}</td>
                  <td className={styles.ours}>{ours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.note}>
          일반 AI 챗봇 칸은 별도 설정 없이 쓰는 범용 챗봇에서 흔히 생기는 경우를 정리한 것이며, 특정
          서비스의 성능을 측정한 결과가 아니에요.
        </p>
      </div>
    </section>
  );
}
