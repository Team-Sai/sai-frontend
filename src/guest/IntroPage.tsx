import { useEffect } from 'react';
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

const navigation = performance.getEntriesByType('navigation')[0] as
  | PerformanceNavigationTiming
  | undefined;
// navigation 정보는 SPA 이동 후에도 유지되므로 최초 문서 URL을 기준으로 판단한다.
const initialPathname = navigation ? new URL(navigation.name).pathname : undefined;
let pendingReloadReset =
  navigation?.type === 'reload' && (initialPathname === '/' || initialPathname === '/intro');

/**
 * 서비스 소개(랜딩) 페이지.
 * 흐름: 첫인상 → 공감 → 핵심 기능(정산·차용증·입금 확인·캘린더) → AI 차용증(질문 → 비교 → 요약 표)
 *       → 함께 챙기는 기능 → 사이뱅크 연계 → 사례 → 시작하기
 * 각 장면은 스크롤 진행도(--p)에 맞춰 움직이며, 장면별 연출은 scenes/ 폴더에 있다.
 */
export default function IntroPage() {
  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    // StrictMode의 effect 재실행과 소개 페이지 재진입 시에는 반복하지 않는다.
    if (pendingReloadReset) {
      pendingReloadReset = false;
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname + window.location.search,
      );
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

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
