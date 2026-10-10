import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import LoadingSkeleton from "../../common/components/LoadingSkeleton";
import "../styles/CalendarPage.css";
import {
  getMonthCalendarDays,
  getCalendarDayDetail,
  getCalendarMonthDetail,
} from "../api/calendarApi";

import type {
  CalendarDayMarker,
  CalendarItem,
  CalendarDateItems,
} from "../types/calendar";
import PreparationPlanner from "../components/PreparationPlanner";
import {
  getPreparationEvents,
} from "../api/preparationEventApi";

import type {
  PreparationEvent,
} from "../api/preparationEventApi";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toYearMonthString(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseCalendarDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (y < 2000 || y > 9999) return null;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1
  && date.getDate() === d ? date : null;
}

function getMatchingDayInMonth(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, Math.min(day, lastDay));
}

function formatSelectedDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  }).format(new Date(year, month - 1, day));
}

function buildMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const gridStart = new Date(year, month - 1, 1 - firstOfMonth.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function formatWon(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}원`;
}

function compactWon(amount: number): string {
  if (amount >= 10_000) {
    return `${new Intl.NumberFormat("ko-KR", {
      maximumFractionDigits: 4,
    }).format(amount / 10_000)}만원`;
  }

  return `${amount.toLocaleString("ko-KR")}원`;
}

const INBOUND_SUB_LABELS = new Set(["수취예정", "받을 돈"]);

function isInboundItem(item: CalendarItem): boolean {
  return INBOUND_SUB_LABELS.has(item.subLabel);
}

function preparationDate(value: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));

  const part = (type: string) =>
      parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function preparationTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function CalendarPageContent({ initialDate }: { initialDate: Date }) {
  const navigate = useNavigate();
  const today = new Date();

  const [year, setYear] = useState(initialDate.getFullYear());
  const [month, setMonth] = useState(initialDate.getMonth() + 1);
  const [markers, setMarkers] = useState<CalendarDayMarker[]>([]);
  const [isLoadingMonth, setIsLoadingMonth] = useState(true);
  const [monthError, setMonthError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(toDateString(initialDate));
  const [dayItems, setDayItems] = useState<CalendarItem[]>([]);
  const [isLoadingDay, setIsLoadingDay] = useState(true);
  const [dayError, setDayError] = useState<string | null>(null);

  const [preparationEvents, setPreparationEvents] =
      useState<PreparationEvent[]>([]);

  const [preparationLoading, setPreparationLoading] =
      useState(true);

  const [preparationError, setPreparationError] =
      useState<string | null>(null);

  const markerByDate = useMemo(() => {
    const map = new Map<string, CalendarDayMarker>();
    markers.forEach((m) => map.set(m.date, m));
    return map;
  }, [markers]);

  const [preparationVersion, setPreparationVersion] = useState(0);

  const [rescheduleEvent, setRescheduleEvent] =
      useState<PreparationEvent | null>(null);

  const [plannerInteractionLocked, setPlannerInteractionLocked] =
      useState(false);

  const [rescheduleNow, setRescheduleNow] = useState(
      () => Date.now(),
  );

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const monthCounts = useMemo(() => {
    let inboundDays = 0;
    let outboundDays = 0;
    markers.forEach((m) => {
      if (m.hasInbound) inboundDays += 1;
      if (m.hasOutbound) outboundDays += 1;
    });
    return { inboundDays, outboundDays };
  }, [markers]);

  const [monthDetails, setMonthDetails] =
      useState<CalendarDateItems[]>([]);

  const [monthDetailError, setMonthDetailError] =
      useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRescheduleNow(Date.now());
    }, 5_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMonthCalendarDays(toYearMonthString(year, month))
      .then((res) => {
        if (cancelled) return;
        setMarkers(res);
        setMonthError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setMarkers([]);
        setMonthError("캘린더 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMonth(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  useEffect(() => {
    let cancelled = false;
    getCalendarDayDetail(selectedDate)
      .then((res) => {
        if (cancelled) return;
        setDayItems(res);
        setDayError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setDayError("일정 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDay(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    getPreparationEvents(
        toYearMonthString(year, month),
        controller.signal,
    )
        .then((events) => {
          if (!active) return;
          setPreparationEvents(events);
        })
        .catch((cause: unknown) => {
          if (!active || controller.signal.aborted) return;

          setPreparationError(
              cause instanceof Error
                  ? cause.message
                  : "상환 준비 일정을 불러오지 못했습니다.",
          );
        })
        .finally(() => {
          if (active) setPreparationLoading(false);
        });

    return () => {
      active = false;
      controller.abort();
    };
  }, [year, month, preparationVersion]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    getCalendarMonthDetail(
        toYearMonthString(year, month),
        controller.signal,
    )
        .then((result) => {
          if (!active) return;

          setMonthDetails(result);
          setMonthDetailError(null);
        })
        .catch((cause: unknown) => {
          if (!active || controller.signal.aborted) return;

          setMonthDetails([]);
          setMonthDetailError(
              cause instanceof Error
                  ? cause.message
                  : "날짜별 금액을 불러오지 못했습니다.",
          );
        });

    return () => {
      active = false;
      controller.abort();
    };
  }, [year, month]);

  function resetPreparationState() {
    setPreparationLoading(true);
    setPreparationError(null);
    setPreparationEvents([]);
  }

  function refreshPreparationEvents() {
    setPreparationLoading(true);
    setPreparationError(null);
    setPreparationVersion((value) => value + 1);
  }

  function handlePreparationRegistered() {
    setRescheduleEvent(null);
    refreshPreparationEvents();
  }

  function changeMonth(offset: number) {
    if (plannerInteractionLocked) return;

    setRescheduleEvent(null);
    const next = new Date(year, month - 1 + offset, 1);
    const nextYear = next.getFullYear();
    const nextMonth = next.getMonth() + 1;

    resetPreparationState();

    setIsLoadingMonth(true);
    setMonthError(null);
    setMonthDetails([]);
    setMonthDetailError(null);
    setYear(nextYear);
    setMonth(nextMonth);

    const selectedDay = Number(selectedDate.slice(-2));
    const nextSelected = getMatchingDayInMonth(
        nextYear,
        nextMonth,
        selectedDay,
    );

    setIsLoadingDay(true);
    setDayError(null);
    setDayItems([]);
    setSelectedDate(toDateString(nextSelected));
  }

  function goPrevMonth() {
    changeMonth(-1);
  }

  function goNextMonth() {
    changeMonth(1);
  }

  function selectDate(date: Date, inCurrentMonth: boolean) {
    if (!inCurrentMonth) {
      if (plannerInteractionLocked) return;

      setRescheduleEvent(null);
    }
    const dateStr = toDateString(date);

    if (inCurrentMonth) {
      setIsLoadingDay(true);
      setDayError(null);
      setDayItems([]);
      setSelectedDate(dateStr);
      return;
    }

    resetPreparationState();

    setIsLoadingMonth(true);
    setMonthError(null);
    setMonthDetails([]);
    setMonthDetailError(null);
    setYear(date.getFullYear());
    setMonth(date.getMonth() + 1);

    setIsLoadingDay(true);
    setDayError(null);
    setDayItems([]);
    setSelectedDate(dateStr);
  }

  const preparationDates = useMemo(
      () => new Set(
          preparationEvents.map((event) =>
              preparationDate(event.startsAt),
          ),
      ),
      [preparationEvents],
  );

  const selectedPreparationEvents = useMemo(
      () => preparationEvents.filter(
          (event) =>
              preparationDate(event.startsAt) === selectedDate,
      ),
      [preparationEvents, selectedDate],
  );

  const todayStr = toDateString(today);

  const amountNotesByDate = useMemo(() => {
    const result = new Map<
        string,
        { inbound: number; outbound: number }
    >();

    monthDetails.forEach((day) => {
      let inbound = 0;
      let outbound = 0;

      day.items.forEach((item) => {
        if (isInboundItem(item)) {
          inbound += item.amount;
        } else {
          outbound += item.amount;
        }
      });

      result.set(day.date, { inbound, outbound });
    });

    return result;
  }, [monthDetails]);

  const preparationByDate = useMemo(() => {
    const result = new Map<string, PreparationEvent[]>();

    preparationEvents.forEach((event) => {
      const date = preparationDate(event.startsAt);
      const events = result.get(date) ?? [];

      events.push(event);
      result.set(date, events);
    });

    result.forEach((events) => {
      events.sort(
          (a, b) =>
              Date.parse(a.startsAt) - Date.parse(b.startsAt),
      );
    });

    return result;
  }, [preparationEvents]);

  return (
    <main className="calendar-page">
      <header className="calendar-header">
        <div className="calendar-heading-copy">
          <h1>캘린더</h1>
        </div>
      </header>

      <div className="calendar-summary" aria-busy={isLoadingMonth}>
        <div className="calendar-summary-card calendar-summary-card--inbound">
          <span className="calendar-summary-label">받을 일정이 있는 날</span>
          <span className="calendar-summary-value">{isLoadingMonth ? '—' : `${monthCounts.inboundDays}일`}</span>
        </div>
        <div className="calendar-summary-card calendar-summary-card--outbound">
          <span className="calendar-summary-label">보낼 일정이 있는 날</span>
          <span className="calendar-summary-value">{isLoadingMonth ? '—' : `${monthCounts.outboundDays}일`}</span>
        </div>
      </div>

      {monthError && <p className="calendar-error">{monthError}</p>}

      <div className="calendar-layout calendar-layout--planning">
        <section
            className="calendar-main"
            aria-label="월별 캘린더"
            aria-busy={isLoadingMonth || preparationLoading}
        >
          <div className="calendar-main-toolbar">
            <nav className="calendar-nav" aria-label="월 선택">
              <button type="button" onClick={goPrevMonth} aria-label="이전 달">‹</button>
              <span className="calendar-month-label">{year}년 {month}월</span>
              <button type="button" onClick={goNextMonth} aria-label="다음 달">›</button>
            </nav>
            <div className="calendar-legend" aria-label="일정 구분">
              <span className="calendar-legend-item"><span className="calendar-dot calendar-dot--inbound" />받을 일정</span>
              <span className="calendar-legend-item"><span className="calendar-dot calendar-dot--outbound" />보낼 일정</span>
              <span className="calendar-legend-item">
                <span className="calendar-dot calendar-dot--preparation" />
                  상환 준비
              </span>
            </div>
          </div>
          <div className="calendar-grid">
            {WEEKDAY_LABELS.map((label, index) => (
              <div
                key={label}
                className={[
                  "calendar-weekday",
                  index === 0 && "calendar-weekday--sun",
                  index === 6 && "calendar-weekday--sat",
                ].filter(Boolean).join(" ")}
              >
                {label}
              </div>
            ))}

            {grid.map((date) => {
              const dateStr = toDateString(date);
              const inCurrentMonth =
                  date.getFullYear() === year &&
                  date.getMonth() + 1 === month;
              const marker = markerByDate.get(dateStr);
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;
              const dayOfWeek = date.getDay();
              const amountNote = amountNotesByDate.get(dateStr);
              const preparationItems = preparationByDate.get(dateStr) ?? [];

              return (
                <button
                  key={dateStr}
                  type="button"
                  className={[
                    "calendar-cell",
                    !inCurrentMonth && "calendar-cell--muted",
                    isSelected && "calendar-cell--selected",
                    isToday && "calendar-cell--today",
                    dayOfWeek === 0 && "calendar-cell--sun",
                    dayOfWeek === 6 && "calendar-cell--sat",
                  ].filter(Boolean).join(" ")}
                  onClick={() => {
                    if (dateStr !== selectedDate) selectDate(date, inCurrentMonth);
                  }}
                >
                  <span className="calendar-cell-top">
                    <span className="calendar-cell-date">
                      {date.getDate()}
                    </span>

                    <span className="calendar-cell-dots" aria-hidden="true">
                      {marker?.hasInbound && (
                          <span className="calendar-dot calendar-dot--inbound" />
                      )}

                      {marker?.hasOutbound && (
                          <span className="calendar-dot calendar-dot--outbound" />
                      )}

                      {preparationDates.has(dateStr) && (
                          <span className="calendar-dot calendar-dot--preparation" />
                      )}
                    </span>
                  </span>

                                    {inCurrentMonth && (
                                        <span className="calendar-cell-notes">
                      {!!amountNote?.inbound && (
                          <span
                              className="calendar-cell-note calendar-cell-note--inbound"
                              title={`받을 잔여 금액 ${formatWon(amountNote.inbound)}`}
                          >
                          받을 {compactWon(amountNote.inbound)}
                        </span>
                      )}

                                          {!!amountNote?.outbound && (
                                              <span
                                                  className="calendar-cell-note calendar-cell-note--outbound"
                                                  title={`보낼 잔여 금액 ${formatWon(amountNote.outbound)}`}
                                              >
                          보낼 {compactWon(amountNote.outbound)}
                        </span>
                                          )}

                                          {preparationItems.length > 0 && (
                                              <span
                                                  className="calendar-cell-note calendar-cell-note--preparation"
                                                  title={preparationItems
                                                      .map((event) =>
                                                          `${preparationTime(event.startsAt)} ${event.title}`,
                                                      )
                                                      .join("\n")}
                                              >
                          준비 {preparationTime(preparationItems[0].startsAt)}
                                                {preparationItems.length > 1 &&
                                                    ` +${preparationItems.length - 1}`}
                        </span>
                        )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {monthDetailError && (
              <p className="calendar-error" role="alert">
                {monthDetailError}
              </p>
          )}
        </section>

        <div className="calendar-right-column">
          <section
              className="calendar-day-panel"
              aria-label="선택한 날짜의 일정"
              aria-busy={isLoadingDay || preparationLoading}
          >
          <h2>
            {formatSelectedDate(selectedDate)}
            {selectedDate === todayStr && (
                <span className="calendar-today-tag">오늘</span>
            )}
          </h2>
          <div
              className="calendar-preparation-section"
              aria-busy={preparationLoading}
          >
            <h3 className="calendar-section-title">
              상환 준비 일정
            </h3>

            {preparationLoading && (
                <p role="status">준비 일정을 불러오는 중입니다.</p>
            )}

            {!preparationLoading && preparationError && (
                <div role="alert" className="calendar-error">
                  <p>{preparationError}</p>

                  <button
                      type="button"
                      onClick={refreshPreparationEvents}
                  >
                    준비 일정 다시 조회
                  </button>
                </div>
            )}

            {!preparationLoading && !preparationError && (
                <ul className="calendar-item-list">
                  {selectedPreparationEvents.map((event) => (
                      <li
                          key={event.eventId}
                          className="calendar-item calendar-item--preparation"
                      >
                        <button
                            type="button"
                            className="calendar-preparation-link"
                            onClick={() =>
                                navigate(`/contracts/${event.contractId}/schedule`)
                            }
                            aria-label={`${event.title}, 상환 회차 확인`}
                        >
                          <span className="calendar-item-top">
                            <span className="calendar-item-type calendar-item-type--preparation">
                              상환 준비
                            </span>

                            <span className="calendar-item-sublabel">
                              등록된 일정
                            </span>
                          </span>

                          <span className="calendar-item-title">
                            {event.title}
                          </span>

                          <span className="calendar-item-amount">
                            {preparationTime(event.startsAt)}
                            {" 확인 알림"}
                          </span>

                          <span className="calendar-item-meta">
                            상환 회차 확인 →
                          </span>
                        </button>
                        <button
                            type="button"
                            className="planner-secondary"
                            disabled={
                                plannerInteractionLocked ||
                                new Date(event.startsAt).getTime() <= rescheduleNow
                            }
                            onClick={() => setRescheduleEvent(event)}
                        >
                          확인 시각 재조율
                        </button>
                      </li>
                  ))}
                </ul>
            )}
          </div>
          <h3 className="calendar-section-title">
            계약·정산 일정
          </h3>
          {isLoadingDay && <LoadingSkeleton className="loading-skeleton--compact" rows={3} />}
          {!isLoadingDay && dayError && <p className="calendar-day-status calendar-day-status--error">{dayError}</p>}
          {!isLoadingDay && !dayError && dayItems.length === 0 && (
              <div className="calendar-empty">
                <div className="calendar-empty-icon">📅</div>
                <p>이 날짜에 해당하는 계약·정산 일정이 없습니다.</p>
              </div>
          )}

          {!isLoadingDay && !dayError && dayItems.length > 0 && (
            <ul className="calendar-item-list">
              {dayItems.map((item) => (
                <li
                  key={`${item.type}-${item.targetId}`}
                  className={`calendar-item ${isInboundItem(item) ? "calendar-item--inbound" : "calendar-item--outbound"} ${item.overdue ? "calendar-item--overdue" : ""}`}
                  onClick={() => navigate(item.detailUrl)}
                >
                  <div className="calendar-item-top">
                    <span className={`calendar-item-type calendar-item-type--${item.type.toLowerCase()}`}>
                      {item.type === "LOAN" ? "금전소비대차" : "정산"}
                    </span>
                    <span className="calendar-item-sublabel">{item.subLabel}</span>
                    {item.overdue && <span className="calendar-item-overdue-badge">연체</span>}
                  </div>
                  <div className="calendar-item-title">{item.title}</div>
                  <div className="calendar-item-amount">{formatWon(item.amount)}</div>
                  <div className="calendar-item-meta">
                    {item.counterpartyName && <span>{item.counterpartyName}</span>}
                    {item.installmentInfo && <span>{item.installmentInfo}</span>}
                    {item.categoryLabel && <span>{item.categoryLabel}</span>}
                    {item.settlementTypeLabel && <span>{item.settlementTypeLabel}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          </section>
          <PreparationPlanner
              key={`${toYearMonthString(year, month)}:${rescheduleEvent?.eventId ?? "new"}:${rescheduleEvent?.startsAt ?? ""}`}
              yearMonth={toYearMonthString(year, month)}
              rescheduleEvent={rescheduleEvent}
              onRescheduleCancel={() => setRescheduleEvent(null)}
              onInteractionLockChange={setPlannerInteractionLocked}
              onRegistered={handlePreparationRegistered}
          />
        </div>
      </div>
    </main>
  );
}

export default function CalendarPage() {
  const [searchParams] = useSearchParams();

  // URL에 날짜가 없는 경우에도 최초 기준일을 유지한다.
  const [fallbackDate] = useState(() => new Date());

  const initialDate =
      parseCalendarDate(searchParams.get("date")) ?? fallbackDate;

  return (
      <CalendarPageContent
          key={toDateString(initialDate)}
          initialDate={initialDate}
      />
  );
}