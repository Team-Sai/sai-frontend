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

export interface RepaymentManagementResponse {
    context: RepaymentAnalysisContext;
    agentAnalysis: {
        source: 'AI' | 'RULE_BASED';
        status: 'PAST_DUE' | 'UPCOMING' | 'NO_PAYMENT_THIS_MONTH';
        summary: string;
        plans: RepaymentPlanItem[];
        recommendation: string;
    };
}