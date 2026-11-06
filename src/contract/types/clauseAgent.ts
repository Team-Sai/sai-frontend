export interface ClauseSuggestionRequest {
  principalAmount: number | null;
  interestRate: number | null;
  lateInterestRate: number | null;
  startDate: string | null;
  maturityDate: string | null;
  repaymentDay: number | null;
  repaymentType: string | null;
  contractAlias: string | null;
  terms: string | null;
  message: string;
}

export interface ClauseIssue {
  type: string;
  reason: string;
}

export interface ClauseReference {
  documentId: string;
  lawName: string;
  articleNumber: string | null;
  articleTitle: string | null;
  content: string;
  vectorScore: number;
  rerankScore: number;
  finalScore: number;
  matchedIssue: string;
}

export type ClauseValidationStatus = "PASS" | "REVIEW" | "WARNING";

export interface ClauseValidationCheck {
  type: string;
  status: ClauseValidationStatus;
  message: string;
}

export interface ClauseValidation {
  status: ClauseValidationStatus;
  isSafeToSuggest: boolean;
  checks: ClauseValidationCheck[];
}

export interface ClauseUnresolvedDecision {
  name: string;
  reason: string;
}

export interface ClauseSuggestionResponse {
  message: string;
  issues: ClauseIssue[];
  title: string;
  summary: string;
  suggestedClause: string | null;
  warnings: string[];
  validation: ClauseValidation;
  references: ClauseReference[];

    unresolvedDecisions?: ClauseUnresolvedDecision[];
  /** 스트리밍에서만: 검증 과정에서 초안 문장이 수정됐는지 */
  clauseRevised?: boolean;
}

/** 스트리밍 진행 단계 (AI 서버가 보내는 progress 이벤트) */
export type ClauseStreamStep =
  | "analysis"
  | "retrieval"
  | "generation"
  | "validation";

/** 생성 직후 받은 조항 초안 (검증 전이라 계약서에 반영할 수 없다) */
export interface ClauseDraft {
  title: string;
  summary: string;
  suggestedClause: string;
  warnings: string[];
  references: ClauseReference[];
  unresolvedDecisions: ClauseUnresolvedDecision[];
}

export type ClauseSlotType =
  | "PERCENT"
  | "MONEY"
  | "COUNT"
  | "DAYS"
  | "MONTHS"
  | "DATE"
  | "METHOD"
  | "TEXT";

export interface ClauseSlot {
  id: string;
  index: number;
  label: string;
  type: ClauseSlotType;
  value: string;
  required: boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: string[];
}

export interface AppliedContractClause {
  id: string;

  title: string;

  templateContent: string;

  slots: ClauseSlot[];

  source: "AI";

  createdAt: number;

  summary: string;

  issues: ClauseIssue[];

  references: ClauseReference[];

  warnings: string[];

  /*
   * 어떤 사용자 요청으로 만들어진 조항인지 보존.
   *
   * 같은 질문을 다시 입력했을 때
   * AI 요청 자체를 보내지 않고 중복 차단하는 데 사용.
   */
  sourceRequest?: string;
  
  /* 사용자가 직접 고친 뒤의 다시 검토 상태 (없으면 AI가 쓴 그대로) */
  review?: ClauseReviewState;
}

export interface DraftContractClause {
  title: string;

  content: string;

  /*
   * STREAMING: 계약서에 글자가 써지는 중
   * REVIEWING: 다 써졌지만 아직 검증 중 (반영 불가)
   * READY: 검증까지 끝남
   */
  status: "STREAMING" | "REVIEWING" | "READY";

  
  /*
   * true면 AI가 실제로 쓰는 글자를 그대로 보여주는 중이라
   * 타이핑 연출(한 글자씩 다시 쓰기)을 하지 않는다.
   */
  live?: boolean;

  /* 글자가 오기 전, 조항 자리에 보여줄 안내 (예: "관련 법령을 확인하고 있어요") */
  placeholder?: string;
}


/* ============================================================
 * 대화형 AI 특약 (백엔드 /api/contracts/clause-chat)
 * ============================================================ */

/** AI가 요청에서 읽어 낸 값 하나 (예: 연속 연체 기간 = 3개월) */
export interface ClauseChatSlot {
  name: string;
  kind: string;
  value: string;
  /** 계약서 값과 다를 때 원래 값 (예: 연 5%) */
  from: string | null;
  field: string | null;
  condition: string | null;
  inMessage: boolean;
  confirmed: boolean;
}

/** 버튼으로 답할 수 있는 질문 */
export interface ClauseChatQuestion {
  id: string;
  text: string;
  options: string[];
}

/** "이건 특약이 아니라 계약서 칸을 고치세요" 안내 */
export interface ClauseChatFieldEdit {
  field: string;
  label: string;
  value: string;
  current: string;
}

export interface ClauseChatStartResponse {
  /** 범위 밖이거나 계약서 칸 안내면 null (대화를 이어갈 수 없음) */
  sessionId: string | null;
  inScope: boolean;
  summary: string | null;
  slots: ClauseChatSlot[];
  questions: ClauseChatQuestion[];
  fieldEdits: ClauseChatFieldEdit[];
  guide: string | null;
  /** 보증처럼 꼭 알려야 하는 법령 안내 */
  notices: string[];
}

export type ClauseChatReplyKind =
  | "ANSWER"
  | "VALUE_CHANGE"
  | "UNKNOWN"
  | "CONFIRM"
  | "REJECT"
  | "AMBIGUOUS";

export interface ClauseChatReplyResponse {
  kind: ClauseChatReplyKind;
  /** 화면에 AI 말로 보여줄 짧은 답 (예: "확인했어요. 이대로 특약을 쓸게요.") */
  echo: string | null;
  slots: ClauseChatSlot[];
  pendingQuestions: ClauseChatQuestion[];
  /** true면 [작성하기]를 누를 수 있다 */
  readyToWrite: boolean;
}

/* ============================================================
 * 반영한 AI 조항 다시 검토 (백엔드 /api/contracts/clause-review)
 * ============================================================ */

export interface ClauseReviewRequest {
  /** 조항을 만들 때 보낸 계약 정보와 원래 요청 */
  request: ClauseSuggestionRequest;
  /** 그때 받은 쟁점 (type만 보낸다) */
  issues: { type: string }[];
  /** 사용자가 채우거나 고친 조항 문장 */
  clause: string;
}

export interface ClauseReviewResponse {
  status: ClauseValidationStatus;
  isSafeToSuggest: boolean;
  checks: ClauseValidationCheck[];
  warnings: string[];
  /** 아직 채우지 않은 [입력 필요] 칸 이름 */
  openSlots: string[];
  /** 검증에서 문장을 고쳤을 때만 있다 (반영은 사용자가 고른다) */
  suggestedClause: string | null;
}

export interface ClauseReviewState {
  /*
   * NEEDS_REVIEW: 직접 고쳐서 확인이 필요함
   * REVIEWING: AI가 다시 검토하는 중
   * DONE: 검토가 끝남 (result에 결과)
   */
  status: "NEEDS_REVIEW" | "REVIEWING" | "DONE";
  result?: ClauseReviewResponse;
  error?: string;
}
