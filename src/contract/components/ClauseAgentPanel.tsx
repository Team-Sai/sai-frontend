
import { useEffect, useRef, useState } from "react";
import { Button } from "../../common/components";
import {
  ClauseStreamUnavailableError,
  requestClauseSuggestion,
  requestClauseSuggestionStream,
} from "../api/clauseAgentApi";
import type { ContractFormData } from "../types/contract";
import type {
  AppliedContractClause,
  ClauseDraft,
  ClauseReference,
  ClauseStreamStep,
  ClauseSuggestionRequest,
  ClauseSuggestionResponse,
  DraftContractClause,
} from "../types/clauseAgent";
import type { ContractFieldWarning } from "../utils/contractValidation";
import { createClauseSlots } from "../utils/clauseSlots";
import {
  getDraftTypingDuration,
  getLiveStep,
  LIVE_CATCH_UP_MS,
  LIVE_TICK_MS,
} from "../utils/draftTyping";
import "./ClauseAgentPanel.css";

interface ClauseAgentPanelProps {
  formData: ContractFormData;
  fieldWarnings: ContractFieldWarning[];
  appliedClauses: AppliedContractClause[];
  disabled?: boolean;
  onDraftChange: (clause: DraftContractClause | null) => void;
  onApprove: (response: ClauseSuggestionResponse) => void;
}

interface StoredAgentSession {
  question: string;
  result: ClauseSuggestionResponse;
}

const FULL_IMAGE_PATH = "/images/guest/sai-guide-full.avif";
const HEAD_IMAGE_PATH = "/images/guest/sai-guide-head.avif";
const AGENT_SESSION_KEY = "sai.contract.agent.pending";

/*
 * 스트리밍 API를 쓸 수 없을 때(기존 API로 대체할 때)만 쓰는 단계 표시.
 * 실제 진행과 상관없이 시간에 따라 넘어간다.
 */
const WORK_STEPS = [
  "현재 계약 내용을 확인하고 있어요",
  "요청한 조건을 정리하고 있어요",
  "관련 법령을 확인하고 있어요",
  "계약 문구를 작성하고 있어요",
  "기존 계약과 충돌하지 않는지 확인하고 있어요",
];


/* 스트리밍 API가 보내는 실제 진행 단계 */
const STREAM_STEPS: { step: ClauseStreamStep; label: string }[] = [
  { step: "analysis", label: "요청한 조건을 정리하고 있어요" },
  { step: "retrieval", label: "관련 법령을 확인하고 있어요" },
  { step: "generation", label: "계약 문구를 작성하고 있어요" },
  { step: "validation", label: "기존 계약과 충돌하지 않는지 확인하고 있어요" },
];

/* "민법 제468조, 민법 제397조 등" 처럼 앞의 2개만 짧게 */
function formatReferenceNames(references: ClauseReference[]): string {
  const names = references
    .slice(0, 2)
    .map((reference) =>
      [reference.lawName, reference.articleNumber].filter(Boolean).join(" "),
    );

  return references.length > 2 ? `${names.join(", ")} 등` : names.join(", ");
}

function getIssueLabel(type: string): string {
  const labels: Record<string, string> = {
    REPAYMENT: "상환",
    DEFAULT: "채무불이행",
    ACCELERATION: "기한의 이익",
    INTEREST: "이자",
    LATE_INTEREST: "연체이자",
    PENALTY: "위약금",
    EARLY_REPAYMENT: "중도상환",
    GUARANTEE: "보증",
    COLLATERAL: "담보",
    EXECUTION: "강제집행",
    ELECTRONIC_SIGNATURE: "전자서명",
    OTHER: "기타",
  };

  return labels[type] ?? type;
}

function getStatusText(status: string): string {
  if (status === "REVIEWING") return "검토 중";
  if (status === "PASS") return "반영 가능";
  if (status === "WARNING") return "주의 필요";
  return "확인 필요";
}

function getBasicConditionProgress(
  formData: ContractFormData,
): {
  completed: number;
  total: number;
} {
  const principalAmount = Number(formData.principalAmount);
  const interestRate = Number(formData.interestRate);
  const repaymentDay = Number(formData.repaymentDay);

  const conditions = [
    Boolean(
      formData.principalAmount &&
        Number.isFinite(principalAmount) &&
        principalAmount > 0,
    ),
    Boolean(formData.startDate && formData.maturityDate),
    Boolean(
      formData.interestRate !== "" &&
        Number.isFinite(interestRate),
    ),
    Boolean(
      formData.repaymentType &&
        formData.repaymentDay !== "" &&
        Number.isInteger(repaymentDay) &&
        repaymentDay >= 1 &&
        repaymentDay <= 31,
    ),
    Boolean(formData.selectedLinkedAccountId),
    Boolean(formData.contractAlias.trim()),
  ];

  return {
    completed: conditions.filter(Boolean).length,
    total: conditions.length,
  };
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()[\]{}.,·ㆍ\-_/:%"'“”‘’!?]/g, "");
}

