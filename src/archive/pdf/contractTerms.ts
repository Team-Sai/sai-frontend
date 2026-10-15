export interface ArchivedAdditionalClause {
  title: string;
  content: string;
}

/*
 * 현재 ContractFormPage에서 저장하는 형태:
 *
 * [추가조항 1] 중도상환
 * 채무자는 ...
 *
 * [추가조항 2] 연체 통지
 * 채무자가 ...
 *
 * 를 다시 각각의 계약 조항으로 분리한다.
 */
export function parseArchivedContractTerms(
  terms: string | null | undefined,
): ArchivedAdditionalClause[] {
  if (!terms?.trim()) {
    return [];
  }

  const normalized = terms.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  const pattern =
    /\[추가조항\s+\d+\]\s*([^\n]+)\n([\s\S]*?)(?=\n{2,}\[추가조항\s+\d+\]|\s*$)/g;

  const clauses: ArchivedAdditionalClause[] = [];

  let match: RegExpExecArray | null;

  while ((match = pattern.exec(normalized)) !== null) {
    const title = match[1]?.trim();

    const content = match[2]?.trim();

    if (!title || !content) {
      continue;
    }

    clauses.push({
      title,
      content,
    });
  }

  /*
   * 이전 계약처럼 일반 문자열 하나만 저장되어 있으면
   * 데이터가 사라지면 안 되므로 하나의 추가 약정으로 취급.
   */
  if (clauses.length === 0) {
    return [
      {
        title: "추가 약정",

        content: normalized,
      },
    ];
  }

  return clauses;
}
