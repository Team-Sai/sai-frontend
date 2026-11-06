/*
 * 발표 시연 모드.
 * Alt를 누른 채 [차용증 작성]으로 들어온 이 탭에서만 켜진다. (그냥 누르면 꺼진다)
 * 켜져 있으면 AI 대화 시작 요청에 demo 표시를 붙인다.
 */

const DEMO_MODE_KEY = "sai.contract.demo";

export function setDemoMode(on: boolean) {
  try {
    if (on) {
      sessionStorage.setItem(DEMO_MODE_KEY, "1");
    } else {
      sessionStorage.removeItem(DEMO_MODE_KEY);
    }
  } catch {
    // 저장소를 쓸 수 없으면 일반 모드로 동작한다.
  }
}

export function isDemoMode(): boolean {
  try {
    return sessionStorage.getItem(DEMO_MODE_KEY) === "1";
  } catch {
    return false;
  }
}