function findSameRequestClause(
  clauses: AppliedContractClause[],
  message: string,
): AppliedContractClause | null {
  const normalizedMessage = normalizeText(message);

  if (!normalizedMessage) return null;

  for (const clause of clauses) {
    if (!clause.sourceRequest) continue;

    if (normalizeText(clause.sourceRequest) === normalizedMessage) {
      return clause;
    }
  }

  return null;
}

function hasSameIssue(
  existing: AppliedContractClause,
  incoming: ClauseSuggestionResponse,
): boolean {
  if (!existing.issues?.length || !incoming.issues?.length) {
    return false;
  }

  const existingIssueTypes = new Set(
    existing.issues.map((issue) => issue.type),
  );

  return incoming.issues.some((issue) =>
    existingIssueTypes.has(issue.type),
  );
}

function findDuplicateClause(
  existingClauses: AppliedContractClause[],
  incoming: ClauseSuggestionResponse,
): AppliedContractClause | null {
  const incomingTitle = normalizeText(incoming.title);

  const keywords = [
    "연체",
    "잔여원금",
    "일시변제",
    "중도상환",
    "위약금",
    "연체이자",
    "기한의이익",
    "통지",
    "유예",
    "담보",
    "보증",
    "변제",
  ];

  for (const existing of existingClauses) {
    const existingTitle = normalizeText(existing.title);

    if (
      incomingTitle &&
      existingTitle &&
      (
        incomingTitle === existingTitle ||
        (
          incomingTitle.length >= 5 &&
          existingTitle.includes(incomingTitle)
        ) ||
        (
          existingTitle.length >= 5 &&
          incomingTitle.includes(existingTitle)
        )
      )
    ) {
      return existing;
    }

    if (!hasSameIssue(existing, incoming)) continue;

    const sharedKeywords = keywords.filter(
      (keyword) =>
        incomingTitle.includes(keyword) &&
        existingTitle.includes(keyword),
    );

    if (sharedKeywords.length >= 1) {
      return existing;
    }
  }

  return null;
}

