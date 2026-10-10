import { authFetch } from "../../auth/authFetch";
import type { PreparationEvent } from "./preparationEventApi";

export type Weekday =
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY";

export interface PreparationFunding {
    remainingMonthlyBudget: number;
    availableNow: number;
    expectedIncome: {
        availableDate: string;
        amount: number;
    }[];
}

export interface PreparationFundingAssessment {
    analysisDate: string;
    totalRequiredAmount: number;
    remainingMonthlyBudget: number;
    budgetShortfall: number;
    deadlines: {
        date: string;
        cumulativeRequiredAmount: number;
        availableAmount: number;
        shortfall: number;
    }[];
}

export interface ProposalRequest {
    yearMonth: string;
    allowedDays: Weekday[];
    windowStart: string;
    windowEnd: string;
    durationMinutes: number;
    leadDays: number;
    preferences: string;
    funding: PreparationFunding | null;
}

export interface ProposalItem {
    contractId: number;
    scheduleId: number;
    contractName: string | null;
    remainingAmount: number;
    dueDate: string;
    pastDue: boolean;
    startsAt: string;
    endsAt: string;
    reason: string;
}

export interface RescheduleTarget {
    eventId: number;
    scheduleId: number;
    revision: number;
    startsAt: string;
    endsAt: string;
}

export interface CoordinationFacts {
    outstandingScheduleCount: number;
    existingPreparationEventCount: number;
    targetScheduleCount: number;
    proposedScheduleCount: number;
    sharedTimeGroupCount: number;
    groupedScheduleCount: number;
    allowedDays: Weekday[];
    windowStart: string;
    windowEnd: string;
    leadDays: number;
    requestedPreferences: string;
    reschedule: boolean;
}

export interface ProposalResponse {
    rescheduleTarget: RescheduleTarget | null;
    status:
        | "READY"
        | "NO_TARGET"
        | "REVIEW_REQUIRED"
        | "AI_UNAVAILABLE"
        | "IN_PROGRESS";
    proposedAt: string;
    attempts: number;
    message: string;
    items: ProposalItem[];
    violations: {
        scheduleId: number | null;
        code: string;
        message: string;
    }[];
    proposalId: string | null;
    expiresAt: string | null;
    fundingAssessment: PreparationFundingAssessment | null;
    coordinationFacts: CoordinationFacts | null;
}

export interface ConfirmationResponse {
    proposalId: string;
    confirmedAt: string;
    reused: boolean;
    events: PreparationEvent[];
}

export class PlanningApiError extends Error {
    readonly status: number;
    readonly code: string | null;

    constructor(
        message: string,
        status: number,
        code: string | null = null,
    ) {
        super(message);
        this.name = "PlanningApiError";
        this.status = status;
        this.code = code;
    }
}

function isObject(
    value: unknown,
): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isAmount(value: unknown): value is number {
    return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0
    );
}

function isFundingAssessment(
    value: unknown,
): value is PreparationFundingAssessment {
    if (!isObject(value)) return false;

    return (
        typeof value.analysisDate === "string" &&
        isAmount(value.totalRequiredAmount) &&
        isAmount(value.remainingMonthlyBudget) &&
        isAmount(value.budgetShortfall) &&
        Array.isArray(value.deadlines) &&
        value.deadlines.every((day: unknown) =>
            isObject(day) &&
            typeof day.date === "string" &&
            isAmount(day.cumulativeRequiredAmount) &&
            isAmount(day.availableAmount) &&
            isAmount(day.shortfall),
        )
    );
}

function isTime(value: unknown): value is string {
    return typeof value === "string" &&
        Number.isFinite(Date.parse(value));
}

function isRescheduleTarget(
    value: unknown,
): value is RescheduleTarget {
    if (!isObject(value)) return false;

    return (
        typeof value.eventId === "number" &&
        typeof value.scheduleId === "number" &&
        typeof value.revision === "number" &&
        Number.isInteger(value.revision) &&
        value.revision >= 0 &&
        isTime(value.startsAt) &&
        isTime(value.endsAt)
    );
}

function isItem(value: unknown): value is ProposalItem {
    if (!isObject(value)) return false;

    return (
        typeof value.contractId === "number" &&
        typeof value.scheduleId === "number" &&
        (typeof value.contractName === "string" ||
            value.contractName === null) &&
        typeof value.remainingAmount === "number" &&
        Number.isFinite(value.remainingAmount) &&
        value.remainingAmount >= 0 &&
        typeof value.dueDate === "string" &&
        typeof value.pastDue === "boolean" &&
        isTime(value.startsAt) &&
        isTime(value.endsAt) &&
        typeof value.reason === "string"
    );
}

function isCount(value: unknown): value is number {
    return typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value >= 0;
}

