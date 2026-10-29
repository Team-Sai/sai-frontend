/*
 * 계약서에 AI 조항 초안이 써지는 연출(타이핑 효과) 속도.
 *
 * 예전에는 응답을 다 받은 뒤 글자당 0.028초씩 연출해서
 * 300자 조항이면 9초 이상 더 기다려야 했다.
 * 이제는 조항 길이와 상관없이 최대 DRAFT_TYPING_MAX_MS 안에 끝나도록 속도를 맞춘다.
 */

export const DRAFT_TYPING_MAX_MS = 1500;

const DRAFT_CHAR_INTERVAL_MS = 28;
const DRAFT_COMMA_PAUSE_MS = 35;
const DRAFT_SENTENCE_PAUSE_MS = 80;

/** 타이핑 시작 전 대기 + 끝난 뒤 여유 */
const DRAFT_TYPING_PADDING_MS = 300;

function getNaturalCharDelay(character: string): number {
  if (
    character === "." ||
    character === "!" ||
    character === "?" ||
    character === "\n"
  ) {
    return DRAFT_CHAR_INTERVAL_MS + DRAFT_SENTENCE_PAUSE_MS;
  }

  if (character === "," || character === ";" || character === ":") {
    return DRAFT_CHAR_INTERVAL_MS + DRAFT_COMMA_PAUSE_MS;
  }

  return DRAFT_CHAR_INTERVAL_MS;
}

function getNaturalTypingDuration(content: string): number {
  return Array.from(content).reduce(
    (total, character) => total + getNaturalCharDelay(character),
    0,
  );
}

/** 긴 조항은 전체가 DRAFT_TYPING_MAX_MS 안에 끝나도록 글자 간격을 줄인다. */
export function getDraftTypingScale(content: string): number {
  const natural = getNaturalTypingDuration(content);

  return natural > DRAFT_TYPING_MAX_MS ? DRAFT_TYPING_MAX_MS / natural : 1;
}

export function getDraftCharDelay(character: string, scale = 1): number {
  return getNaturalCharDelay(character) * scale;
}

/** 패널이 "작성 중" 표시를 끝낼 시각 (계약서 타이핑과 맞춘다) */
export function getDraftTypingDuration(content: string): number {
  return (
    Math.min(getNaturalTypingDuration(content), DRAFT_TYPING_MAX_MS) +
    DRAFT_TYPING_PADDING_MS
  );
}

/*
 * AI가 실시간으로 쓰는 글자(delta)를 계약서에 보여주는 속도.
 *
 * AI는 생각을 끝내면 1초에 수백 자를 한꺼번에 쏟아내서, 그대로 보여주면
 * 글이 "확" 나타나 읽을 수가 없다. 받은 글자는 먼저 모아 두고(버퍼),
 * 화면에는 눈으로 따라갈 수 있는 속도로 옮겨 적는다.
 *
 * - 기본: 1초에 LIVE_CHARS_PER_SECOND자
 * - AI가 다 쓴 뒤(draft 도착)에는 남은 글자를 LIVE_CATCH_UP_MS 안에 끝낸다
 *   (긴 조항이라도 하염없이 기다리지 않게)
 */
export const LIVE_CHARS_PER_SECOND = 50;
export const LIVE_CATCH_UP_MS = 5000;
export const LIVE_TICK_MS = 50;

/** 이번 틱에 화면에 더 보여줄 글자 수 */
export function getLiveStep(
  remaining: number,
  elapsedMs: number,
  msUntilDeadline: number | null,
): number {
  if (remaining <= 0) return 0;

  let step = (LIVE_CHARS_PER_SECOND * elapsedMs) / 1000;

  if (msUntilDeadline !== null) {
    // 마감까지 남은 시간 안에 다 쓰려면 이번 틱에 얼마나 써야 하는지
    const timeLeft = Math.max(msUntilDeadline, elapsedMs);
    step = Math.max(step, (remaining * elapsedMs) / timeLeft);
  }

  return Math.min(remaining, Math.max(1, Math.round(step)));
}
