import { useEffect, useRef, useState } from "react";

import { Button } from "../../common/components";

import { requestClauseSuggestion } from "../api/clauseAgentApi";

import type { ContractFormData } from "../types/contract";

import type {
  AppliedContractClause,
  ClauseSuggestionResponse,
  DraftContractClause,
} from "../types/clauseAgent";

import type { ContractFieldWarning } from "../utils/contractValidation";

import { createClauseSlots } from "../utils/clauseSlots";

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

const WORK_STEPS = [
  "현재 계약 내용을 확인하고 있어요",
  "요청한 조건을 정리하고 있어요",
  "관련 법령을 확인하고 있어요",
  "계약 문구를 작성하고 있어요",
  "기존 계약과 충돌하지 않는지 확인하고 있어요",
];

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
  if (status === "PASS") {
    return "반영 가능";
  }

  if (status === "WARNING") {
    return "주의 필요";
  }

  return "확인 필요";
}

function getBasicConditionProgress(formData: ContractFormData): {
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

    Boolean(formData.interestRate !== "" && Number.isFinite(interestRate)),

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

  if (!normalizedMessage) {
    return null;
  }

  for (const clause of clauses) {
    if (!clause.sourceRequest) {
      continue;
    }

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

  return incoming.issues.some((issue) => existingIssueTypes.has(issue.type));
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
      (incomingTitle === existingTitle ||
        (incomingTitle.length >= 5 && existingTitle.includes(incomingTitle)) ||
        (existingTitle.length >= 5 && incomingTitle.includes(existingTitle)))
    ) {
      return existing;
    }

    if (!hasSameIssue(existing, incoming)) {
      continue;
    }

    const sharedKeywords = keywords.filter(
      (keyword) =>
        incomingTitle.includes(keyword) && existingTitle.includes(keyword),
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

    if (!raw) {
      return null;
    }

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
    JSON.stringify({
      question,
      result,
    }),
  );
}

