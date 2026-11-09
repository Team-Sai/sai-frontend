
import { useEffect, useRef, useState } from "react";
import { Button } from "../../common/components";
import {
  ClauseChatExpiredError,
  ClauseStreamUnavailableError,
  replyClauseChat,
  requestClauseChatWriteStream,
  requestClauseSuggestion,
  requestClauseSuggestionStream,
  startClauseChat,
} from "../api/clauseAgentApi";
import type { ClauseStreamHandlers } from "../api/clauseAgentApi";
import type { ContractFormData } from "../types/contract";
import type {
  AppliedContractClause,
  ClauseChatFieldEdit,
  ClauseChatQuestion,
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
import ClauseChatCard from "./ClauseChatCard";
import { toClauseSuggestionRequest } from "../utils/clauseRequest";
import {
  AGENT_SESSION_KEY,
  CHAT_SESSION_KEY,
  CHAT_WRITING_KEY,
  canReadStoredConversation,
} from "../utils/agentConversationEntry";
import "./ClauseAgentPanel.css";

interface ClauseAgentPanelProps {
  formData: ContractFormData;
  fieldWarnings: ContractFieldWarning[];
  appliedClauses: AppliedContractClause[];
  disabled?: boolean;
  onDraftChange: (clause: DraftContractClause | null) => void;
  onApprove: (response: ClauseSuggestionResponse) => void;
}


/** 대화형 특약: 쓰기 전에 AI가 이해한 내용과 주고받은 답 */
interface ClauseChatState {
  /** 범위 밖이거나 계약서 칸 안내면 null (이어갈 대화 없음) */
  sessionId: string | null;
  summary: string | null;
  notices: string[];
  guide: string | null;
  fieldEdits: ClauseChatFieldEdit[];
  /** 아직 답하지 않은 질문 */
  questions: ClauseChatQuestion[];
  /** 지금까지 주고받은 답 */
  replies: { user: string; ai: string | null }[];
  readyToWrite: boolean;
}

/** 새로고침해도 이어 가도록 탭에 잠깐 두는 대화 (확정 전 대화만) */
interface StoredChatSession {
  question: string;
  chat: ClauseChatState;
  request: ClauseSuggestionRequest;
}

interface StoredAgentSession {
  question: string;
  result: ClauseSuggestionResponse;
}

const FULL_IMAGE_PATH = "/images/guest/sai-guide-full.avif";
const HEAD_IMAGE_PATH = "/images/guest/sai-guide-head.avif";

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

interface RequiredAgentField {
  label: string;
  filled: boolean;
}

/*
 * AI 패널을 쓰기 전에 꼭 채워야 하는 계약 칸.
 * 다 채워야 입력창이 열린다. (빈 칸은 AI가 묻지 않는다)
 */
function getRequiredAgentFields(
  formData: ContractFormData,
): RequiredAgentField[] {
  const principalAmount = Number(formData.principalAmount);
  const interestRate = Number(formData.interestRate);
  const repaymentDay = Number(formData.repaymentDay);

  return [
    {
      label: "원금",
      filled:
        formData.principalAmount !== "" &&
        Number.isFinite(principalAmount) &&
        principalAmount > 0,
    },
    {
      label: "이자율",
      filled: formData.interestRate !== "" && Number.isFinite(interestRate),
    },
    {
      label: "시작일",
      filled: Boolean(formData.startDate),
    },
    {
      label: "만기일",
      filled: Boolean(formData.maturityDate),
    },
    {
      label: "상환일",
      filled:
        formData.repaymentDay !== "" &&
        Number.isInteger(repaymentDay) &&
        repaymentDay >= 1 &&
        repaymentDay <= 31,
    },
    {
      label: "상환방식",
      filled: Boolean(formData.repaymentType),
    },
    {
      label: "변제금 수취 계좌",
      filled: Boolean(formData.selectedLinkedAccountId),
    },
    {
      label: "계약 목적",
      filled: Boolean(formData.contractAlias.trim()),
    },
  ];
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

/** 마지막 확인에서 입력창에 직접 써도 대화를 끝내는 말 (문장부호·띄어쓰기 제외) */
const DECLINE_WORDS = new Set(["아니요", "아니오", "아니", "아뇨"]);

/** 맨 아래에서 이만큼(px) 안쪽이면 최근 내용을 보고 있는 것으로 친다 */
const FOLLOW_LATEST_THRESHOLD = 80;

function loadStoredAgentSession(): StoredAgentSession | null {
  if (!canReadStoredConversation()) return null;

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

function loadStoredChatSession(): StoredChatSession | null {
  if (!canReadStoredConversation()) return null;

  try {
    const raw = sessionStorage.getItem(CHAT_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredChatSession;

    if (!parsed?.chat?.sessionId || !parsed.request || !parsed.question) {
      return null;
    }

    return parsed;
  } catch {
    sessionStorage.removeItem(CHAT_SESSION_KEY);
    return null;
  }
}

/** 작성 도중 새로고침되면 남아 있는 요청 (다시 시작에 쓴다) */
function loadInterruptedWrite(): { question: string; request: ClauseSuggestionRequest } | null {
  if (!canReadStoredConversation()) return null;

  try {
    const raw = sessionStorage.getItem(CHAT_WRITING_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { question?: string; request?: ClauseSuggestionRequest };

    return parsed?.question && parsed.request
      ? { question: parsed.question, request: parsed.request }
      : null;
  } catch {
    return null;
  }
}

function clearInterruptedWrite() {
  try {
    sessionStorage.removeItem(CHAT_WRITING_KEY);
  } catch {
    // 저장소를 쓸 수 없으면 무시한다.
  }
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
  const [interruptedWrite] = useState(loadInterruptedWrite);
  const [initialChat] = useState(loadStoredChatSession);

  const [question, setQuestion] = useState<string | null>(
      initialSession?.question ?? initialChat?.question ?? interruptedWrite?.question ?? null,
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

  
  // 대화형 특약
  const [chat, setChat] = useState<ClauseChatState | null>(initialChat?.chat ?? null);  const [isChatWaiting, setIsChatWaiting] = useState(false);
  /** 확정되면 이 요청으로 작성한다. (대화형 작성은 백엔드가 저장한 값을 쓰지만, 화면 저장에 원문이 필요하다) */
  const pendingRequest = useRef<ClauseSuggestionRequest | null>(initialChat?.request ?? null);
    /** 대화가 끝났을 때 [같은 요청으로 다시 시작]에 쓸 요청 */
  const [restartRequest, setRestartRequest] =
    useState<ClauseSuggestionRequest | null>(interruptedWrite?.request ?? null);

  // 새로고침해도 이어 가도록, 확정 전 대화만 이 탭(sessionStorage)에 둔다.
  useEffect(() => {
    try {
      if (chat?.sessionId && !chat.readyToWrite && pendingRequest.current && question) {
        sessionStorage.setItem(
          CHAT_SESSION_KEY,
          JSON.stringify({ question, chat, request: pendingRequest.current }),
        );
      } else {
        sessionStorage.removeItem(CHAT_SESSION_KEY);
      }
    } catch {
      // 저장소를 쓸 수 없으면 새로고침 이어 가기만 안 될 뿐이다.
    }
  }, [chat, question]);
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

  const panelBody = useRef<HTMLDivElement | null>(null);
  /* 사용자가 위로 올려 읽는 중이면 false: 내용이 늘어나도 끌어내리지 않는다 */
  const followLatest = useRef(true);
  const lastScrollTop = useRef(0);

  /*
   * 내용이 늘어난 뒤에는 이미 맨 아래에서 멀어져 있으므로, 효과 안에서 재지 않고 스크롤할 때 기억해 둔다.
   * 자동 스크롤은 아래로만 움직이니, 위로 움직인 경우만 사용자가 올린 것으로 본다.
   */
  function handleBodyScroll() {
    const body = panelBody.current;

    if (!body) return;

    const distanceFromBottom =
      body.scrollHeight - body.scrollTop - body.clientHeight;

    if (distanceFromBottom < FOLLOW_LATEST_THRESHOLD) {
      followLatest.current = true;
    } else if (body.scrollTop < lastScrollTop.current) {
      followLatest.current = false;
    }

    lastScrollTop.current = body.scrollTop;
  }

  // 말풍선이나 진행 단계가 바뀌면 맨 아래 최근 내용을 보여 준다. 처음 화면으로 돌아오면 맨 위로.
  useEffect(() => {
    const body = panelBody.current;

    if (!body) return;

    if (!question) {
      body.scrollTop = 0;
    } else if (followLatest.current) {
      body.scrollTop = body.scrollHeight;
    }
  }, [
    question,
    chat,
    isChatWaiting,
    isLoading,
    isStreaming,
    currentStep,
    streamStep,
    foundReferences,
    draft,
    result,
    restartRequest,
    error,
    duplicateClause,
  ]);

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
    sessionId: string | null = null,
  ): Promise<{
    response: ClauseSuggestionResponse;
    shownDraft: ClauseDraft | null;
  }> {
    let shownDraft: ClauseDraft | null = null;

    try {
      // 대화형이면 확정한 대화로 작성하고, 아니면 예전처럼 한 번에 쓴다. (이벤트 처리는 같다)
      const streamRequest = sessionId
        ? (handlers: ClauseStreamHandlers, signal: AbortSignal) =>
            requestClauseChatWriteStream(sessionId, handlers, signal)
        : (handlers: ClauseStreamHandlers, signal: AbortSignal) =>
            requestClauseSuggestionStream(request, handlers, signal);

      const response = await streamRequest(
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

      
      // 대화형 작성에서 404/409는 "대화가 끝났거나 확정 전"이라 예전 API로 다시 쓰면 안 된다.
      if (sessionId) {
        throw new ClauseChatExpiredError(undefined, { cause: streamError });
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

  const requiredAgentFields = getRequiredAgentFields(formData);
  const missingAgentFields = requiredAgentFields.filter(
    (field) => !field.filled,
  );
  const isAgentLocked = missingAgentFields.length > 0;

    function buildRequest(message: string): ClauseSuggestionRequest {
    return toClauseSuggestionRequest(formData, message);
  }

  async function handleSend() {
    const message = input.trim();

    if (
      !message ||
      disabled ||
      isAgentLocked ||
      isLoading ||
      isStreaming ||
      isChatWaiting ||
      result
    ) {
      return;
    }

    // 마지막 확인에서 직접 "아니요"라고 쓰면 버튼과 똑같이 대화를 끝낸다.
    if (
      chat?.sessionId &&
      !chat.readyToWrite &&
      chat.questions.length === 0 &&
      DECLINE_WORDS.has(message.replace(/[\s.!?~]/g, ""))
    ) {
      handleDecline();
      return;
    }

    // 확정 전 대화 중이면 입력창에 쓴 말은 답장으로 보낸다. (실패하면 입력을 되돌린다)
    if (chat?.sessionId && !chat.readyToWrite) {
      setInput("");

      if (!(await handleReply(message))) {
        setInput(message);
      }

      return;
    }

    followLatest.current = true;
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
    setChat(null);
    setRestartRequest(null);
    clearInterruptedWrite();

    await startChat(buildRequest(message));
  }

  async function writeClause(
    request: ClauseSuggestionRequest,
    sessionId: string | null,
  ) {
    const message = request.message;
    
    // 대화로 쓰는 중에 새로고침되면 다시 시작할 수 있게 표시해 둔다.
    if (sessionId) {
      try {
        sessionStorage.setItem(CHAT_WRITING_KEY, JSON.stringify({ question: message, request }));
      } catch {
        // 저장소를 쓸 수 없으면 새로고침 다시 시작만 안 될 뿐이다.
      }
    }


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
      const { response, shownDraft } = await fetchSuggestion(
        request,
        requestStartedAt,
        controller,
        sessionId,
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
      
      // 확정한 대화로 쓰다 실패하면 그 대화는 다시 쓸 수 없으니 정리한다. (입력창이 새 요청으로 돌아간다)
      if (sessionId) {
        setChat(null);
        pendingRequest.current = null;
        // 같은 요청으로 새 대화를 시작할 수 있게 남겨 둔다.
        setRestartRequest(request);

        // "대화 끝"은 아래 [다시 시작] 안내로 보여 주므로 오류 문장은 따로 띄우지 않는다.
        if (requestError instanceof ClauseChatExpiredError) {
          return;
        }
      }


      setError(
        requestError instanceof Error
          ? requestError.message
          : "계약 조항을 검토하는 중 오류가 발생했습니다.",
      );
    } finally {
      // 끝났으면(성공·실패·취소) 표시를 지운다. 새로고침되면 여기까지 오지 않아 표시가 남는다.
      if (sessionId) {
        clearInterruptedWrite();
      }
      // 취소 후 새 요청이 시작됐다면 그 요청의 상태는 건드리지 않는다.
      if (abortController.current === controller) {
        abortController.current = null;
        setIsLoading(false);
      }
    }
  }

    /** 대화형 1턴: 바로 쓰지 않고 AI가 이해한 내용을 먼저 보여 준다. */
  async function startChat(request: ClauseSuggestionRequest) {
    const controller = new AbortController();
    abortController.current = controller;
    pendingRequest.current = request;
    setIsChatWaiting(true);

    try {
      const started = await startClauseChat(request, controller.signal);

      if (controller.signal.aborted) {
        return;
      }

      setChat({
        sessionId: started.sessionId,
        summary: started.summary,
        notices: started.notices ?? [],
        guide: started.guide,
        fieldEdits: started.fieldEdits ?? [],
        questions: started.questions ?? [],
        replies: [],
        readyToWrite: false,
      });
        } catch (chatError) {
      if (controller.signal.aborted)
         {
        return;
      }

      // 주소가 없을 때(배포 전 등)만 예전처럼 바로 쓴다. 그 밖의 오류는 보여 준다.
      if (!(chatError instanceof ClauseStreamUnavailableError)) {
        setError(
          chatError instanceof Error
            ? chatError.message
            : "요청 내용을 확인하지 못했어요.",
        );
        // 사용자가 쓴 요청이 사라지지 않게 입력창에 되돌린다.
        setInput((current) => current || request.message);
        return;
      }

      console.info(`[S-AI CHAT] ${chatError.message} - 바로 작성합니다.`);
      void writeClause(request, null);
    } finally {
      if (abortController.current === controller) {
        abortController.current = null;
      }
      setIsChatWaiting(false);
    }
  }

  /** 답장: 버튼을 누르거나 입력창에 쓴 말. 확정되면 바로 작성한다. 성공하면 true. */
  async function handleReply(text: string): Promise<boolean> {
    const sessionId = chat?.sessionId;

    if (!sessionId || isChatWaiting || isLoading) {
      return false;
    }

    // 취소(handleCancel)하면 이 요청도 멈추도록 등록한다.
    const controller = new AbortController();
    abortController.current = controller;

    followLatest.current = true;
    setIsChatWaiting(true);
    setError(null);

    try {
      const replied = await replyClauseChat(sessionId, text, controller.signal);

      // 기다리는 사이 취소됐으면 늦게 온 응답은 무시한다.
      if (controller.signal.aborted) {
        return false;
      }

      setChat((current) =>
        current && {
          ...current,
          questions: replied.pendingQuestions ?? [],
          replies: [...current.replies, { user: text, ai: replied.echo }],
          readyToWrite: replied.readyToWrite,
        },
      );

      if (replied.readyToWrite) {
        if (pendingRequest.current) {
          void writeClause(pendingRequest.current, sessionId);
        } else {
          // 쓸 요청을 잃어버렸으면(드문 경우) 대화를 정리하고 다시 요청하게 한다.
          setChat(null);
          setError("대화가 끝났어요. 처음부터 다시 요청해 주세요.");
        }
      }

      return true;
      /** 답장: 버튼을 누르거나 입력창에 쓴 말. 확정되면 바로 작성한다. 입력창에 되돌릴 필요가 없으면 true. */
    } catch (replyError) {
      // 취소했으면 오류로 보여 주지 않는다. (되돌릴 입력도 없다)
      if (controller.signal.aborted) {
        return true;
      }

      if (replyError instanceof ClauseChatExpiredError) {
        setChat(null);
        setRestartRequest(pendingRequest.current);
        pendingRequest.current = null;
        return true;
      }

      setError(
        replyError instanceof Error
          ? replyError.message
          : "답장을 보내지 못했어요.",
      );
      return false;
    } finally {
      if (abortController.current === controller) {
        abortController.current = null;
      }
      setIsChatWaiting(false);
    }
  }

  /** 대화가 끝났을 때: 같은 요청으로 새 대화를 시작한다. */
  function handleRestartChat() {
    const request = restartRequest;

    if (!request || isChatWaiting || isLoading) {
      return;
    }

    followLatest.current = true;
    setRestartRequest(null);
    clearInterruptedWrite();
    setError(null);
    setResult(null);
    clearStoredAgentSession();
    onDraftChange(null);
    setQuestion(request.message);
    void startChat(request);
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
    setChat(null);
    setRestartRequest(null);
    clearInterruptedWrite();
    pendingRequest.current = null;

    onDraftChange(null);
  }

  /** 마지막 확인에서 [아니요]: 대화를 끝내고 처음 화면으로 돌아간다. */
  function handleDecline() {
    setInput("");
    handleCancel();
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
    setChat(null);
    setRestartRequest(null);
    clearInterruptedWrite();
    pendingRequest.current = null;
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

      <div
        ref={panelBody}
        className="sai-panel__body"
        onScroll={handleBodyScroll}
      >
        <div className="sai-contract-summary">
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

        {isAgentLocked && (
          <section className="sai-chat-row">
            <AgentAvatar
              visible={headImageVisible}
              onError={() => setHeadImageVisible(false)}
            />

            <div className="sai-chat-bubble sai-chat-bubble--assistant">
              <strong>계약 기본 조건을 먼저 채워 주세요.</strong>
              <p>
                아래 {missingAgentFields.length}개를 채우면 바로 대화를
                시작할 수 있어요.
              </p>

              <ul className="sai-required-fields">
                {requiredAgentFields.map((field) => (
                  <li
                    key={field.label}
                    className={field.filled ? "is-filled" : undefined}
                  >
                    <span aria-hidden="true">
                      {field.filled ? "✓" : "○"}
                    </span>
                    {field.label}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

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
                    3개월 연속 연체하면 남은 원금을 전부 갚게 하고 싶어요.
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setInput(
                        "만기 전에 원금을 먼저 갚을 수 있게 하고 싶어요.",
                      )
                    }
                  >
                    만기 전에 원금을 먼저 갚을 수 있게 하고 싶어요.
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setInput(
                        "연체했을 때 위약금을 정하고 싶어요.",
                      )
                    }
                  >
                    연체했을 때 위약금을 정하고 싶어요.
                  </button>
                  
                  <button
                    type="button"
                    onClick={() =>
                      setInput(
                        "채무자 소유 자동차를 담보로 잡고 싶어요.",
                      )
                    }
                  >
                    채무자 소유 자동차를 담보로 잡고 싶어요.
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

                {isChatWaiting && !chat && (
          <section className="sai-chat-row">
            <AgentAvatar
              visible={headImageVisible}
              onError={() => setHeadImageVisible(false)}
            />

            <div className="sai-chat-bubble sai-chat-bubble--assistant">
              <strong className="sai-shimmer">요청 내용을 확인하고 있어요.</strong>
              <p>바로 쓰기 전에, 이해한 내용을 먼저 보여 드릴게요.</p>
            </div>
          </section>
        )}

        {chat && (
          <ClauseChatCard
            {...chat}
            waiting={isChatWaiting}
            writing={isLoading || isStreaming || Boolean(result)}
            avatar={
              <AgentAvatar
                visible={headImageVisible}
                onError={() => setHeadImageVisible(false)}
              />
            }
            onReply={(text) => void handleReply(text)}
            onDecline={handleDecline}
          />
        )}


        {isLoading && !draft && (
          <section className="sai-chat-row sai-working">
            <AgentAvatar
              visible={headImageVisible}
              onError={() => setHeadImageVisible(false)}
            />

            <div className="sai-working__content">
              <strong className="sai-shimmer">계약 내용을 확인하고 있어요.</strong>

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

        {restartRequest && !chat && !isChatWaiting && !isLoading && (
          <section className="sai-chat-row">
            <AgentAvatar
              visible={headImageVisible}
              onError={() => setHeadImageVisible(false)}
            />

            <div className="sai-chat-bubble sai-chat-bubble--assistant">
              <p>
                대화 시간이 지났거나 작성이 중간에 멈췄어요. 같은 요청으로 다시 시작할 수 있어요.                          
              </p>

              <div className="sai-chat__options">
                <button type="button" onClick={handleRestartChat}>
                  같은 요청으로 다시 시작
                </button>
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
            isAgentLocked ||
            isLoading ||
            isStreaming ||
            isChatWaiting ||
            Boolean(result)
          }
          placeholder={
            isAgentLocked
              ? "계약 조건 추가가 잠겨 있습니다."
              : chat?.sessionId && !chat.readyToWrite
                ? "답을 직접 써도 돼요. (예: 연 7%로 바꿔 주세요)"
                : "추가하고 싶은 계약 조건을 말씀해 주세요."
          }
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
            isAgentLocked ||
            isLoading ||
            isStreaming ||
            Boolean(result) ||
            isChatWaiting ||
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
