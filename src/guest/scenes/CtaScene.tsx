import { Link } from 'react-router-dom';
import AppImage from '../../common/components/AppImage';
import { useScrollScene } from '../hooks/useScrollScene';
import styles from './CtaScene.module.css';

/** 마지막 장면. 초록 원이 화면을 가득 채우며 시작 버튼이 나타난다. */
export default function CtaScene() {
  const ref = useScrollScene<HTMLElement>();

  return (
    <section ref={ref} className={styles.scene} aria-labelledby="cta-title">
      <div className={styles.stage}>
        <p className={styles.teaser} aria-hidden="true">
          복잡했던 돈 관계,
        </p>
        <div className={styles.circle}>
          <div className={styles.content}>
            <p className={styles.eyebrow}>복잡했던 돈 관계,</p>
            <h2 id="cta-title">
              이제 사이원장에서
              <br />
              가볍게 시작하세요
            </h2>
            <p className={styles.description}>
              정산부터 AI 차용증, 입금 확인, 상환 관리까지 한 곳에서.
            </p>
            <Link className={styles.button} to="/login">
              사이원장 시작하기
            </Link>
          </div>
          <AppImage
            src="/images/guest/character-settlement.avif"
            alt=""
            width={818}
            height={1024}
            loading="lazy"
            className={`${styles.friend} ${styles.left}`}
          />
          <AppImage
            src="/images/guest/sai-guide-full.avif"
            alt=""
            width={1122}
            height={1402}
            loading="lazy"
            className={`${styles.friend} ${styles.right}`}
          />
        </div>
      </div>
    </section>
  );
}
