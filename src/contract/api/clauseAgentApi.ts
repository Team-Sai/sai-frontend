import { authFetch } from "../../auth/authFetch";

import type {
  ClauseIssue,
  ClauseReference,
  ClauseSuggestionRequest,
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
    .map((item) => ({
      documentId: typeof item.documentId === "string" ? item.documentId : "",

      lawName: typeof item.lawName === "string" ? item.lawName : "관련 법령",

      articleNumber:
        typeof item.articleNumber === "string" ? item.articleNumber : null,

      articleTitle:
        typeof item.articleTitle === "string" ? item.articleTitle : null,

      content: typeof item.content === "string" ? item.content : null,

      vectorScore:
        typeof item.vectorScore === "number" ? item.vectorScore : null,

      rerankScore:
        typeof item.rerankScore === "number" ? item.rerankScore : null,

      finalScore: typeof item.finalScore === "number" ? item.finalScore : null,

      matchedIssue:
        typeof item.matchedIssue === "string" ? item.matchedIssue : null,
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
): Promise<ClauseSuggestionResponse> {
  const response = await authFetch("/api/contracts/clause-suggestions", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",

      Accept: "application/json",
    },

    body: JSON.stringify(request),
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
