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