
import type {
  AppliedContractClause,
  ClauseSlot,
  ClauseSlotType,
} from "../types/clauseAgent";

const PLACEHOLDER_REGEX = /\[(?:입력\s*필요\s*:\s*)?((?:(?!\[|\]).)+)\]/g;

/* =========================================
   Label 정리
========================================= */

function normalizeSlotLabel(rawLabel: string): string {
  let label = rawLabel.trim().replace(/\s+/g, " ");

  label = label.replace(/\s*(?:을|를)?\s*(?:기재|입력|작성|정할)\s*것$/, "");

  label = label.replace(/\s*(?:기재|입력|작성)\s*해주세요$/, "");

  return label.trim() || rawLabel.trim();
}

/* =========================================
   Slot 타입 추론
========================================= */

function inferSlotType(rawLabel: string): {
  type: ClauseSlotType;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: string[];
} {
  const label = rawLabel.toLowerCase().replace(/\s+/g, " ");

  /* 통지 방법 */

  if (
    label.includes("통지") &&
    (label.includes("방법") || label.includes("방식") || label.includes("수단"))
  ) {
    return {
      type: "METHOD",
      options: [
        "문자메시지",
        "카카오톡",
        "이메일",
        "서면",
        "내용증명",
        "전자문서",
      ],
    };
  }

  /* 퍼센트 */

  if (
    label.includes("%") ||
    label.includes("비율") ||
    label.includes("이율") ||
    label.includes("위약금률")
  ) {
    return {
      type: "PERCENT",
      min: 0,
      max: 100,
      step: 0.5,
      unit: "%",
    };
  }

  /* 금액 */

  if (
    label.includes("금액") ||
    label.includes("위약금액") ||
    label.includes("변제금")
  ) {
    return {
      type: "MONEY",
      min: 0,
      step: 1000,
      unit: "원",
    };
  }

  /* 개월 */

  if (label.includes("개월")) {
    return {
      type: "MONTHS",
      min: 1,
      max: 120,
      step: 1,
      unit: "개월",
    };
  }

  /* 횟수 */

  if (label.includes("횟수") || label.includes("몇 회")) {
    return {
      type: "COUNT",
      min: 1,
      max: 99,
      step: 1,
      unit: "회",
    };
  }

  /* 일수 */

  if (
    label.includes("유예기간") ||
    label.includes("통지기간") ||
    label.includes("일수") ||
    label.includes("며칠")
  ) {
    return {
      type: "DAYS",
      min: 1,
      max: 3650,
      step: 1,
      unit: "일",
    };
  }

  /* 날짜 */

  if (
    label.includes("날짜") ||
    label.includes("일자") ||
    label.includes("지급일") ||
    label.includes("변제기")
  ) {
    if (!label.includes("및") && label.length < 20) {
      return {
        type: "DATE",
      };
    }
  }

  return {
    type: "TEXT",
  };
}

/* =========================================
   Placeholder 추출
========================================= */

function extractPlaceholders(template: string): Array<{
  raw: string;
  label: string;
  start: number;
  end: number;
}> {
  const results: Array<{
    raw: string;
    label: string;
    start: number;
    end: number;
  }> = [];

  PLACEHOLDER_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;

  while ((match = PLACEHOLDER_REGEX.exec(template)) !== null) {
    const rawLabel = match[1]?.trim();

    if (!rawLabel) {
      continue;
    }

    results.push({
      raw: match[0],
      label: normalizeSlotLabel(rawLabel),
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return results;
}

/* =========================================
   Clause → Slot
========================================= */

export function createClauseSlots(template: string): ClauseSlot[] {
  const placeholders = extractPlaceholders(template);

  return placeholders.map((placeholder, index) => {
    const inferred = inferSlotType(placeholder.label);

    return {
      id: `slot-${index}-${placeholder.label
        .replace(/[^a-zA-Z0-9가-힣]/g, "-")
        .slice(0, 30)}`,
      index,
      label: placeholder.label,
      value: "",
      required: true,
      ...inferred,
    };
  });
}

/* =========================================
   Slot 값 표시
========================================= */

export function formatClauseSlotValue(slot: ClauseSlot): string {
  const value = slot.value.trim();

  if (!value) {
    return "";
  }

  if (slot.type === "MONEY") {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number.toLocaleString("ko-KR") + (slot.unit ?? "");
    }
  }

  if (slot.type === "METHOD" || slot.type === "TEXT" || slot.type === "DATE") {
    return value;
  }

  return value + (slot.unit ?? "");
}

/* =========================================
   Validation
========================================= */

export function getClauseSlotError(slot: ClauseSlot): string | null {
  const value = slot.value.trim();

  if (slot.required && !value) {
    return `${slot.label}을(를) 입력해 주세요.`;
  }

  if (!value) {
    return null;
  }

  if (
    slot.type === "PERCENT" ||
    slot.type === "MONEY" ||
    slot.type === "COUNT" ||
    slot.type === "DAYS" ||
    slot.type === "MONTHS"
  ) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "숫자로 입력해 주세요.";
    }

    if (slot.min !== undefined && number < slot.min) {
      return `${slot.min}${slot.unit ?? ""} 이상이어야 합니다.`;
    }

    if (slot.max !== undefined && number > slot.max) {
      return `${slot.max}${slot.unit ?? ""} 이하로 입력해 주세요.`;
    }

    if (
      (slot.type === "COUNT" ||
        slot.type === "DAYS" ||
        slot.type === "MONTHS") &&
      !Number.isInteger(number)
    ) {
      return "정수로 입력해 주세요.";
    }
  }

  return null;
}

