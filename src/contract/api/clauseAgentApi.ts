
import { authFetch } from "../../auth/authFetch";
import { createSseParser } from "../utils/sseParser";

import type {
  ClauseChatReplyResponse,
  ClauseChatStartResponse,
  ClauseReviewRequest,
  ClauseReviewResponse,
  ClauseDraft,
  ClauseIssue,
  ClauseReference,
  ClauseSuggestionRequest,
  ClauseStreamStep,
  ClauseSuggestionResponse,
  ClauseUnresolvedDecision,
  ClauseValidation,
  ClauseValidationCheck,
  ClauseValidationStatus,
} from "../types/clauseAgent";

function normalizeStatus(value: unknown): ClauseValidationStatus {
  if (value === "PASS" || value === "REVIEW" || value === "WARNING") {
    return value;
  }

  return "REVIEW";
}

function normalizeIssues(value: unknown): ClauseIssue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object"),
    )
    .map((item) => ({
      type: typeof item.type === "string" ? item.type : "OTHER",

      reason: typeof item.reason === "string" ? item.reason : "",
    }));
}

function normalizeWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeValidationChecks(value: unknown): ClauseValidationCheck[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object"),
    )
    .map((item) => ({
      type: typeof item.type === "string" ? item.type : "UNKNOWN",

      status: normalizeStatus(item.status),

      message: typeof item.message === "string" ? item.message : "",
    }));
}

function normalizeValidation(value: unknown): ClauseValidation {
  if (!value || typeof value !== "object") {
    return {
      status: "REVIEW",

      isSafeToSuggest: true,

      checks: [],
    };
  }

  const object = value as Record<string, unknown>;

  return {
    status: normalizeStatus(object.status),

    isSafeToSuggest:
      typeof object.isSafeToSuggest === "boolean"
        ? object.isSafeToSuggest
        : true,

    checks: normalizeValidationChecks(object.checks),
  };
}

function normalizeReferences(value: unknown): ClauseReference[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object"),
    )
    .map((item): ClauseReference => ({
      documentId:
        typeof item.documentId === "string" ? item.documentId : "",

      lawName:
        typeof item.lawName === "string" ? item.lawName : "관련 법령",

      articleNumber:
        typeof item.articleNumber === "string" ? item.articleNumber : null,

      articleTitle:
        typeof item.articleTitle === "string" ? item.articleTitle : null,

      content:
        typeof item.content === "string" ? item.content : "",

      vectorScore:
        typeof item.vectorScore === "number" ? item.vectorScore : 0,

      rerankScore:
        typeof item.rerankScore === "number" ? item.rerankScore : 0,

      finalScore:
        typeof item.finalScore === "number" ? item.finalScore : 0,

      matchedIssue:
        typeof item.matchedIssue === "string" ? item.matchedIssue : "",
    }))
    .filter((reference) => reference.documentId || reference.lawName);
}

function normalizeUnresolvedDecisions(
  value: unknown,
): ClauseUnresolvedDecision[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object"),
    )
    .map((item) => ({
      name: typeof item.name === "string" ? item.name : "",

      reason: typeof item.reason === "string" ? item.reason : "",
    }))
    .filter((item) => Boolean(item.name));
}

function normalizeClauseSuggestionResponse(
  body: unknown,
): ClauseSuggestionResponse {
  if (!body || typeof body !== "object") {
    throw new Error("S-AI 응답 형식이 올바르지 않습니다.");
  }

  const object = body as Record<string, unknown>;

  const suggestedClause =
    typeof object.suggestedClause === "string" ? object.suggestedClause : null;

  return {
    message: typeof object.message === "string" ? object.message : "",

    issues: normalizeIssues(object.issues),

    title: typeof object.title === "string" ? object.title : "추가 조항",

    summary: typeof object.summary === "string" ? object.summary : "",

    suggestedClause,

    warnings: normalizeWarnings(object.warnings),

    validation: normalizeValidation(object.validation),

    references: normalizeReferences(object.references),

    unresolvedDecisions: normalizeUnresolvedDecisions(
      object.unresolvedDecisions,
    ),
  };
}

export async function requestClauseSuggestion(
  request: ClauseSuggestionRequest,
  signal?: AbortSignal,
): Promise<ClauseSuggestionResponse> {
  const response = await authFetch("/api/contracts/clause-suggestions", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",

      Accept: "application/json",
    },

    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    let errorMessage = `S-AI 조항 생성에 실패했습니다. (${response.status})`;

    try {
      const body = await response.json();

      if (body && typeof body === "object") {
        if ("message" in body && typeof body.message === "string") {
          errorMessage = body.message;
        }

        if ("detail" in body && typeof body.detail === "string") {
          errorMessage = body.detail;
        }
      }
    } catch {
      // 기본 메시지 사용
    }

    throw new Error(errorMessage);
  }

  const body: unknown = await response.json();

  return normalizeClauseSuggestionResponse(body);
}


