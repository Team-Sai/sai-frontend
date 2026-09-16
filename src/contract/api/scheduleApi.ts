import { authFetch } from '../../auth/authFetch';
import type { RepaymentScheduleSummary, RepaymentScheduleRow, ContractDetailForSchedule, ContractInfo } from '../types/schedule';

function isRepaymentScheduleRow(value: unknown): value is RepaymentScheduleRow {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const row = value as Record<string, unknown>;

    return (
        typeof row.scheduleId === 'number' && 
        typeof row.sequence === 'number' && 
        typeof row.dueDate === 'string' &&
        typeof row.totalPaymentDue === 'number' &&
        (typeof row.paidAt === 'string' || row.paidAt === null) &&
        typeof row.status === 'string'
    );
}

function isRepaymentScheduleSummary(value: unknown): value is RepaymentScheduleSummary {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const data = value as Record<string, unknown>;

    return (
        typeof data.creditorName === 'string' &&
        typeof data.debtorName === 'string' &&
        (typeof data.nextDueDate === 'string' || data.nextDueDate === null) &&
        typeof data.totalScheduledAmount === 'number' &&
        typeof data.paidAmount === 'number' &&
        typeof data.remainingAmount === 'number' &&
        typeof data.paidCount === 'number' &&
        typeof data.totalCount === 'number' &&
        Array.isArray(data.schedules) &&
        data.schedules.every(isRepaymentScheduleRow)
    );
}

function isContractInfo(value: unknown): value is ContractInfo {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const info = value as Record<string, unknown>;

    return (
        typeof info.contractAlias === 'string' &&
        typeof info.status === 'string' &&
        typeof info.interestRate === 'number' &&
        typeof info.maturityDate === 'string' &&
        typeof info.repaymentType === 'string' &&
        typeof info.createdAt === 'string'
    );
}

function isContractDetailForSchedule(value: unknown): value is ContractDetailForSchedule {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const data = value as Record<string, unknown>;

    return (
        typeof data.isCreditor === 'boolean' &&
        typeof data.contract === 'object' &&
        data.contract !== null &&
        isContractInfo(data.contract)
    );
}

export async function getScheduleSummary(contractId: number): Promise<RepaymentScheduleSummary> {
    const response = await authFetch(`/api/contracts/${contractId}/schedules`, {
        method: 'GET',
        headers: {Accept: 'application/json'},
    });

    if (!response.ok) {
        throw new Error(`상환스케줄 정보를 불러오지 못했습니다. (HTTP ${response.status})`);
    }

    const data: unknown = await response.json();

    if (!isRepaymentScheduleSummary(data)) {
        throw new Error('상환스케줄 응답 형식이 올바르지 않습니다.');
    }

    return data;
}

export async function getContractDetailForSchedule(contractId: number): Promise<ContractDetailForSchedule> {
    const response = await authFetch(`/api/contracts/${contractId}/contract-detail`, {
        method: 'GET',
        headers: {Accept: 'application/json'},
    });

    if (!response.ok) {
        throw new Error(`계약 정보를 불러오지 못했습니다. (HTTP ${response.status})`);
    }

    const data: unknown = await response.json();

    if (!isContractDetailForSchedule(data)) {
        throw new Error('계약 정보 응답 형식이 올바르지 않습니다.');
    }

    return data;
}