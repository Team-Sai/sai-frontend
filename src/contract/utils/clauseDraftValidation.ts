export interface ClauseDraftProblem {
  type: "PLACEHOLDER";

  message: string;
}

/*
 * AI가 아직 확정하지 못한 빈칸 표현을 찾는다.
 */
export function findClauseDraftProblems(clause: string): ClauseDraftProblem[] {
  const problems: ClauseDraftProblem[] = [];

  const bracketPattern = /\[[^\]]+\]/g;

  const bracketMatches = clause.match(bracketPattern);

  if (bracketMatches && bracketMatches.length > 0) {
    problems.push({
      type: "PLACEHOLDER",

      message: `확정되지 않은 항목이 있습니다: ${bracketMatches.join(", ")}`,
    });
  }

  if (/_{2,}/.test(clause)) {
    problems.push({
      type: "PLACEHOLDER",

      message: "비어 있는 입력란(____)이 남아 있습니다.",
    });
  }

  if (/○{2,}|□{2,}|X{2,}/i.test(clause)) {
    problems.push({
      type: "PLACEHOLDER",

      message: "확정되지 않은 표시가 남아 있습니다.",
    });
  }

  return problems;
}

export function hasUnresolvedClauseDraft(clause: string): boolean {
  return findClauseDraftProblems(clause).length > 0;
}
