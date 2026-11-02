import HeroScene from './scenes/HeroScene';
import StatementScene from './scenes/StatementScene';
import AiQuestionScene from './scenes/AiQuestionScene';
import AiCompareScene from './scenes/AiCompareScene';
import AiTableScene from './scenes/AiTableScene';
import FeatureStory from './scenes/FeatureStory';
import FeatureBento from './scenes/FeatureBento';
import SaibankScene from './scenes/SaibankScene';
import UseCaseRail from './scenes/UseCaseRail';
import CtaScene from './scenes/CtaScene';
import styles from './IntroPage.module.css';

/**
 * 서비스 소개(랜딩) 페이지.
 * 흐름: 첫인상 → 공감 → 핵심 기능(정산·차용증·입금 확인·캘린더) → AI 차용증(질문 → 비교 → 요약 표)
 *       → 함께 챙기는 기능 → 사이뱅크 연계 → 사례 → 시작하기
 * 각 장면은 스크롤 진행도(--p)에 맞춰 움직이며, 장면별 연출은 scenes/ 폴더에 있다.
 */
export default function IntroPage() {
  return (
    <div className={styles.page}>
      <HeroScene />
      <StatementScene />
      <FeatureStory />
      <AiQuestionScene />
      <AiCompareScene />
      <AiTableScene />
      <FeatureBento />
      <SaibankScene />
      <UseCaseRail />
      <CtaScene />
    </div>
  );
}
