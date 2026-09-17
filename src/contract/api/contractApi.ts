import { authFetch } from '../../auth/authFetch';
import type { LinkedBankAccount } from '../../accounts/types/account';
import type { ContractDetail, LoanContractDraft, LoanContractResponse } from '../types/contract';

function isLinkedBankAccount(value: unknown): value is LinkedBankAccount {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const account = value as Record<string, unknown>;

  return (
      typeof account.linkedAccountId === 'number' &&
      typeof account.bankCode === 'string' &&
      typeof account.bankName === 'string' &&
      typeof account.maskedAccountNumber === 'string' &&
      (typeof account.accountAlias === 'string' || account.accountAlias === null) &&
      typeof account.accountHolderName === 'string' &&
      typeof account.balance === 'number' &&
      typeof account.connectionStatus === 'string'
  );
}

function isLinkedBankAccountList(value: unknown): value is LinkedBankAccount[] {
  return Array.isArray(value) && value.every(isLinkedBankAccount);
}

export async function getSelectableAccounts(): Promise<LinkedBankAccount[]> {
  const response = await authFetch('/api/contracts/accounts', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`선택 가능한 계좌 목록을 불러오지 못했습니다. (HTTP ${response.status})`);
  }

  const data: unknown = await response.json();

  if (!isLinkedBankAccountList(data)) {
    throw new Error('계좌 목록 응답 형식이 올바르지 않습니다.');
  }

  return data;
}

export async function getPreviousPrincipalSum(): Promise<number> {
  const response = await authFetch('/api/contracts/previous-sum', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`이전 차용금 합계를 불러오지 못했습니다. (HTTP ${response.status})`);
  }

  const data: unknown = await response.json();

  if (typeof data !== 'number') {
    throw new Error('이전 차용금 합계 응답 형식이 올바르지 않습니다.');
  }

  return data;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null);
  return body && typeof body.message === 'string' ? body.message : fallback;
}

export async function createContract(
    draft: LoanContractDraft,
    identityVerificationId: string,
): Promise<number> {
  const response = await authFetch('/api/contracts/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...draft, identityVerificationId }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `차용증 생성에 실패했습니다. (HTTP ${response.status})`));
  }

  const contractId: unknown = await response.json();

  if (typeof contractId !== 'number') {
    throw new Error('차용증 생성 응답 형식이 올바르지 않습니다.');
  }

  return contractId;
}

export async function submitCreditorSignature(
    contractId: number,
    debtorUserToken: string,
    signature: Blob,
): Promise<string> {
  const form = new FormData();
  form.append('debtorUserToken', debtorUserToken);
  form.append('signature', signature, 'signature.png');

  const response = await authFetch(`/api/contracts/${contractId}/signature`, {
    method: 'PATCH',
    body: form,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `서명 제출에 실패했습니다. (HTTP ${response.status})`));
  }

  return response.json();
}

export interface ContractSummary {
  previousContractId: number | null;
}

export async function getContractDetail(contractId: number): Promise<ContractDetail> {
  const response = await authFetch(`/api/contracts/${contractId}/listdetails`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const error = new Error(`차용증 정보를 불러오지 못했습니다. (HTTP ${response.status})`) as Error & {
      status: number;
    };
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export async function getContractSummary(contractId: number): Promise<ContractSummary> {
  const data = await getContractDetail(contractId);
  return { previousContractId: data.previousContractId };
}

export async function getLoanContract(contractId: number): Promise<LoanContractResponse> {
  const response = await authFetch(`/api/contracts/${contractId}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`차용증 정보를 불러오지 못했습니다. (HTTP ${response.status})`);
  }

  return response.json();
}

export async function linkAsDebtor(contractId: number): Promise<void> {
  const response = await authFetch(`/api/contracts/${contractId}/debtor`, {
    method: 'PATCH',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, '계약서에 채무자로 연결하지 못했습니다.'));
  }
}

export async function submitDebtorApproval(
    contractId: number,
    debtorAddress: string,
    signature: Blob,
    identityVerificationId: string,
): Promise<void> {
  const form = new FormData();
  form.append('debtorAddress', debtorAddress);
  form.append('signature', signature, 'signature.png');
  form.append('identityVerificationId', identityVerificationId);

  const response = await authFetch(`/api/contracts/${contractId}/approve`, {
    method: 'PATCH',
    body: form,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `서명 제출에 실패했습니다. (HTTP ${response.status})`));
  }
}
