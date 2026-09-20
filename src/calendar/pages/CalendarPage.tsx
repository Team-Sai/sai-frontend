import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/CalendarPage.css";
import { getMonthCalendarDays, getCalendarDayDetail } from "../api/calendarApi";
import type { CalendarDayMarker, CalendarItem } from "../types/calendar";

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

const INBOUND_SUB_LABELS = new Set(["수취예정", "받을 돈"]);

function isInboundItem(item: CalendarItem): boolean {
  return INBOUND_SUB_LABELS.has(item.subLabel);
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1~12
  const [markers, setMarkers] = useState<CalendarDayMarker[]>([]);
  const [isLoadingMonth, setIsLoadingMonth] = useState(true);
  const [monthError, setMonthError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(toDateString(today));
  const [dayItems, setDayItems] = useState<CalendarItem[]>([]);
  const [isLoadingDay, setIsLoadingDay] = useState(true);
  const [dayError, setDayError] = useState<string | null>(null);

  const markerByDate = useMemo(() => {
    const map = new Map<string, CalendarDayMarker>();
    markers.forEach((m) => map.set(m.date, m));
    return map;
  }, [markers]);

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

    function goPrevMonth() {
    setIsLoadingMonth(true);
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  }

  function goNextMonth() {
    setIsLoadingMonth(true);
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  }

    function goToday() {
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1;
    const todayDateStr = toDateString(today);

    if (todayYear !== year || todayMonth !== month) {
      setIsLoadingMonth(true);
      setYear(todayYear);
      setMonth(todayMonth);
    }

    if (todayDateStr !== selectedDate) {
      setIsLoadingDay(true);
      setSelectedDate(todayDateStr);
    }
  }

  const todayStr = toDateString(today);

  return (
    <div className="calendar-page">
        <div className="calendar-header">
        <h1>캘린더</h1>
        <div className="calendar-nav">
          <button type="button" onClick={goPrevMonth} aria-label="이전 달">‹</button>
          <span className="calendar-month-label">{year}년 {month}월</span>
          <button type="button" onClick={goNextMonth} aria-label="다음 달">›</button>
          <button type="button" className="calendar-today-btn" onClick={goToday}>오늘</button>
        </div>
      </div>

      <div className="calendar-legend">
        <span className="calendar-legend-item">
          <span className="calendar-dot calendar-dot--inbound" /> 받을 돈
        </span>
        <span className="calendar-legend-item">
          <span className="calendar-dot calendar-dot--outbound" /> 보낼 돈
        </span>
      </div>

      <div className="calendar-summary">
        <div className="calendar-summary-card calendar-summary-card--inbound">
          <span className="calendar-summary-label">받을 일정이 있는 날</span>
          <span className="calendar-summary-value">{monthCounts.inboundDays}일</span>
        </div>
        <div className="calendar-summary-card calendar-summary-card--outbound">
          <span className="calendar-summary-label">보낼 일정이 있는 날</span>
          <span className="calendar-summary-value">{monthCounts.outboundDays}일</span>
        </div>
      </div>

      {monthError && <p className="calendar-error">{monthError}</p>}

      <div className="calendar-layout">
        <div className="calendar-main">
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
              const inCurrentMonth = date.getMonth() + 1 === month;
              const marker = markerByDate.get(dateStr);
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;
              const dayOfWeek = date.getDay();

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
                    if (dateStr !== selectedDate) {
                      setIsLoadingDay(true);
                      setSelectedDate(dateStr);
                    }
                  }}
                  disabled={isLoadingMonth}
                >
                  <span className="calendar-cell-date">{date.getDate()}</span>
                  <span className="calendar-cell-dots">
                    {marker?.hasInbound && <span className="calendar-dot calendar-dot--inbound" />}
                    {marker?.hasOutbound && <span className="calendar-dot calendar-dot--outbound" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="calendar-day-panel">
            <h2>{selectedDate} 일정 ({dayItems.length}건){selectedDate === todayStr && <span className="calendar-today-tag">오늘</span>}</h2>

          {isLoadingDay && <p className="calendar-day-status">불러오는 중이에요...</p>}
          {!isLoadingDay && dayError && <p className="calendar-day-status calendar-day-status--error">{dayError}</p>}
          {!isLoadingDay && !dayError && dayItems.length === 0 && (
            <div className="calendar-empty">
              <div className="calendar-empty-icon">📅</div>
              <p>이 날짜에 해당하는 일정이 없습니다.</p>
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
        </div>
      </div>
    </div>
  );
}