/* ============================================================
 * 스트리밍(SSE) 요청
 * ============================================================
 *
 * 서버가 단계마다 이벤트를 보낸다.
 *   progress → draft(생성 직후 초안, 검증 전) → final(최종 결과)
 *
 * 스트리밍 API가 아직 배포되지 않았거나(404 등) 응답이 스트림이 아니면
 * ClauseStreamUnavailableError를 던진다. 호출하는 쪽에서 기존 API로 다시 요청하면 된다.
 */

export class ClauseStreamUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClauseStreamUnavailableError";
  }
}

export interface ClauseStreamHandlers {
  onProgress?: (step: ClauseStreamStep) => void;
  /** 순위 매기기가 끝난 뒤, 조항을 쓰기 전에 먼저 받는 근거 법령 */
  onReferences?: (references: ClauseReference[]) => void;
  /** AI가 조항을 쓰는 중에 새로 써진 글자 */
  onDelta?: (text: string) => void;
  onDraft?: (draft: ClauseDraft) => void;
}

/** 이 상태 코드는 "스트리밍 경로가 없다"는 뜻이라 기존 API로 다시 요청한다. */
const STREAM_NOT_SUPPORTED_STATUSES = [404, 405, 501];
const STREAM_STEPS: ClauseStreamStep[] = [
  "analysis",
  "retrieval",
  "generation",
  "validation",
];

function parseJson(data: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(data);

    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function normalizeDraft(body: Record<string, unknown>): ClauseDraft | null {
  const suggestedClause =
    typeof body.suggestedClause === "string" ? body.suggestedClause.trim() : "";

  if (!suggestedClause) {
    return null;
  }

  return {
    title: typeof body.title === "string" ? body.title : "추가 조항",
    summary: typeof body.summary === "string" ? body.summary : "",
    suggestedClause,
    warnings: normalizeWarnings(body.warnings),
    references: normalizeReferences(body.references),
    unresolvedDecisions: normalizeUnresolvedDecisions(body.unresolvedDecisions),
  };
}

async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body: unknown = await response.json();

    if (body && typeof body === "object") {
      if ("detail" in body && typeof body.detail === "string") {
        return body.detail;
      }

      if ("message" in body && typeof body.message === "string") {
        return body.message;
      }
    }
  } catch {
    // 기본 메시지 사용
  }

  return fallback;
}

async function requestClauseStream(
  path: string,
  body: unknown,
  handlers: ClauseStreamHandlers,
  signal?: AbortSignal,
): Promise<ClauseSuggestionResponse> {
  let response: Response;

  try {
    response = await authFetch(path, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        // 정상일 때는 스트림, 오류(400 등)일 때는 JSON 오류 메시지를 받기 위해 둘 다 받는다
        Accept: "text/event-stream, application/json",
      },

      body: body === undefined ? undefined : JSON.stringify(body),

      signal,
    });
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    throw new ClauseStreamUnavailableError("스트리밍 연결에 실패했습니다.");
  }

  // 스트리밍 API가 아직 없는 서버(배포 전 백엔드 등)일 때만 기존 API로 다시 요청한다.
  // 400·401·403·429·5xx는 기존 API로 보내도 같은 결과이거나 AI를 한 번 더 부르게 되므로 바로 알린다.
  if (STREAM_NOT_SUPPORTED_STATUSES.includes(response.status)) {
    throw new ClauseStreamUnavailableError(
      `스트리밍 API를 사용할 수 없습니다. (${response.status})`,
    );
  }

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        `S-AI 조항 생성에 실패했습니다. (${response.status})`,
      ),
    );
  }

  const contentType = response.headers.get("Content-Type") ?? "";

  if (!response.body || !contentType.includes("text/event-stream")) {
    throw new ClauseStreamUnavailableError(
      `스트리밍 응답을 받을 수 없습니다. (${response.status})`,
    );
  }

  // 콜백 안에서 값을 바꾸므로 TypeScript가 null로 좁히지 않도록 as로 선언한다.
  let finalResult = null as ClauseSuggestionResponse | null;
  let streamError = null as Error | null;

  const parser = createSseParser(({ event, data }) => {
    if (finalResult || streamError) {
      return;
    }

    const body = parseJson(data);

    if (event === "progress") {
      const step = body.step;

      if (STREAM_STEPS.includes(step as ClauseStreamStep)) {
        handlers.onProgress?.(step as ClauseStreamStep);
      }

      return;
    }

    if (event === "references") {
      const references = normalizeReferences(body.references);

      if (references.length > 0) {
        handlers.onReferences?.(references);
      }

      return;
    }

    if (event === "delta") {
      if (typeof body.text === "string" && body.text) {
        handlers.onDelta?.(body.text);
      }

      return;
    }

    if (event === "draft") {
      const draft = normalizeDraft(body);

      if (draft) {
        handlers.onDraft?.(draft);
      }

      return;
    }

    if (event === "final") {
      finalResult = {
        ...normalizeClauseSuggestionResponse(body),
        clauseRevised: body.clauseRevised === true,
      };

      return;
    }

    if (event === "error") {
      streamError = new Error(
        typeof body.message === "string"
          ? body.message
          : "S-AI 조항 생성에 실패했습니다.",
      );
    }
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (!finalResult && !streamError) {
      const { done, value } = await reader.read();

      if (done) {
        parser.push(decoder.decode());
        parser.flush();
        break;
      }

      parser.push(decoder.decode(value, { stream: true }));
    }
  } finally {
    reader.cancel().catch(() => undefined);
  }

  if (streamError) {
    throw streamError;
  }

  if (!finalResult) {
    throw new Error(
      "S-AI 응답이 중간에 끊겼어요. 잠시 후 다시 시도해 주세요.",
    );
  }

  return finalResult;
}


