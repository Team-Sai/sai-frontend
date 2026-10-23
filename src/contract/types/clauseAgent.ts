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
