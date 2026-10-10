export interface RepaymentCandidate {
    contractId: number;
    scheduleId: number;
    contractName: string;
    dueDate: string;
    remainingAmount: number;
    pastDue: boolean;
}

export interface RepaymentAnalysisContext {
    analysisDate: string;
    targetMonth: string;
    payableThisMonthAmount: number;
    overdueAmount: number;
    totalRequiredAmount: number;
    totalRemainingAmount: number;
    candidates: RepaymentCandidate[];
}

export interface RepaymentPlanItem {
    priority: number;
    contractId: number;
    scheduleId: number;
    contractName: string;
    dueDate: string;
    amount: number;
    pastDue: boolean;
    reason: string;
}

export type RepaymentFallbackReason =
    | 'ANALYSIS_IN_PROGRESS'
    | 'WAIT_TIMEOUT'
    | 'COOLDOWN'
    | 'AI_UNAVAILABLE'
    | 'REDIS_UNAVAILABLE'
    | 'RESULT_NOT_SAVED'
    | 'SERVICE_BUSY'
    | 'INTERRUPTED'
    | 'JOB_FAILURE';

export interface RepaymentManagementResponse {
    context: RepaymentAnalysisContext;
    agentAnalysis: {
        source: 'AI' | 'RULE_BASED';
        status: 'PAST_DUE' | 'UPCOMING' | 'NO_PAYMENT_THIS_MONTH';
        summary: string;
        plans: RepaymentPlanItem[];
        recommendation: string;
    };
    metadata: {
        analyzedAt: string | null;
        checkedAt: string;
        reused: boolean;
        delivery:
            | 'GENERATED'
            | 'CACHE'
            | 'SHARED'
            | 'FALLBACK'
            | 'EMPTY';
        fallbackReason: RepaymentFallbackReason | null;
        retryAfterSeconds: number | null;
    };
}