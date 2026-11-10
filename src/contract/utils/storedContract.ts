import type { ContractDetail, ContractFormData } from "../types/contract";
import type { AppliedContractClause } from "../types/clauseAgent";

export function toContractFormData(detail: ContractDetail): ContractFormData {
  return {
    relationType: "ACQUAINTANCE",
    principalAmount:
      detail.principalAmount != null ? String(detail.principalAmount) : "",
    interestRate:
      detail.interestRate != null ? String(detail.interestRate) : "",
    repaymentType:
      detail.repaymentType ?? "EQUAL_PRINCIPAL_AND_INTEREST",
    startDate: detail.startDate ?? "",
    maturityDate: detail.maturityDate ?? "",
    repaymentDay:
      detail.repaymentDay != null ? String(detail.repaymentDay) : "",
    contractAlias: detail.contractAlias ?? "",
    terms: detail.terms ?? "",
    creditorAddress: detail.creditorAddress ?? "",
    selectedLinkedAccountId: "",
  };
}

/**
 * ContractFormPage에서 저장한 형식:
 *
 * [추가조항 1] 연체 위약금
 * 조항 본문...
 *
 * [추가조항 2] ...
 * ...
 *
 * 을 다시 기존 AppliedContractClause[] 형태로 복원한다.
 * 상대방 확인 단계에서는 이미 입력 Slot이 실제 값으로 치환되어 저장되어 있으므로
 * slots/references 등의 작성용 메타데이터는 필요하지 않다.
 */
export function parseStoredTerms(
  terms: string | null,
  contractId: string,
): AppliedContractClause[] {
  const source = terms?.trim();

  if (!source) {
    return [];
  }

  const headerPattern = /^\[추가조항\s+(\d+)\]\s*(.*)$/gm;
  const matches = Array.from(source.matchAll(headerPattern));

  if (matches.length === 0) {
    return [
      {
        id: `stored-${contractId}-1`,
        title: "특약사항",
        templateContent: source,
        slots: [],
        source: "AI",
        createdAt: 0,
        summary: "",
        issues: [],
        references: [],
        warnings: [],
      },
    ];
  }

  return matches.map((match, index) => {
    const clauseNumber = match[1] || String(index + 1);
    const title = match[2]?.trim() || `추가 조항 ${clauseNumber}`;

    const headerStart = match.index ?? 0;
    const contentStart = headerStart + match[0].length;
    const nextHeaderStart =
      index + 1 < matches.length
        ? (matches[index + 1].index ?? source.length)
        : source.length;

    const content = source.slice(contentStart, nextHeaderStart).trim();

    return {
      id: `stored-${contractId}-${clauseNumber}`,
      title,
      templateContent: content,
      slots: [],
      source: "AI" as const,
      createdAt: 0,
      summary: "",
      issues: [],
      references: [],
      warnings: [],
    };
  });
}

export function noopFieldChange<K extends keyof ContractFormData>(
  _field: K,
  _value: ContractFormData[K],
) {
  void _field;
  void _value;
  // 읽기 전용 계약서이므로 아무 것도 하지 않는다.
}

export function noopClauseAction(_clauseId: string) {
  void _clauseId;
  // 읽기 전용 계약서에서는 조항 편집/삭제 기능을 제공하지 않는다.
}
