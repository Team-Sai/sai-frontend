import { authFetch } from '../../auth/authFetch';
import type {
    RepaymentManagementResponse,
} from '../types/repaymentManagement';

function isObject(
    value: unknown,
): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isAmount(value: unknown): value is number {
    return (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= 0
    );
}

function isCandidate(value: unknown): boolean {
    if (!isObject(value)) return false;

    return (
        typeof value.contractId === 'number' &&
        typeof value.scheduleId === 'number' &&
        typeof value.contractName === 'string' &&
        typeof value.dueDate === 'string' &&
        isAmount(value.remainingAmount) &&
        typeof value.pastDue === 'boolean'
    );
}

function isPlanItem(value: unknown): boolean {
    if (!isObject(value)) return false;

    return (
        typeof value.priority === 'number' &&
        typeof value.contractId === 'number' &&
        typeof value.scheduleId === 'number' &&
        typeof value.contractName === 'string' &&
        typeof value.dueDate === 'string' &&
        isAmount(value.amount) &&
        typeof value.pastDue === 'boolean' &&
        typeof value.reason === 'string'
    );
}

function isResponse(
    value: unknown,
): value is RepaymentManagementResponse {
    if (!isObject(value)) return false;

    const context = value.context;
    const analysis = value.agentAnalysis;

    if (!isObject(context) || !isObject(analysis)) {
        return false;
    }

    return (
        typeof context.analysisDate === 'string' &&
        typeof context.targetMonth === 'string' &&
        isAmount(context.payableThisMonthAmount) &&
        isAmount(context.overdueAmount) &&
        isAmount(context.totalRequiredAmount) &&
        isAmount(context.totalRemainingAmount) &&
        Array.isArray(context.candidates) &&
        context.candidates.every(isCandidate) &&
        (analysis.source === 'AI' ||
            analysis.source === 'RULE_BASED') &&
        (
            analysis.status === 'PAST_DUE' ||
            analysis.status === 'UPCOMING' ||
            analysis.status === 'NO_PAYMENT_THIS_MONTH'
        ) &&
        typeof analysis.summary === 'string' &&
        typeof analysis.recommendation === 'string' &&
        Array.isArray(analysis.plans) &&
        analysis.plans.every(isPlanItem)
    );
}

export async function getRepaymentPlan(
    signal?: AbortSignal,
): Promise<RepaymentManagementResponse> {
    const response = await authFetch(
        '/api/repayment-management/plan',
        {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal,
        },
    );

    if (!response.ok) {
        throw new Error(
            `상환 안내를 불러오지 못했습니다. (HTTP ${response.status})`,
        );
    }

    const body: unknown = await response.json();

    if (!isResponse(body)) {
        throw new Error('상환 안내 응답 형식이 올바르지 않습니다.');
    }

    return body;
}