import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./common/layouts/app-shell.css";
import App from "./App.tsx";

if (window.location.pathname === '/intro' || window.location.pathname === '/') {
    window.history.scrollRestoration = 'manual';

    const navigation = performance.getEntriesByType(
        'navigation',
    )[0] as PerformanceNavigationTiming | undefined;

    // 새로고침할 때는 섹션 해시도 제거해 첫 화면을 보여준다.
    if (navigation?.type === 'reload') {
        window.history.replaceState(
            window.history.state,
            '',
            window.location.pathname + window.location.search,
        );

        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