function loadStoredAgentSession(): StoredAgentSession | null {
  try {
    const raw = sessionStorage.getItem(AGENT_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredAgentSession;

    if (!parsed?.question || !parsed?.result) {
      return null;
    }

    return parsed;
  } catch {
    sessionStorage.removeItem(AGENT_SESSION_KEY);
    return null;
  }
}

function saveStoredAgentSession(
  question: string,
  result: ClauseSuggestionResponse,
) {
  sessionStorage.setItem(
    AGENT_SESSION_KEY,
    JSON.stringify({ question, result }),
  );
}

function clearStoredAgentSession() {
  sessionStorage.removeItem(AGENT_SESSION_KEY);
}

/* 검증이 끝나기 전 초안을 결과 영역에 보여주기 위한 임시 응답 */
function draftToPendingResult(
  draft: ClauseDraft,
): ClauseSuggestionResponse {
  return {
    message: "",
    issues: [],
    title: draft.title,
    summary: draft.summary,
    suggestedClause: draft.suggestedClause,
    warnings: draft.warnings,
    validation: {
      status: "REVIEW",
      isSafeToSuggest: false,
      checks: [],
    },
    references: draft.references,
    unresolvedDecisions: draft.unresolvedDecisions,
  };
}

export default function ClauseAgentPanel({
  formData,
  fieldWarnings,
  appliedClauses,
  disabled = false,
  onDraftChange,
  onApprove,
}: ClauseAgentPanelProps) {
  const [input, setInput] = useState("");

  const [initialSession] = useState(loadStoredAgentSession);

  const [question, setQuestion] = useState<string | null>(
    initialSession?.question ?? null,
  );

  const [result, setResult] =
    useState<ClauseSuggestionResponse | null>(
      initialSession?.result ?? null,
    );

  const [duplicateClause, setDuplicateClause] =
    useState<AppliedContractClause | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  /* 스트리밍: 실제 진행 단계 / 검증 전 초안 / 검증에서 바뀌기 전 문장 */
  const [stepMode, setStepMode] = useState<"stream" | "legacy">("stream");
  const [streamStep, setStreamStep] = useState<ClauseStreamStep | null>(null);
  const [draft, setDraft] = useState<ClauseDraft | null>(null);
  /* 순위 매기기가 끝나면 먼저 보여주는 근거 법령 */
  const [foundReferences, setFoundReferences] = useState<ClauseReference[]>([]);
  const [revisedFrom, setRevisedFrom] = useState<string | null>(null);

  /* 초안은 보이지만 아직 검증(최종 결과)을 기다리는 중 */
  const isReviewing = isLoading && draft !== null && result === null;
  const [error, setError] = useState<string | null>(null);

  const [justApplied, setJustApplied] = useState<{
    title: string;
    slotCount: number;
  } | null>(null);

  const [fullImageVisible, setFullImageVisible] = useState(true);
  const [headImageVisible, setHeadImageVisible] = useState(true);

  const typingTimer = useRef<number | null>(null);
  const stepTimer = useRef<number | null>(null);
  const draftStartedAt = useRef<number | null>(null);
  const abortController = useRef<AbortController | null>(null);
  /* 타이핑이 끝났을 때 "검토 중"으로 둘지 "완료"로 둘지 */
  const finalArrived = useRef(false);
  
  /* AI가 지금까지 실제로 쓴 조항 글자 (delta 이벤트를 이어 붙인 것) */
  const liveText = useRef("");

  /*
   * 받은 글자(liveText)를 화면에는 읽을 수 있는 속도로 옮겨 적는다.
   * - liveShown: 지금까지 화면에 보여준 글자 수
   * - livePacer: 옮겨 적는 타이머
   * - liveDeadline: AI가 다 쓴 뒤, 남은 글자를 이 시각까지 끝낸다
   * - pendingDraft / pendingFinish: 화면이 다 써질 때까지 미뤄 둔 초안·최종 결과 처리
   */
  const liveShown = useRef(0);
  const livePacer = useRef<number | null>(null);
  const liveDeadline = useRef<number | null>(null);
  const liveTitle = useRef("조항 작성 중");
  const pendingDraft = useRef<ClauseDraft | null>(null);
  const pendingFinish = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (typingTimer.current !== null) {
        window.clearTimeout(typingTimer.current);
      }

      if (stepTimer.current !== null) {
        window.clearInterval(stepTimer.current);
      }
      if (livePacer.current !== null) {
        window.clearInterval(livePacer.current);
      }
      abortController.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (initialSession?.result.suggestedClause) {
      onDraftChange({
        title: initialSession.result.title,
        content: initialSession.result.suggestedClause,
        status: "READY",
      });
    }
  }, [initialSession, onDraftChange]);

  function stopTyping() {
    if (typingTimer.current === null) return;

    window.clearTimeout(typingTimer.current);
    typingTimer.current = null;
  }

  function stopLivePacer() {
    if (livePacer.current === null) return;

    window.clearInterval(livePacer.current);
    livePacer.current = null;
  }

  /* 실시간 글자 관련 상태를 모두 처음으로 */
  function resetLive() {
    stopLivePacer();
    liveText.current = "";
    liveShown.current = 0;
    liveDeadline.current = null;
    liveTitle.current = "조항 작성 중";
    pendingDraft.current = null;
    pendingFinish.current = null;
  }

  /* 화면이 다 써졌을 때: 미뤄 둔 최종 결과가 있으면 그걸로, 없으면 "검토 중" */
  function completeLiveDraft() {
    const nextDraft = pendingDraft.current;
    const finish = pendingFinish.current;

    pendingFinish.current = null;
    setIsStreaming(false);

    if (finish) {
      finish();
      return;
    }

    if (nextDraft) {
      onDraftChange({
        title: nextDraft.title,
        content: nextDraft.suggestedClause,
        status: finalArrived.current ? "READY" : "REVIEWING",
        live: true,
      });
    }
  }

  /* 받은 글자를 LIVE_TICK_MS마다 조금씩 화면에 옮겨 적는다 */
  function ensureLivePacer() {
    if (livePacer.current !== null) return;

    let lastTick = performance.now();

    livePacer.current = window.setInterval(() => {
      const now = performance.now();
      const elapsed = now - lastTick;
      lastTick = now;

      const total = liveText.current.length;
      const remaining = total - liveShown.current;

      if (remaining > 0) {
        let shown =
          liveShown.current +
          getLiveStep(
            remaining,
            elapsed,
            liveDeadline.current === null ? null : liveDeadline.current - now,
          );

        // 이모지처럼 두 칸짜리 글자를 반으로 자르지 않게
        const code = liveText.current.charCodeAt(shown - 1);
        if (code >= 0xd800 && code <= 0xdbff && shown < total) shown += 1;

        liveShown.current = shown;

        onDraftChange({
          title: liveTitle.current,
          content: liveText.current.slice(0, shown),
          status: "STREAMING",
          live: true,
        });
        return;
      }

      // 화면이 다 따라잡았고 AI도 다 썼다면(draft 도착) 마무리
      if (pendingDraft.current) {
        stopLivePacer();
        completeLiveDraft();
      }
    }, LIVE_TICK_MS);
  }

  function stopStepTimer() {
    if (stepTimer.current === null) return;

    window.clearInterval(stepTimer.current);
    stepTimer.current = null;
  }

  function startWorkSteps() {
    setCurrentStep(0);
    stopStepTimer();

    stepTimer.current = window.setInterval(() => {
      setCurrentStep((previous) =>
        Math.min(previous + 1, WORK_STEPS.length - 1),
      );
    }, 850);
  }

  function streamClause(
    response: ClauseSuggestionResponse,
    apiMs: number,
  ) {
    const content = response.suggestedClause;

    if (!content) {
      console.info(
        `[S-AI PERF] API round trip: ${Math.round(apiMs)}ms`,
      );
      return;
    }

    stopTyping();
    setIsStreaming(true);
    draftStartedAt.current = performance.now();

    onDraftChange({
      title: response.title,
      content,
      status: "STREAMING",
    });

    const typingDuration = getDraftTypingDuration(content);

    typingTimer.current = window.setTimeout(() => {
      typingTimer.current = null;

      onDraftChange({
        title: response.title,
        content,
        status: "READY",
      });

      setIsStreaming(false);

      const start = draftStartedAt.current;

      const draftMs =
        start === null ? 0 : performance.now() - start;

      console.info(
        `[S-AI PERF] API round trip: ${Math.round(apiMs)}ms`,
      );

      console.info(
        `[S-AI PERF] UI drafting: ${Math.round(draftMs)}ms`,
      );

      console.info(
        `[S-AI PERF] Total perceived: ${Math.round(apiMs + draftMs)}ms`,
      );
    }, typingDuration);
  }

    /*
   * 스트리밍: 생성 직후 받은 초안을 계약서에 먼저 보여준다.
   * 타이핑이 끝난 뒤에도 검증이 안 끝났으면 "검토 중"으로 둔다.
   */
  function showDraft(nextDraft: ClauseDraft) {
    stopTyping();

    // 실시간으로 받는 중이면: 타이핑 연출을 다시 하지 않고,
    // 화면이 남은 글자를 LIVE_CATCH_UP_MS 안에 마저 쓰게 한 뒤 "검토 중"으로 바꾼다.
    if (liveText.current) {
      pendingDraft.current = nextDraft;
      liveTitle.current = nextDraft.title;
      liveDeadline.current = performance.now() + LIVE_CATCH_UP_MS;

      // 초안 문장이 기준이다. 이미 보여준 부분과 이어지면 초안으로 바꿔 끼운다.
      const shownText = liveText.current.slice(0, liveShown.current);
      if (nextDraft.suggestedClause.startsWith(shownText)) {
        liveText.current = nextDraft.suggestedClause;
      }

      ensureLivePacer();
      return;
    }

    setIsStreaming(true);
    finalArrived.current = false;

    onDraftChange({
      title: nextDraft.title,
      content: nextDraft.suggestedClause,
      status: "STREAMING",
    });

    typingTimer.current = window.setTimeout(() => {
      typingTimer.current = null;
      setIsStreaming(false);

      onDraftChange({
        title: nextDraft.title,
        content: nextDraft.suggestedClause,
        status: finalArrived.current ? "READY" : "REVIEWING",
      });
    }, getDraftTypingDuration(nextDraft.suggestedClause));
  }

  /*
   * 스트리밍: 글자가 오기 전이라도 계약서에 새 조항 자리를 먼저 만들고,
   * 지금 무엇을 하고 있는지(법령 확인 중 → 문장 준비 중)를 그 자리에 보여준다.
   * 글자가 오기 시작하면(liveText) 더 이상 바꾸지 않는다.
   */
  function showDraftSlot(title: string, placeholder: string) {
    if (liveText.current) {
      return;
    }

    setIsStreaming(true);

    onDraftChange({
      title,
      content: "",
      status: "STREAMING",
      live: true,
      placeholder,
    });
  }

  /* 스트리밍: AI가 쓰는 글자를 받는 대로 계약서에 이어 붙인다. */
  function appendLiveText(text: string) {
    liveText.current += text;
    setIsStreaming(true);
    ensureLivePacer();
  }

  /* 스트리밍: 최종 결과가 오면 초안을 확정하거나, 바뀐 문장으로 교체한다. */
  function finishDraft(
    shownDraft: ClauseDraft,
    response: ClauseSuggestionResponse,
  ) {
    // 화면이 아직 글자를 옮겨 적는 중이면, 다 써진 뒤에 처리한다.
    if (livePacer.current !== null) {
      finalArrived.current = true;
      pendingFinish.current = () => finishDraft(shownDraft, response);
      return;
    }

    const finalClause = response.suggestedClause?.trim() ?? "";
    const revised =
      response.clauseRevised === true ||
      (finalClause !== "" && finalClause !== shownDraft.suggestedClause);

    finalArrived.current = true;

    if (!finalClause) {
      stopTyping();
      setIsStreaming(false);
      onDraftChange(null);
      return;
    }

    if (revised) {
      stopTyping();
      setIsStreaming(false);
      setRevisedFrom(shownDraft.suggestedClause);

      onDraftChange({
        title: response.title,
        content: finalClause,
        status: "READY",
        live: liveText.current !== "",
      });
      return;
    }

    // 문장이 그대로면, 타이핑 중이면 끝날 때 READY가 되고 아니면 바로 READY
    if (typingTimer.current === null) {
      onDraftChange({
        title: response.title,
        content: finalClause,
        status: "READY",
        live: liveText.current !== "",
      });
    }
  }

  async function fetchSuggestion(
    request: ClauseSuggestionRequest,
    requestStartedAt: number,
    controller: AbortController,
  ): Promise<{
    response: ClauseSuggestionResponse;
    shownDraft: ClauseDraft | null;
  }> {
    let shownDraft: ClauseDraft | null = null;

    try {
      const response = await requestClauseSuggestionStream(
        request, 
        {
          onProgress: (step) => {
            setStreamStep(step);

            if (step === "retrieval") {
              showDraftSlot("조항 준비 중", "관련 법령을 확인하고 있어요");
            }

            if (step === "generation") {
              showDraftSlot("조항 작성 중", "문장을 준비하고 있어요");
            }
          },

          onReferences: (references) => {
            setFoundReferences(references);
            showDraftSlot(
              "조항 준비 중",
              `관련 법령을 확인하고 있어요 · ${formatReferenceNames(references)}`,
            );

            console.info(
              `[S-AI PERF] References shown: ${Math.round(
                performance.now() - requestStartedAt,
              )}ms`,
            );
          },

          
          onDelta: (text) => {
            if (!liveText.current) {
              console.info(
                `[S-AI PERF] First text shown: ${Math.round(
                  performance.now() - requestStartedAt,
                )}ms`,
              );
            }

            appendLiveText(text);
          },

          onDraft: (nextDraft) => {
            shownDraft = nextDraft;
            setDraft(nextDraft);
            showDraft(nextDraft);

            console.info(
              `[S-AI PERF] Draft shown: ${Math.round(
                performance.now() - requestStartedAt,
              )}ms`,
            );
          },
        },
        controller.signal,
      );

      return { response, shownDraft };
    } catch (streamError) {
      if (!(streamError instanceof ClauseStreamUnavailableError)) {
        throw streamError;
      }

      // 스트리밍 API를 쓸 수 없으면 기존 API로 한 번에 받는다.
      console.info(
        `[S-AI STREAM] ${streamError.message} - 기존 API로 요청합니다.`,
      );

      // 혹시 실시간으로 받던 글자가 있었다면 지우고 기존 방식으로 처음부터 보여준다.
      resetLive();
      setFoundReferences([]);
      onDraftChange(null);

      setStepMode("legacy");
      startWorkSteps();

      return {
        response: await requestClauseSuggestion(request, controller.signal),
        shownDraft: null,
      };
    }
  }

  async function handleSend() {
    const message = input.trim();

    if (
      !message ||
      disabled ||
      isLoading ||
      isStreaming ||
      result
    ) {
      return;
    }

    setJustApplied(null);
    setDuplicateClause(null);
    setError(null);

    const sameRequestClause = findSameRequestClause(
      appliedClauses,
      message,
    );

    if (sameRequestClause) {
      setInput("");
      setQuestion(message);
      setDuplicateClause(sameRequestClause);
      onDraftChange(null);

      console.info(
        "[S-AI DUPLICATE] 동일 요청 감지 - API 호출 생략",
      );
      return;
    }

    setInput("");
    setQuestion(message);
    setResult(null);
    clearStoredAgentSession();
    onDraftChange(null);

    setIsLoading(true);
    setStepMode("stream");
    setStreamStep(null);
    setDraft(null);
    setRevisedFrom(null);
    finalArrived.current = false;
    resetLive();
    setFoundReferences([]);

    const requestStartedAt = performance.now();
    // 이 요청 전용 컨트롤러. 취소 후 바로 새로 요청해도
    // 이전 요청이 새 요청의 상태(ref, 로딩, 초안)를 건드리지 않도록 지역 변수로 들고 있는다.
    const controller = new AbortController();
    abortController.current = controller;

    try {
      const principal = Number(formData.principalAmount);
      const interestRate = Number(formData.interestRate);
      const repaymentDay = Number(formData.repaymentDay);

      const request: ClauseSuggestionRequest = {
        principalAmount:
          Number.isFinite(principal) && principal > 0
            ? principal
            : null,

        interestRate: Number.isFinite(interestRate)
          ? interestRate
          : null,

        lateInterestRate: null,
        startDate: formData.startDate || null,
        maturityDate: formData.maturityDate || null,

        repaymentDay: Number.isFinite(repaymentDay)
          ? repaymentDay
          : null,

        repaymentType: formData.repaymentType || null,
        contractAlias: formData.contractAlias.trim() || null,
        terms: formData.terms.trim() || null,
        message,
      };

      const { response, shownDraft } = await fetchSuggestion(
        request,
        requestStartedAt,
        controller,
      );
      // 응답을 받는 사이에 취소됐다면 결과를 화면에 붙이지 않는다.
      if (controller.signal.aborted) {
        return;
      }

      const apiMs = performance.now() - requestStartedAt;

      console.info(
        `[S-AI PERF] API response received: ${Math.round(apiMs)}ms`,
      );

      stopStepTimer();
      setCurrentStep(WORK_STEPS.length - 1);

      const duplicate = findDuplicateClause(
        appliedClauses,
        response,
      );

      if (duplicate) {
        stopTyping();
        setIsStreaming(false);
        setDraft(null);
        clearStoredAgentSession();
        setResult(null);
        setDuplicateClause(duplicate);
        onDraftChange(null);
        resetLive();

        console.info(
          `[S-AI DUPLICATE] 기존 조항 감지: ${duplicate.title}`,
        );
        return;
      }

      saveStoredAgentSession(message, response);
      setResult(response);
      setDraft(null);

      if (shownDraft) {
        finishDraft(shownDraft, response);

        console.info(
          `[S-AI PERF] Final received: ${Math.round(apiMs)}ms`,
        );
      } else {
        // 초안 없이 최종 결과만 왔다면 실시간 글자는 버리고 기존 타이핑 연출로 보여준다.
        resetLive();
        streamClause(response, apiMs);
      }
    } catch (requestError) {
      // 사용자가 취소한 요청은 오류로 보여주지 않고, 화면 정리도 handleCancel에 맡긴다.
      // (여기서 정리하면 취소 직후 시작한 새 요청의 초안까지 지워진다)
      if (controller.signal.aborted) {
        return;
      }

      stopStepTimer();
      stopTyping();
      setIsStreaming(false);
      setDraft(null);
      onDraftChange(null);
      resetLive();

      setError(
        requestError instanceof Error
          ? requestError.message
          : "계약 조항을 검토하는 중 오류가 발생했습니다.",
      );
    } finally {
      // 취소 후 새 요청이 시작됐다면 그 요청의 상태는 건드리지 않는다.
      if (abortController.current === controller) {
        abortController.current = null;
        setIsLoading(false);
      }
    }
  }

  function handleCancel() {
    abortController.current?.abort();
    resetLive();
    setFoundReferences([]);
    abortController.current = null;
    setIsLoading(false);
    stopStepTimer();
    stopTyping();
    clearStoredAgentSession();

    setIsStreaming(false);
    setDraft(null);
    setRevisedFrom(null);
    setQuestion(null);
    setResult(null);
    setDuplicateClause(null);
    setError(null);

    onDraftChange(null);
  }

  function handleApprove() {
    if (!result || !result.suggestedClause || isStreaming || isReviewing) {
      return;
    }

    const slotCount = createClauseSlots(
      result.suggestedClause,
    ).length;

    onApprove(result);
    clearStoredAgentSession();

    setJustApplied({
      title: result.title,
      slotCount,
    });

    setQuestion(null);
    setResult(null);
    setDuplicateClause(null);
    onDraftChange(null);
  }

  const basicConditionProgress = getBasicConditionProgress(formData);

  const hasContractProblem =
    fieldWarnings.length > 0 ||
    basicConditionProgress.completed <
      basicConditionProgress.total;

    /* 최종 결과가 오기 전에는 검증 전 초안을 보여준다 (반영 불가) */
  const view =
    result ?? (draft ? draftToPendingResult(draft) : null);

  const resultStatus = isReviewing
    ? "REVIEWING"
    : (view?.validation?.status ?? "REVIEW");

  const resultIssues = Array.isArray(view?.issues)
    ? view!.issues
    : [];

  const resultReferences = Array.isArray(view?.references)
    ? view!.references
    : [];

  const resultWarnings = Array.isArray(view?.warnings)
    ? view!.warnings
    : [];

  return (
    <aside className="sai-panel">
      <header className="sai-panel__header">
        <div className="sai-panel__identity">
          <div className="sai-panel__profile">S-AI</div>

          <div>
            <strong>계약 조항 도우미</strong>
            <p>계약을 보면서 필요한 내용을 같이 정리해드려요.</p>
          </div>
        </div>

        <span
          className={[
            "sai-panel__state-dot",
            hasContractProblem ? "is-warning" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      </header>

      <div className="sai-panel__body">
        <div className="sai-contract-summary">
          <span
            className={
              basicConditionProgress.completed <
              basicConditionProgress.total
                ? "has-warning"
                : undefined
            }
          >
            기본 조건
            <b>
              {basicConditionProgress.completed}/
              {basicConditionProgress.total}
            </b>
          </span>

          <span>
            추가 조항
            <b>{appliedClauses.length}</b>
          </span>

          {fieldWarnings.length > 0 && (
            <span className="has-warning">
              확인 필요
              <b>{fieldWarnings.length}</b>
            </span>
          )}
        </div>

        {justApplied && (
          <section className="sai-chat-row">
            <AgentAvatar
              visible={headImageVisible}
              onError={() => setHeadImageVisible(false)}
            />

            <div className="sai-chat-bubble sai-chat-bubble--assistant">
              <strong>계약서에 조항을 반영했어요.</strong>
              <p>{justApplied.title}</p>

              {justApplied.slotCount > 0 && (
                <small>
                  왼쪽 계약서에서 {justApplied.slotCount}개 조건을
                  확정하면 됩니다.
                </small>
              )}
            </div>
          </section>
        )}

        {!question &&
          !result &&
          !isLoading &&
          !duplicateClause && (
            <section className="sai-welcome">
              <div className="sai-welcome__visual">
                {fullImageVisible && (
                  <img
                    src={FULL_IMAGE_PATH}
                    alt="S-AI 계약 도우미 캐릭터"
                    onError={() => setFullImageVisible(false)}
                  />
                )}
              </div>

              <div className="sai-chat-row">
                <AgentAvatar
                  visible={headImageVisible}
                  onError={() => setHeadImageVisible(false)}
                />

                <div className="sai-chat-bubble sai-chat-bubble--assistant">
                  <strong>
                    어떤 조건을 계약에 추가하고 싶으신가요?
                  </strong>

                  <p>
                    상황을 편하게 말씀해 주세요. 현재 계약을
                    같이 보면서 실제 조항으로 정리해드릴게요.
                  </p>
                </div>
              </div>

              <div className="sai-quick-questions">
                <span>예를 들면</span>

                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setInput(
                        "3개월 연속 연체하면 남은 원금을 전부 갚게 하고 싶어요.",
                      )
                    }
                  >
                    3개월 연속 연체하면?
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setInput(
                        "만기 전에 원금을 먼저 갚을 수 있게 하고 싶어요.",
                      )
                    }
                  >
                    중도상환을 허용하려면?
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setInput(
                        "연체했을 때 위약금을 정하고 싶어요.",
                      )
                    }
                  >
                    위약금을 정하고 싶어요
                  </button>
                </div>
              </div>
            </section>
          )}

        {question && (
          <div className="sai-user-row">
            <div className="sai-chat-bubble sai-chat-bubble--user">
              {question}
            </div>
          </div>
        )}

        {isLoading && !draft && (
          <section className="sai-chat-row sai-working">
            <AgentAvatar
              visible={headImageVisible}
              onError={() => setHeadImageVisible(false)}
            />

            <div className="sai-working__content">
              <strong>계약 내용을 확인하고 있어요.</strong>

              <div className="sai-working__steps">
                {stepMode === "legacy"
                  ? WORK_STEPS.map((step, index) => (
                      <div
                        key={step}
                        className={[
                          index < currentStep ? "is-done" : "",
                          index === currentStep ? "is-active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <i />
                        <span>{step}</span>
                      </div>
                    ))
                  : STREAM_STEPS.map(({ step, label }, index) => {
                      const activeIndex = STREAM_STEPS.findIndex(
                        (item) => item.step === streamStep,
                      );

                      return (
                        <div
                          key={step}
                          className={[
                            index < activeIndex ? "is-done" : "",
                            index === activeIndex ? "is-active" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <i />
                          <span>{label}</span>

                          {step === "retrieval" && foundReferences.length > 0 && (
                            <ul className="sai-working__refs">
                              {foundReferences.slice(0, 3).map((reference) => (
                                <li key={reference.documentId}>
                                  {reference.lawName}
                                  {reference.articleNumber
                                    ? ` ${reference.articleNumber}`
                                    : ""}
                                  {reference.articleTitle
                                    ? ` (${reference.articleTitle})`
                                    : ""}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
              </div>
            </div>
          </section>
        )}

        {error && (
          <section className="sai-chat-row">
            <AgentAvatar
              visible={headImageVisible}
              onError={() => setHeadImageVisible(false)}
            />

            <div className="sai-error">
              <strong>확인 중 문제가 생겼어요.</strong>
              <p>{error}</p>
            </div>
          </section>
        )}

        {duplicateClause && (
          <section className="sai-chat-row">
            <AgentAvatar
              visible={headImageVisible}
              onError={() => setHeadImageVisible(false)}
            />

            <div className="sai-chat-bubble sai-chat-bubble--assistant">
              <strong>비슷한 조항이 이미 계약에 있어요.</strong>

              <p>
                현재 계약의 「{duplicateClause.title}」 조항과
                같은 내용으로 판단해서 새 조항은 추가하지 않았어요.
              </p>

              <button type="button" onClick={handleCancel}>
                확인
              </button>
            </div>
          </section>
        )}

        {view && (
          <section className="sai-result">
            <div className="sai-result__intro">
              <AgentAvatar
                visible={headImageVisible}
                onError={() => setHeadImageVisible(false)}
              />

              <div className="sai-result__intro-text">
                <span>이 조항을 제안할게요</span>
                <h3>{view.title || "추가 조항"}</h3>
              </div>

              <b
                className={[
                  "sai-result__status",
                  `is-${resultStatus.toLowerCase()}`,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {getStatusText(resultStatus)}
              </b>
            </div>

            {resultIssues.length > 0 && (
              <div className="sai-result__issues">
                {resultIssues.map((issue, index) => (
                  <span key={`${issue.type}-${index}`}>
                    {getIssueLabel(issue.type)}
                  </span>
                ))}
              </div>
            )}

            {view.summary && (
              <div className="sai-explanation">
                <span>이렇게 판단했어요</span>
                <p>{view.summary}</p>
              </div>
            )}

            {resultReferences.length > 0 && (
              <div className="sai-law-summary">
                <header>
                  <strong>확인한 법령</strong>
                  <span>{resultReferences.length}건</span>
                </header>

                {resultReferences.slice(0, 3).map((reference, index) => (
                  <div
                    key={reference.documentId || `${index}`}
                  >
                    <span>{index === 0 ? "핵심" : "관련"}</span>

                    <p>
                      <strong>
                        {reference.lawName}{" "}
                        {reference.articleNumber ?? ""}
                      </strong>

                      {reference.articleTitle && (
                        <small>{reference.articleTitle}</small>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="sai-drafting">
              <span
                className={
                  isStreaming || isReviewing ? "is-working" : "is-ready"
                }
              />

              <div>
                <strong>
                  {isStreaming
                    ? "왼쪽 계약서에 문구를 작성 중이에요."
                    : isReviewing
                      ? "기존 계약과 충돌하지 않는지 확인하고 있어요."
                      : "계약서에 초안을 작성했어요."}
                </strong>

                <p>
                  {isStreaming
                    ? "작성되는 문구를 바로 확인할 수 있어요."
                    : isReviewing
                      ? "검토가 끝나면 계약서에 반영할 수 있어요."
                      : "아직 확정 반영 전입니다."}
                </p>
              </div>
            </div>

            {revisedFrom && !isReviewing && (
              <div className="sai-warning sai-revised">
                <strong>검토 과정에서 문장이 일부 수정됐어요</strong>
                <p>왼쪽 계약서에는 수정된 문장이 들어가 있어요.</p>

                <details>
                  <summary>수정 전 문장 보기</summary>
                  <p>{revisedFrom}</p>
                </details>
              </div>
            )}

            {resultWarnings.length > 0 && (
              <div className="sai-warning">
                <strong>적용 전에 확인해 주세요</strong>

                {resultWarnings.map((warning, index) => (
                  <p key={`${index}-${warning}`}>
                    {warning}
                  </p>
                ))}
              </div>
            )}

            <div className="sai-result__actions">
              <Button
                variant="secondary"
                disabled={isStreaming}
                onClick={handleCancel}
              >
                취소
              </Button>

              <Button
                disabled={
                  isStreaming || isReviewing || !view.suggestedClause
                }
                onClick={handleApprove}
              >
                {view.suggestedClause &&
                createClauseSlots(view.suggestedClause).length > 0
                  ? "반영하고 조건 입력"
                  : "계약서에 반영"}
              </Button>
            </div>
          </section>
        )}
      </div>

      <footer className="sai-composer">
        <textarea
          value={input}
          rows={3}
          disabled={
            disabled ||
            isLoading ||
            isStreaming ||
            Boolean(result)
          }
          placeholder="추가하고 싶은 계약 조건을 말씀해 주세요."
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey
            ) {
              event.preventDefault();
              void handleSend();
            }
          }}
        />

        <button
          type="button"
          aria-label="메시지 보내기"
          disabled={
            disabled ||
            isLoading ||
            isStreaming ||
            Boolean(result) ||
            !input.trim()
          }
          onClick={() => void handleSend()}
        >
          ↑
        </button>
      </footer>
    </aside>
  );
}

function AgentAvatar({
  visible,
  onError,
}: {
  visible: boolean;
  onError: () => void;
}) {
  return (
    <div className="sai-avatar" aria-label="S-AI">
      {visible ? (
        <img
          src={HEAD_IMAGE_PATH}
          alt="S-AI"
          onError={onError}
        />
      ) : (
        <span>S-AI</span>
      )}
    </div>
  );
}
