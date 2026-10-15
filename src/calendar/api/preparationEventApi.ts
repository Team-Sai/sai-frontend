import { authFetch } from "../../auth/authFetch";

export interface PreparationEvent {
    eventId: number;
    contractId: number;
    scheduleId: number;
    title: string;
    startsAt: string;
    endsAt: string;
}

function isPreparationEvent(
    value: unknown,
): value is PreparationEvent {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const item = value as Record<string, unknown>;

    return (
        Number.isSafeInteger(item.eventId) &&
        Number.isSafeInteger(item.contractId) &&
        Number.isSafeInteger(item.scheduleId) &&
        typeof item.title === "string" &&
        typeof item.startsAt === "string" &&
        Number.isFinite(Date.parse(item.startsAt)) &&
        typeof item.endsAt === "string" &&
        Number.isFinite(Date.parse(item.endsAt))
    );
}

export async function getPreparationEvents(
    yearMonth: string,
    signal?: AbortSignal,
): Promise<PreparationEvent[]> {
    const response = await authFetch(
        `/api/calendar/preparation-events?yearMonth=${encodeURIComponent(yearMonth)}`,
        {
            method: "GET",
            headers: { Accept: "application/json" },
            signal,
        },
    );

    if (!response.ok) {
        throw new Error(
            `상환 준비 일정을 불러오지 못했습니다. (HTTP ${response.status})`,
        );
    }

    const result: unknown = await response.json();

    if (
        !Array.isArray(result) ||
        !result.every(isPreparationEvent)
    ) {
        throw new Error("상환 준비 일정 응답 형식이 올바르지 않습니다.");
    }

    return result;
}