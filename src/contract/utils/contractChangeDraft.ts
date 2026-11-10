import type { ContractChangeRequestInput } from "../types/contractChange";
import type { RepaymentMethod } from "../types/schedule";

const CONTRACT_CHANGE_DRAFT_KEY = "contractChangeDraft";

/** 전자서명 제출 전까지 서버에 저장하지 않고 탭에 보관하는 변경 요청 입력값 */
export interface ContractChangeDraft {
  contractId: string;
  changeReason: string;
  newMaturityDate: string;
  newInterestRate: string;
  newRepaymentType: string;
  newRepaymentDate: string;
  newTerms: string;
}

const DRAFT_FIELDS = [
  "contractId",
  "changeReason",
  "newMaturityDate",
  "newInterestRate",
  "newRepaymentType",
  "newRepaymentDate",
  "newTerms",
] as const satisfies readonly (keyof ContractChangeDraft)[];

function isContractChangeDraft(value: unknown): value is ContractChangeDraft {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const draft = value as Record<string, unknown>;

  return DRAFT_FIELDS.every((field) => typeof draft[field] === "string");
}

export function loadContractChangeDraft(
  contractId: string,
): ContractChangeDraft | null {
  try {
    const raw = sessionStorage.getItem(CONTRACT_CHANGE_DRAFT_KEY);
    const draft: unknown = raw ? JSON.parse(raw) : null;

    return isContractChangeDraft(draft) && draft.contractId === contractId
      ? draft
      : null;
  } catch {
    return null;
  }
}

export function saveContractChangeDraft(draft: ContractChangeDraft) {
  sessionStorage.setItem(CONTRACT_CHANGE_DRAFT_KEY, JSON.stringify(draft));
}

export function clearContractChangeDraft() {
  sessionStorage.removeItem(CONTRACT_CHANGE_DRAFT_KEY);
}

export function toContractChangeInput(
  draft: ContractChangeDraft,
): ContractChangeRequestInput {
  return {
    changeReason: draft.changeReason,
    newMaturityDate: draft.newMaturityDate || null,
    newInterestRate: draft.newInterestRate
      ? Number(draft.newInterestRate)
      : null,
    newRepaymentType: (draft.newRepaymentType || null) as RepaymentMethod | null,
    newRepaymentDate: draft.newRepaymentDate
      ? Number(draft.newRepaymentDate)
      : null,
    newTerms: draft.newTerms.trim() || null,
  };
}