function clearStoredAgentSession() {
  sessionStorage.removeItem(AGENT_SESSION_KEY);
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

  const [question, setQuestion] = useState<string | null>(null);

  const [result, setResult] = useState<ClauseSuggestionResponse | null>(null);

  const [duplicateClause, setDuplicateClause] =
    useState<AppliedContractClause | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const [isStreaming, setIsStreaming] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);

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

  const restoredRef = useRef(false);

  useEffect(() => {
    return () => {
      if (typingTimer.current !== null) {
        window.clearInterval(typingTimer.current);
      }

      if (stepTimer.current !== null) {
        window.clearInterval(stepTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (restoredRef.current) {
      return;
    }

    restoredRef.current = true;

    const stored = loadStoredAgentSession();

    if (!stored) {
      return;
    }

    setQuestion(stored.question);

    setResult(stored.result);

    if (stored.result.suggestedClause) {
      onDraftChange({
        title: stored.result.title,
        content: stored.result.suggestedClause,
        status: "READY",
      });
    }
  }, [onDraftChange]);

  function stopTyping() {
    if (typingTimer.current === null) {
      return;
    }

    window.clearInterval(typingTimer.current);

    typingTimer.current = null;
  }

  function stopStepTimer() {
    if (stepTimer.current === null) {
      return;
    }

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

  function streamClause(response: ClauseSuggestionResponse, apiMs: number) {
    const content = response.suggestedClause;

    if (!content) {
      console.info(`[S-AI PERF] API round trip: ${Math.round(apiMs)}ms`);

      return;
    }

    stopTyping();

    setIsStreaming(true);

    draftStartedAt.current = performance.now();

    onDraftChange({
      title: response.title,
      content: "",
      status: "STREAMING",
    });

    let index = 0;

    const targetFrames = 14;

    const intervalMs = 160;

    const chunkSize = Math.max(1, Math.ceil(content.length / targetFrames));

    typingTimer.current = window.setInterval(() => {
      index = Math.min(index + chunkSize, content.length);

      const finished = index >= content.length;

      onDraftChange({
        title: response.title,
        content: content.slice(0, index),
        status: finished ? "READY" : "STREAMING",
      });

      if (finished) {
        stopTyping();

        setIsStreaming(false);

        const start = draftStartedAt.current;

        const draftMs = start === null ? 0 : performance.now() - start;

        console.info(`[S-AI PERF] API round trip: ${Math.round(apiMs)}ms`);

        console.info(`[S-AI PERF] UI drafting: ${Math.round(draftMs)}ms`);

        console.info(
          `[S-AI PERF] Total perceived: ${Math.round(apiMs + draftMs)}ms`,
        );
      }
    }, intervalMs);
  }

  async function handleSend() {
    const message = input.trim();

    if (!message || disabled || isLoading || isStreaming || result) {
      return;
    }

    setJustApplied(null);

    setDuplicateClause(null);

    setError(null);

    const sameRequestClause = findSameRequestClause(appliedClauses, message);

    if (sameRequestClause) {
      setInput("");

      setQuestion(message);

      setDuplicateClause(sameRequestClause);

      onDraftChange(null);

      console.info("[S-AI DUPLICATE] 동일 요청 감지 - API 호출 생략");

      return;
    }

    setInput("");

    setQuestion(message);

    setResult(null);

    clearStoredAgentSession();

    onDraftChange(null);

    setIsLoading(true);

    startWorkSteps();

    const requestStartedAt = performance.now();

    try {
      const principal = Number(formData.principalAmount);

      const interestRate = Number(formData.interestRate);

      const repaymentDay = Number(formData.repaymentDay);

      const response = await requestClauseSuggestion({
        principalAmount:
          Number.isFinite(principal) && principal > 0 ? principal : null,

        interestRate: Number.isFinite(interestRate) ? interestRate : null,

        lateInterestRate: null,

        startDate: formData.startDate || null,

        maturityDate: formData.maturityDate || null,

        repaymentDay: Number.isFinite(repaymentDay) ? repaymentDay : null,

        repaymentType: formData.repaymentType || null,

        contractAlias: formData.contractAlias.trim() || null,

        terms: formData.terms.trim() || null,

        message,
      });

      const apiMs = performance.now() - requestStartedAt;

      console.info(`[S-AI PERF] API response received: ${Math.round(apiMs)}ms`);

      stopStepTimer();

      setCurrentStep(WORK_STEPS.length - 1);

      const duplicate = findDuplicateClause(appliedClauses, response);

      if (duplicate) {
        clearStoredAgentSession();

        setResult(null);

        setDuplicateClause(duplicate);

        onDraftChange(null);

        console.info(`[S-AI DUPLICATE] 기존 조항 감지: ${duplicate.title}`);

        return;
      }

      saveStoredAgentSession(message, response);

      setResult(response);

      streamClause(response, apiMs);
    } catch (requestError) {
      stopStepTimer();

      onDraftChange(null);

      setError(
        requestError instanceof Error
          ? requestError.message
          : "계약 조항을 검토하는 중 오류가 발생했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleCancel() {
    stopTyping();

    clearStoredAgentSession();

    setIsStreaming(false);

    setQuestion(null);

    setResult(null);

    setDuplicateClause(null);

    setError(null);

    onDraftChange(null);
  }

  function handleApprove() {
    if (!result || !result.suggestedClause || isStreaming) {
      return;
    }

    const slotCount = createClauseSlots(result.suggestedClause).length;

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
    basicConditionProgress.completed < basicConditionProgress.total;

  const resultStatus = result?.validation?.status ?? "REVIEW";

  const resultIssues = Array.isArray(result?.issues) ? result!.issues : [];

  const resultReferences = Array.isArray(result?.references)
    ? result!.references
    : [];

  const resultWarnings = Array.isArray(result?.warnings)
    ? result!.warnings
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
              basicConditionProgress.completed < basicConditionProgress.total
                ? "has-warning"
                : undefined
            }
          >
            기본 조건
            <b>
              {basicConditionProgress.completed}/{basicConditionProgress.total}
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
                  왼쪽 계약서에서 {justApplied.slotCount}개 조건을 확정하면
                  됩니다.
                </small>
              )}
            </div>
          </section>
        )}

        {!question && !result && !isLoading && !duplicateClause && (
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
                <strong>어떤 조건을 계약에 추가하고 싶으신가요?</strong>

                <p>
                  상황을 편하게 말씀해 주세요. 현재 계약을 같이 보면서 실제
                  조항으로 정리해드릴게요.
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
                    setInput("만기 전에 원금을 먼저 갚을 수 있게 하고 싶어요.")
                  }
                >
                  중도상환을 허용하려면?
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setInput("연체했을 때 위약금을 정하고 싶어요.")
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

        {isLoading && (
          <section className="sai-chat-row sai-working">
            <AgentAvatar
              visible={headImageVisible}
              onError={() => setHeadImageVisible(false)}
            />

            <div className="sai-working__content">
              <strong>계약 내용을 확인하고 있어요.</strong>

              <div className="sai-working__steps">
                {WORK_STEPS.map((step, index) => (
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
                ))}
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
                현재 계약의 「{duplicateClause.title}」 조항과 같은 내용으로
                판단해서 새 조항은 추가하지 않았어요.
              </p>

              <button type="button" onClick={handleCancel}>
                확인
              </button>
            </div>
          </section>
        )}

        {result && (
          <section className="sai-result">
            <div className="sai-result__intro">
              <AgentAvatar
                visible={headImageVisible}
                onError={() => setHeadImageVisible(false)}
              />

              <div className="sai-result__intro-text">
                <span>이 조항을 제안할게요</span>

                <h3>{result.title || "추가 조항"}</h3>
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

            {result.summary && (
              <div className="sai-explanation">
                <span>이렇게 판단했어요</span>

                <p>{result.summary}</p>
              </div>
            )}

            {resultReferences.length > 0 && (
              <div className="sai-law-summary">
                <header>
                  <strong>확인한 법령</strong>

                  <span>{resultReferences.length}건</span>
                </header>

                {resultReferences.slice(0, 3).map((reference, index) => (
                  <div key={reference.documentId || `${index}`}>
                    <span>{index === 0 ? "핵심" : "관련"}</span>

                    <p>
                      <strong>
                        {reference.lawName} {reference.articleNumber ?? ""}
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
              <span className={isStreaming ? "is-working" : "is-ready"} />

              <div>
                <strong>
                  {isStreaming
                    ? "왼쪽 계약서에 문구를 작성 중이에요."
                    : "계약서에 초안을 작성했어요."}
                </strong>

                <p>
                  {isStreaming
                    ? "작성되는 문구를 바로 확인할 수 있어요."
                    : "아직 확정 반영 전입니다."}
                </p>
              </div>
            </div>

            {resultWarnings.length > 0 && (
              <div className="sai-warning">
                <strong>적용 전에 확인해 주세요</strong>

                {resultWarnings.map((warning, index) => (
                  <p key={`${index}-${warning}`}>{warning}</p>
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
                disabled={isStreaming || !result.suggestedClause}
                onClick={handleApprove}
              >
                {result.suggestedClause &&
                createClauseSlots(result.suggestedClause).length > 0
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
          disabled={disabled || isLoading || isStreaming || Boolean(result)}
          placeholder="추가하고 싶은 계약 조건을 말씀해 주세요."
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
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
        <img src={HEAD_IMAGE_PATH} alt="S-AI" onError={onError} />
      ) : (
        <span>S-AI</span>
      )}
    </div>
  );
}
