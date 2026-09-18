import { authFetch } from "../../auth/authFetch";
import type {
  CurrentContractConditions,
  ContractChangeRequestInput,
  ContractChangeResult,
} from "../types/contractChange";

function isCurrentContractConditions(
  value: unknown,
): value is CurrentContractConditions {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const c = value as Record<string, unknown>;

  return (
    typeof c.principalAmount === "number" &&
    typeof c.interestRate === "number" &&
    typeof c.maturityDate === "string" &&
    typeof c.repaymentType === "string" &&
    typeof c.repaymentDay === "number" &&
    (typeof c.terms === "string" || c.terms === null)
  );
}

function isContractChangeResult(value: unknown): value is ContractChangeResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const data = value as Record<string, unknown>;

  return typeof data.changeRequestId === "number";
}

export async function getCurrentContractConditions(
  contractId: number,
): Promise<CurrentContractConditions> {
  const response = await authFetch(`/api/contracts/${contractId}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `계약 정보를 불러오지 못했습니다. (HTTP ${response.status})`,
    );
  }

  const data: unknown = await response.json();

  if (!isCurrentContractConditions(data)) {
    throw new Error("계약 정보 응답 형식이 올바르지 않습니다.");
  }

  return data;
}

export async function requestContractChange(
  contractId: number,
  input: ContractChangeRequestInput,
): Promise<ContractChangeResult> {
  const response = await authFetch(
    `/api/contracts/${contractId}/change-requests`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || "변경 요청 중 오류가 발생했습니다.");
  }

  const data: unknown = await response.json();

  if (!isContractChangeResult(data)) {
    throw new Error("응답 형식이 올바르지 않습니다.");
  }

  return data;
}

export async function submitChangeRequestSignature(
  contractId: number,
  changeRequestId: number,
  signature: Blob,
  identityVerificationId: string,
): Promise<void> {
  const form = new FormData();
  form.append("signature", signature, "signature.png");
  form.append("identityVerificationId", identityVerificationId);

  const response = await authFetch(
    `/api/contracts/${contractId}/change-requests/${changeRequestId}/signature`,
    {
      method: "PATCH",
      body: form,
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.message || `서명 제출에 실패했습니다. (HTTP ${response.status})`,
    );
  }
}