/* =========================================
   미입력 Slot
========================================= */

export function getUnresolvedClauseSlots(
  clause: AppliedContractClause,
): ClauseSlot[] {
  return clause.slots.filter((slot) => Boolean(getClauseSlotError(slot)));
}

/* =========================================
   전체 미입력 수
========================================= */

export function countUnresolvedClauseSlots(
  clauses: AppliedContractClause[],
): number {
  return clauses.reduce(
    (total, clause) => total + getUnresolvedClauseSlots(clause).length,
    0,
  );
}

/* =========================================
   최종 계약 문장
========================================= */

export function renderClauseContent(clause: AppliedContractClause): string {
  const placeholders = extractPlaceholders(clause.templateContent);

  if (placeholders.length === 0) {
    return clause.templateContent;
  }

  let cursor = 0;
  let result = "";

  placeholders.forEach((placeholder, index) => {
    result += clause.templateContent.slice(cursor, placeholder.start);

    const slot = clause.slots[index];

    if (!slot) {
      result += placeholder.raw;
    } else {
      const value = formatClauseSlotValue(slot);

      result += value || `[${slot.label} 미입력]`;
    }

    cursor = placeholder.end;
  });

  result += clause.templateContent.slice(cursor);

  return result;
}

/* =========================================
   Modal preview
========================================= */

export function renderClausePreview(
  template: string,
  slots: ClauseSlot[],
): string {
  const placeholders = extractPlaceholders(template);

  if (placeholders.length === 0) {
    return template;
  }

  let cursor = 0;
  let result = "";

  placeholders.forEach((placeholder, index) => {
    result += template.slice(cursor, placeholder.start);

    const slot = slots[index];

    result += slot
      ? formatClauseSlotValue(slot) || `〈${slot.label}〉`
      : `〈${placeholder.label}〉`;

    cursor = placeholder.end;
  });

  result += template.slice(cursor);

  return result;
}

/* =========================================
   문서 Token
========================================= */

export type ClauseTemplateToken =
  | {
      type: "TEXT";
      value: string;
    }
  | {
      type: "SLOT";
      slotIndex: number;
      label: string;
    };

export function parseClauseTemplate(template: string): ClauseTemplateToken[] {
  const placeholders = extractPlaceholders(template);

  if (placeholders.length === 0) {
    return [
      {
        type: "TEXT",
        value: template,
      },
    ];
  }

  const tokens: ClauseTemplateToken[] = [];

  let cursor = 0;

  placeholders.forEach((placeholder, index) => {
    if (placeholder.start > cursor) {
      tokens.push({
        type: "TEXT",
        value: template.slice(cursor, placeholder.start),
      });
    }

    tokens.push({
      type: "SLOT",
      slotIndex: index,
      label: placeholder.label,
    });

    cursor = placeholder.end;
  });

  if (cursor < template.length) {
    tokens.push({
      type: "TEXT",
      value: template.slice(cursor),
    });
  }

  return tokens;
}

/* =========================================
   예전 저장 데이터 복구
========================================= */

export function repairClauseSlots(
  clause: AppliedContractClause,
): AppliedContractClause {
  const detectedSlots = createClauseSlots(clause.templateContent);

  if (detectedSlots.length === 0) {
    return clause;
  }

  if (clause.slots.length === detectedSlots.length) {
    return clause;
  }

  const repaired = detectedSlots.map((detected, index) => {
    const previous = clause.slots[index];

    if (!previous) {
      return detected;
    }

    return {
      ...detected,
      value: previous.value,
      required: previous.required,
    };
  });

  return {
    ...clause,
    slots: repaired,
  };
}

export function repairAppliedClauseSlots(
  clauses: AppliedContractClause[],
): AppliedContractClause[] {
  return clauses.map(repairClauseSlots);
}