function isCoordinationFacts(
    value: unknown,
): value is CoordinationFacts {
    if (!isObject(value)) return false;

    const weekdays: string[] = [
        "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY",
        "FRIDAY", "SATURDAY", "SUNDAY",
    ];

    const validCounts = [
        value.outstandingScheduleCount,
        value.existingPreparationEventCount,
        value.targetScheduleCount,
        value.proposedScheduleCount,
        value.sharedTimeGroupCount,
        value.groupedScheduleCount,
    ].every(isCount);

    return validCounts &&
        Array.isArray(value.allowedDays) &&
        value.allowedDays.every(
            (day: unknown) =>
                typeof day === "string" && weekdays.includes(day),
        ) &&
        typeof value.windowStart === "string" &&
        typeof value.windowEnd === "string" &&
        isCount(value.leadDays) &&
        value.leadDays <= 14 &&
        typeof value.requestedPreferences === "string" &&
        typeof value.reschedule === "boolean";
}

function isProposal(value: unknown): value is ProposalResponse {
    if (!isObject(value)) return false;

    const statuses = [
        "READY",
        "NO_TARGET",
        "REVIEW_REQUIRED",
        "AI_UNAVAILABLE",
        "IN_PROGRESS",
    ];

    const validViolations =
        Array.isArray(value.violations) &&
        value.violations.every((item: unknown) =>
            isObject(item) &&
            (item.scheduleId === null ||
                typeof item.scheduleId === "number") &&
            typeof item.code === "string" &&
            typeof item.message === "string",
        );

    return (
        typeof value.status === "string" &&
        statuses.includes(value.status) &&
        (value.rescheduleTarget === null ||
            isRescheduleTarget(value.rescheduleTarget)) &&
        isTime(value.proposedAt) &&
        typeof value.attempts === "number" &&
        typeof value.message === "string" &&
        Array.isArray(value.items) &&
        value.items.every(isItem) &&
        validViolations &&
        (value.coordinationFacts === null ||
            isCoordinationFacts(value.coordinationFacts)) &&
        (value.fundingAssessment === null ||
            isFundingAssessment(value.fundingAssessment)) &&
        (value.proposalId === null ||
            typeof value.proposalId === "string") &&
        (value.expiresAt === null || isTime(value.expiresAt)) &&
        (value.status !== "READY" ||
            (typeof value.proposalId === "string" &&
                value.proposalId.length > 0 &&
                isTime(value.expiresAt) &&
                value.items.length > 0))
    );
}

function isEvent(value: unknown): value is PreparationEvent {
    return (
        isObject(value) &&
        typeof value.eventId === "number" &&
        typeof value.contractId === "number" &&
        typeof value.scheduleId === "number" &&
        typeof value.title === "string" &&
        isTime(value.startsAt) &&
        isTime(value.endsAt)
    );
}

function isConfirmation(
    value: unknown,
): value is ConfirmationResponse {
    return (
        isObject(value) &&
        typeof value.proposalId === "string" &&
        isTime(value.confirmedAt) &&
        typeof value.reused === "boolean" &&
        Array.isArray(value.events) &&
        value.events.every(isEvent)
    );
}

async function readResponse<T>(
    response: Response,
    guard: (value: unknown) => value is T,
): Promise<T> {
    let body: unknown;

    try {
        body = await response.json();
    } catch {
        throw new PlanningApiError(
            "서버 응답을 확인하지 못했습니다.",
            response.status,
        );
    }

    if (!response.ok) {
        throw new PlanningApiError(
            isObject(body) && typeof body.message === "string"
                ? body.message
                : `요청에 실패했습니다. (HTTP ${response.status})`,
            response.status,
            isObject(body) && typeof body.code === "string"
                ? body.code
                : null,
        );
    }

    if (!guard(body)) {
        throw new Error("일정 조율 응답 형식이 올바르지 않습니다.");
    }

    return body;
}

export async function createProposal(
    request: ProposalRequest,
    signal?: AbortSignal,
): Promise<ProposalResponse> {
    const response = await authFetch(
        "/api/calendar/preparation-planning/proposals",
        {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
            signal,
        },
    );

    return readResponse(response, isProposal);
}

export async function confirmProposal(
    proposalId: string,
    signal?: AbortSignal,
): Promise<ConfirmationResponse> {
    const response = await authFetch(
        `/api/calendar/preparation-planning/proposals/${encodeURIComponent(proposalId)}/confirm`,
        {
            method: "POST",
            headers: { Accept: "application/json" },
            signal,
        },
    );

    return readResponse(response, isConfirmation);
}

export async function createRescheduleProposal(
    eventId: number,
    request: ProposalRequest,
    signal?: AbortSignal,
): Promise<ProposalResponse> {
    const response = await authFetch(
        `/api/calendar/preparation-planning/events/${eventId}/reschedule-proposals`,
        {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
            signal,
        },
    );

    return readResponse(response, isProposal);
}