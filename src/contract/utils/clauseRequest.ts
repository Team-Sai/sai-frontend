import type { ContractFormData } from "../types/contract";
import type { ClauseSuggestionRequest } from "../types/clauseAgent";

/* 계약서 칸 값과 사용자 요청으로 AI 특약 요청을 만든다. (대화형 시작·다시 검토가 같이 쓴다) */
export function toClauseSuggestionRequest(
  formData: ContractFormData,
  message: string,
): ClauseSuggestionRequest {
  const principal = Number(formData.principalAmount);
  const interestRate = Number(formData.interestRate);
  const repaymentDay = Number(formData.repaymentDay);

  return {
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
}