import { authFetch } from "../../auth/authFetch";
import type { ContractDocument, ContractDocumentDetail } from "../types/contractDocument";

function isContractDocument(value: unknown): value is ContractDocument {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const doc = value as Record<string, unknown>;

    return (
        typeof doc.contractAlias === 'string' &&
        typeof doc.status === 'string' &&
        typeof doc.interestRate === 'number' &&
        typeof doc.maturityDate === 'string' &&
        typeof doc.repaymentType === 'string' &&
        typeof doc.createdAt === 'string' &&
        typeof doc.creditorName === 'string' &&
        typeof doc.debtorName === 'string' &&
        typeof doc.principalAmount === 'number' &&
        typeof doc.startDate === 'string' &&
        typeof doc.repaymentDay === 'number' &&
        (typeof doc.terms === 'string' || doc.terms === null)
    );
}

function isContractDocumentDetail(value: unknown): value is ContractDocumentDetail {
    if(typeof value !== 'object' || value === null) {
        return false;
    }

    const data = value as Record<string, unknown>;

    return (
        typeof data.isCreditor === 'boolean' &&
        typeof data.canRequestChange === 'boolean' &&
        typeof data.contract === 'object' &&
        data.contract !== null &&
        isContractDocument(data.contract)
    );
}

export async function getContractDocument(contractId: number): Promise<ContractDocumentDetail> {
    const response = await authFetch(`/api/contracts/${contractId}/contract-detail`, {
        method: 'GET',
        headers: {Accept: "application/json"},
    });

    if (!response.ok) {
        throw new Error(`계약서 정보를 불러오지 못했습니다. (HTTP ${response.status})`);
    }

    const data: unknown = await response.json();

    if (!isContractDocumentDetail(data)) {
        throw new Error("계약서 응답 형식이 올바르지 않습니다.");
    }

    return data;
}