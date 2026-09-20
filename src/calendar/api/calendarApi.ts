import { authFetch } from "../../auth/authFetch";
import type { CalendarDayMarker, CalendarItem } from "../types/calendar";

function isCalendarDayMarker(value: unknown): value is CalendarDayMarker {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const d = value as Record<string, unknown>;

    return (
        typeof d.date === 'string' &&
        typeof d.hasInbound === 'boolean' &&
        typeof d.hasOutbound === 'boolean'
    );
}

function isCalendarDayMarkerList(value: unknown): value is CalendarDayMarker[] {
    return Array.isArray(value) && value.every(isCalendarDayMarker);
}

function isCalendarItem(value: unknown): value is CalendarItem {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const d = value as Record<string, unknown>;

     return (
    typeof d.targetId === "number" &&
    (d.type === "LOAN" || d.type === "SETTLEMENT") &&
    typeof d.title === "string" &&
    typeof d.subLabel === "string" &&
    typeof d.amount === "number" &&
    typeof d.detailUrl === "string" &&
    (typeof d.counterpartyName === "string" || d.counterpartyName === null) &&
    (typeof d.categoryLabel === "string" || d.categoryLabel === null) &&
    (typeof d.installmentInfo === "string" || d.installmentInfo === null) &&
    typeof d.overdue === "boolean" &&
    (typeof d.maturityDate === "string" || d.maturityDate === null) &&
    (typeof d.principalAmount === "number" || d.principalAmount === null) &&
    (typeof d.interestRate === "number" || d.interestRate === null) &&
    (typeof d.settlementTypeLabel === "string" || d.settlementTypeLabel === null) &&
    (typeof d.splitTypeLabel === "string" || d.splitTypeLabel === null) &&
    (typeof d.periodStartDate === "string" || d.periodStartDate === null) &&
    (typeof d.periodEndDate === "string" || d.periodEndDate === null)
  );
}

function isCalendarItemList(value: unknown): value is CalendarItem[] {
    return Array.isArray(value) && value.every(isCalendarItem);
}

export async function getMonthCalendarDays(
    yearMonth: string,
) : Promise<CalendarDayMarker[]> {
    const response = await authFetch(
        `/api/integration/dashboard?yearMonth=${yearMonth}`,
        {
            method: 'GET',
            headers: {Accept: 'application/json'},
        },
    );

    if (!response.ok) {
        throw new Error(`캘린더 정보를 불러오지 못했습니다. (HTTP ${response.status})`);
    }

    const data: unknown = await response.json();

    if (
        typeof data !== 'object' ||
        data === null ||
        !('calendarDays' in data) ||
        !isCalendarDayMarkerList((data as Record<string, unknown>).calendarDays)
    ) {
        throw new Error("캘린더 응답 형식이 올바르지 않습니다.");
    }

    return (data as Record<string, unknown>).calendarDays as CalendarDayMarker[];
}

export async function getCalendarDayDetail(
    dateStr: string,
): Promise<CalendarItem[]> {
    const response = await authFetch(`/api/dashboard/calendar/${dateStr}`, {
        method: 'GET',
        headers: {Accept: 'application/json'},
    });

    if (!response.ok) {
        throw new Error(`일정 정보를 불러오지 못했습니다. (HTTP ${response.status})`);
    }

    const data: unknown = await response.json();

    if (!isCalendarItemList(data)) {
        throw new Error("일정 응답 형식이 올바르지 않습니다.");
    }

    return data;
}