/** 기존 한 번에 쓰기: 이름과 모양이 그대로라 부르는 쪽은 안 바꿔도 된다. */
export function requestClauseSuggestionStream(
  request: ClauseSuggestionRequest,
  handlers: ClauseStreamHandlers = {},
  signal?: AbortSignal,
): Promise<ClauseSuggestionResponse> {
  return requestClauseStream(
    "/api/contracts/clause-suggestions/stream",
    request,
    handlers,
    signal,
  );
}

/* ============================================================
 * 대화형 AI 특약
 * ============================================================ */

/** 1턴: AI가 이해한 내용·질문을 받는다. */
export async function startClauseChat(
  request: ClauseSuggestionRequest,
  signal?: AbortSignal,
): Promise<ClauseChatStartResponse> {
  const response = await authFetch("/api/contracts/clause-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(request),
    signal,
  });

  // 대화형 API가 아직 없는 서버(배포 전 등)일 때만 부르는 쪽이 예전처럼 바로 쓰게 한다.
  if (STREAM_NOT_SUPPORTED_STATUSES.includes(response.status)) {
    throw new ClauseStreamUnavailableError(
      `대화형 API를 사용할 수 없습니다. (${response.status})`,
    );
  }


  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        `S-AI가 요청을 확인하지 못했어요. (${response.status})`,
      ),
    );
  }

  return (await response.json()) as ClauseChatStartResponse;
}

/** 답장: 버튼을 누르거나 직접 입력한 말을 보낸다. */
export async function replyClauseChat(
  sessionId: string,
  message: string,
  signal?: AbortSignal,
): Promise<ClauseChatReplyResponse> {
  const response = await authFetch(
    `/api/contracts/clause-chat/${encodeURIComponent(sessionId)}/reply`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ message }),
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        `답장을 보내지 못했어요. (${response.status})`,
      ),
    );
  }

  return (await response.json()) as ClauseChatReplyResponse;
}

/** 확정 후 작성: 이벤트는 기존 스트리밍과 같다. (progress는 retrieval부터) */
export function requestClauseChatWriteStream(
  sessionId: string,
  handlers: ClauseStreamHandlers = {},
  signal?: AbortSignal,
): Promise<ClauseSuggestionResponse> {
  return requestClauseStream(
    `/api/contracts/clause-chat/${encodeURIComponent(sessionId)}/write`,
    undefined,
    handlers,
    signal,
  );
}

/* ============================================================
 * 반영한 AI 조항 다시 검토
 * ============================================================ */

/** 사용자가 고치거나 채운 조항을 다시 검토한다. (생성 없이 검증만, 길면 20초 이상) */
export async function reviewClause(
  request: ClauseReviewRequest,
  signal?: AbortSignal,
): Promise<ClauseReviewResponse> {
  const response = await authFetch("/api/contracts/clause-review", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      ...request,
      // 백엔드는 type만 쓰므로 다른 칸은 보내지 않는다.
      issues: request.issues.map((issue) => ({ type: issue.type })),
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        `조항을 다시 검토하지 못했어요. (${response.status})`,
      ),
    );
  }

  const body = (await response.json()) as Record<string, unknown>;

  return {
    status: normalizeStatus(body.status),
    isSafeToSuggest: body.isSafeToSuggest !== false,
    checks: normalizeValidationChecks(body.checks),
    warnings: normalizeWarnings(body.warnings),
    openSlots: normalizeWarnings(body.openSlots),
    suggestedClause:
      typeof body.suggestedClause === "string" && body.suggestedClause.trim()
        ? body.suggestedClause.trim()
        : null,
  };
}
