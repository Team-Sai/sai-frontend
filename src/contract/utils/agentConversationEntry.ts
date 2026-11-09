import { useEffect, useState } from "react";

export const AGENT_SESSION_KEY = "sai.contract.agent.pending";
export const CHAT_WRITING_KEY = "sai.contract.agent.chat-writing";
export const CHAT_SESSION_KEY = "sai.contract.agent.chat";

/**
 * 계약서 화면 진입 상태
 * - first: 이 문서 로드에서 아직 들어온 적 없음
 * - entering: 화면을 옮겨 다시 들어오는 중 (이전 대화 정리 전)
 * - settled: 정리가 끝나 저장된 대화가 이번 진입의 것임
 */
let entryState: "first" | "entering" | "settled" = "first";

/** 지금 보고 있는 이 화면을 새로고침한 경우인지 (다른 화면에서 새로고침 후 넘어온 경우는 제외) */
function isCurrentPageReload() {
  const [entry] = performance.getEntriesByType(
    "navigation",
  ) as PerformanceNavigationTiming[];

  return (
    entry?.type === "reload" &&
    new URL(entry.name).pathname === window.location.pathname
  );
}

function shouldRestoreConversation() {
  return entryState === "first" && isCurrentPageReload();
}

/** 저장된 대화를 읽어도 되는지. 렌더 중에 불리므로 값을 읽기만 한다. */
export function canReadStoredConversation() {
  return entryState === "settled" || shouldRestoreConversation();
}

function clearStoredConversation() {
  try {
    sessionStorage.removeItem(AGENT_SESSION_KEY);
    sessionStorage.removeItem(CHAT_SESSION_KEY);
    sessionStorage.removeItem(CHAT_WRITING_KEY);
  } catch {
    // 저장소를 쓸 수 없으면 복원할 대화도 없다.
  }
}

/**
 * 계약서 화면에 들어올 때 한 번, 저장된 AI 대화를 이어 갈지 정한다.
 * 새로고침이 아니면(다른 화면에 갔다 오면) 지워서 처음 화면에서 시작한다.
 * 계약서 입력값은 별도 키에 있어 지워지지 않는다.
 *
 * 화면 단위로 판단하므로, 같은 화면에서 패널만 다시 마운트되면 대화는 유지된다.
 */
export function useAgentConversationEntry() {
  // StrictMode가 이펙트를 다시 실행해도 같은 판단을 쓰도록 진입 시점에 고정한다.
  const [shouldRestore] = useState(shouldRestoreConversation);

  useEffect(() => {
    if (!shouldRestore) {
      clearStoredConversation();
    }

    entryState = "settled";

    return () => {
      entryState = "entering";
    };
  }, [shouldRestore]);
}
