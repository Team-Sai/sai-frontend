import { useScrollScene } from '../hooks/useScrollScene';
import styles from './AiQuestionScene.module.css';

/**
 * AI 파트의 문을 여는 장면. 누구나 떠올릴 질문을 먼저 던지고,
 * 스크롤하면 사이원장의 답이 이어진다.
 */
export default function AiQuestionScene() {
  const ref = useScrollScene<HTMLElement>();

  return (
    <section id="ai" ref={ref} className={styles.scene} aria-labelledby="ai-question">
      <div className={styles.stage}>
        <div className={styles.glow} aria-hidden="true" />
        <p className={styles.badge}>
          <span>S-AI</span> 계약 조항 도우미
        </p>
        <h2 id="ai-question" className={styles.question}>
          그냥 AI한테
          <br />
          차용증 써달라고 하면 안 되나요?
        </h2>
        <div className={styles.answer}>
          <p className={styles.answerLead}>그럴듯한 초안은 금방 나와요.</p>
          <p className={styles.answerMain}>
            그런데 그 조문, <em>진짜 있는 법</em>일까요?
          </p>
        </div>
      </div>
    </section>
  );
}
