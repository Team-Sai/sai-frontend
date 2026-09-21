import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { CSSProperties } from 'react';

import { useNavigate } from 'react-router-dom';

import { dashboardApi } from '../api/dashboardApi';

import type {
  DashboardAmountSummary,
  DashboardAttentionItem,
  DashboardCalendarDay,
  DashboardMonthlySummary,
  DashboardTransaction,
} from '../types/dashboard';

import '../styles/dashboard.css';

const transactionStatusLabels: Record<string, string> = {
  COMPLETED: '완료',
  IN_PROGRESS: '진행 중',
};

const currencyFormatter = new Intl.NumberFormat('ko-KR');

function toAmount(value: unknown): number {
  const amount = Number(value);

  return Number.isFinite(amount)
    ? amount
    : 0;
}

function formatWon(amount: number): string {
  return `${currencyFormatter.format(
    toAmount(amount),
  )}원`;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');

  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function toYearMonth(date: Date): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');

  return `${year}-${month}`;
}

function getCalendarDates(
  cursor: Date,
): Date[] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstDay = new Date(
    year,
    month,
    1,
  );

  const startDate = new Date(
    year,
    month,
    1 - firstDay.getDay(),
  );

  return Array.from(
    { length: 42 },
    (_, index) => {
      const date = new Date(startDate);

      date.setDate(
        startDate.getDate() + index,
      );

      return date;
    },
  );
}

function getAttentionMessage(
  item: DashboardAttentionItem,
): string {
  if (item.type === 'LOAN_DUE_SOON') {
    return item.remainingDays === 0
      ? '차용증 상환일이 오늘이에요'
      : `차용증 상환일이 ${
          item.remainingDays ?? 0
        }일 남았어요`;
  }

  if (
    item.type ===
    'SETTLEMENT_DUE_SOON'
  ) {
    return item.remainingDays === 0
      ? '정산 마감일이 오늘이에요'
      : `정산 마감일이 ${
          item.remainingDays ?? 0
        }일 남았어요`;
  }

  return '확인이 필요한 내역이 있어요';
}

function AnimatedAmount({
  amount,
}: {
  amount?: number;
}) {
  const text =
    `${currencyFormatter.format(
      toAmount(amount),
    )}원`;

  return (
    <strong className="summary-amount-number">
      {text
        .split('')
        .map(
          (
            character,
            index,
          ) => {
            const isDigit =
              character >= '0' &&
              character <= '9';

            if (!isDigit) {
              return (
                <span
                  key={`${character}-${index}`}
                >
                  {character}
                </span>
              );
            }

            const style = {
              '--digit-index': index,
            } as CSSProperties;

            return (
              <span
                key={`${character}-${index}`}
                className="summary-digit"
                style={style}
              >
                {character}
              </span>
            );
          },
        )}
    </strong>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const [
    amountSummary,
    setAmountSummary,
  ] =
    useState<DashboardAmountSummary | null>(
      null,
    );

  const [
    attentionItems,
    setAttentionItems,
  ] =
    useState<
      DashboardAttentionItem[]
    >([]);

  const [
    monthlySummary,
    setMonthlySummary,
  ] =
    useState<DashboardMonthlySummary | null>(
      null,
    );

  const [
    recentTransactions,
    setRecentTransactions,
  ] =
    useState<
      DashboardTransaction[]
    >([]);

  const [
    calendarDays,
    setCalendarDays,
  ] =
    useState<
      DashboardCalendarDay[]
    >([]);

  const [
    calendarCursor,
    setCalendarCursor,
  ] = useState<Date>(() => {
    const today = new Date();

    return new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    );
  });

  const [
    transactionFilter,
    setTransactionFilter,
  ] =
    useState<
      'ALL' | 'LOAN' | 'SETTLEMENT'
    >('ALL');

  const [
    summaryIndex,
    setSummaryIndex,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState(false);

  async function loadDashboard(
    cursor: Date,
    calendarOnly = false,
  ): Promise<void> {
    if (!calendarOnly) {
      setLoading(true);
      setLoadError(false);
    }

    try {
      const data =
        await dashboardApi.getDashboard(
          toYearMonth(cursor),
        );

      setCalendarDays(
        data.calendarDays ?? [],
      );

      if (calendarOnly) {
        return;
      }

      setMonthlySummary(
        data.monthlySummary ?? null,
      );

      setAmountSummary(
        data.amountSummary ?? null,
      );

      setAttentionItems(
        data.attentionItems ?? [],
      );

      setRecentTransactions(
        data.recentTransactions ?? [],
      );
    } catch (error) {
      console.error(error);

      if (!calendarOnly) {
        setLoadError(true);

        setCalendarDays([]);
        setMonthlySummary(null);
        setAmountSummary(null);
        setAttentionItems([]);
        setRecentTransactions([]);
      }
    } finally {
      if (!calendarOnly) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    document.body.classList.add(
      'integration-page',
    );

    void loadDashboard(
      calendarCursor,
    );

    return () => {
      document.body.classList.remove(
        'integration-page',
      );
    };

    // 최초 로딩만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      !amountSummary ||
      loadError
    ) {
      return;
    }

    setSummaryIndex(0);

    const timer =
      window.setInterval(
        () => {
          setSummaryIndex(
            (current) =>
              (current + 1) % 3,
          );
        },
        3200,
      );

    return () => {
      window.clearInterval(timer);
    };
  }, [
    amountSummary,
    loadError,
  ]);

  const calendarDates =
    useMemo(
      () =>
        getCalendarDates(
          calendarCursor,
        ),
      [calendarCursor],
    );

  const calendarDaysByDate =
    useMemo(() => {
      return calendarDays.reduce<
        Record<
          string,
          DashboardCalendarDay
        >
      >(
        (
          result,
          calendarDay,
        ) => {
          result[
            calendarDay.date
          ] = calendarDay;

          return result;
        },
        {},
      );
    }, [calendarDays]);

  const filteredTransactions =
    useMemo(() => {
      const filtered =
        transactionFilter ===
        'ALL'
          ? recentTransactions
          : recentTransactions.filter(
              (transaction) =>
                transaction.type ===
                transactionFilter,
            );

      return filtered.slice(
        0,
        5,
      );
    }, [
      recentTransactions,
      transactionFilter,
    ]);

  const completionRate =
    Math.min(
      100,
      Math.max(
        0,
        toAmount(
          monthlySummary
            ?.transactionCompletionRate,
        ),
      ),
    );

  const receivable =
    amountSummary?.receivable ?? {};

  const payable =
    amountSummary?.payable ?? {};

  async function changeMonth(
    offset: number,
  ): Promise<void> {
    const nextCursor =
      new Date(
        calendarCursor.getFullYear(),
        calendarCursor.getMonth() +
          offset,
        1,
      );

    setCalendarCursor(
      nextCursor,
    );

    await loadDashboard(
      nextCursor,
      true,
    );
  }

  function renderSummary() {
    if (loading) {
      return '불러오는 중';
    }

    if (loadError) {
      return '금액을 불러오지 못했습니다.';
    }

    if (summaryIndex === 0) {
      return (
        <>
          현재 받을 금액은{' '}
          <AnimatedAmount
            amount={
              receivable.totalAmount
            }
          />
          이고
          <br />
          현재 보낼 금액은{' '}
          <AnimatedAmount
            amount={
              payable.totalAmount
            }
          />
          이에요.
        </>
      );
    }

    if (summaryIndex === 1) {
      return (
        <>
          정산 받을 금액은{' '}
          <AnimatedAmount
            amount={
              receivable.settlementAmount
            }
          />
          이고
          <br />
          정산 보낼 금액은{' '}
          <AnimatedAmount
            amount={
              payable.settlementAmount
            }
          />
          이에요.
        </>
      );
    }

    return (
      <>
        대여금은{' '}
        <AnimatedAmount
          amount={
            receivable.loanAmount
          }
        />
        이고
        <br />
        차입금은{' '}
        <AnimatedAmount
          amount={
            payable.loanAmount
          }
        />
        이에요.
      </>
    );
  }

  return (
    <main className="dashboard-main">
      <div className="unified-page-header">
        <h1 className="page-title unified-page-title">
          통합 대시보드
        </h1>
      </div>

      <section
        className="hero-summary"
        aria-labelledby="summaryTitle"
      >
        <div className="hero-summary__copy">
          <p
            id="summaryTitle"
            className="section-kicker"
          >
            요약 현황
          </p>

          <p
            key={summaryIndex}
            className="summary-sentence is-summary-entering"
          >
            {renderSummary()}
          </p>
        </div>
      </section>

      <section
        className="dashboard-grid"
        aria-label="월별 현황과 확인 필요 내역"
      >
        <article className="panel calendar-panel">
          <div className="panel-header">
            <h2>월별 현황</h2>

            <button
              className="text-button"
              type="button"
              onClick={() =>
                navigate(
                  `/calendar?date=${toDateKey(
                    calendarCursor,
                  )}`,
                )
              }
            >
              전체보기
            </button>
          </div>

          <div className="calendar-card">
            <div className="calendar-toolbar">
              <strong>
                {calendarCursor.getFullYear()}
                년{' '}
                {calendarCursor.getMonth() +
                  1}
                월
              </strong>

              <div className="calendar-actions">
                <button
                  className="calendar-button"
                  type="button"
                  aria-label="이전 달"
                  onClick={() =>
                    void changeMonth(
                      -1,
                    )
                  }
                >
                  ‹
                </button>

                <button
                  className="calendar-button"
                  type="button"
                  aria-label="다음 달"
                  onClick={() =>
                    void changeMonth(
                      1,
                    )
                  }
                >
                  ›
                </button>
              </div>
            </div>

            <div
              className="calendar-weekdays"
              aria-hidden="true"
            >
              <span>일</span>
              <span>월</span>
              <span>화</span>
              <span>수</span>
              <span>목</span>
              <span>금</span>
              <span>토</span>
            </div>

            <div
              className="calendar-grid"
              aria-label="월별 일정 달력"
            >
              {calendarDates.map(
                (date) => {
                  const dateKey =
                    toDateKey(date);

                  const calendarDay =
                    calendarDaysByDate[
                      dateKey
                    ];

                  const classNames =
                    [
                      'calendar-day',

                      date.getMonth() !==
                      calendarCursor.getMonth()
                        ? 'is-outside'
                        : '',

                      date.getDay() ===
                      0
                        ? 'is-sunday'
                        : '',

                      date.getDay() ===
                      6
                        ? 'is-saturday'
                        : '',

                      dateKey ===
                      toDateKey(
                        new Date(),
                      )
                        ? 'is-today'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ');

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      className={
                        classNames
                      }
                      aria-label={`${
                        date.getMonth() +
                        1
                      }월 ${date.getDate()}일`}
                      onClick={() =>
                        navigate(
                          `/calendar?date=${dateKey}`,
                        )
                      }
                    >
                      <span className="calendar-day__number">
                        {date.getDate()}
                      </span>

                      <span
                        className="calendar-day__dots"
                        aria-hidden="true"
                      >
                        {calendarDay?.hasInbound && (
                          <i className="dot dot--inbound" />
                        )}

                        {calendarDay?.hasOutbound && (
                          <i className="dot dot--outbound" />
                        )}
                      </span>
                    </button>
                  );
                },
              )}
            </div>

            <div
              className="calendar-legend"
              aria-label="입출금 범례"
            >
              <span>
                <i className="dot dot--inbound" />
                입금
              </span>

              <span>
                <i className="dot dot--outbound" />
                출금
              </span>
            </div>
          </div>
        </article>

        <div className="side-stack">
          <article className="panel attention-panel">
            <h2>
              확인이 필요한 내역
            </h2>

            <div className="attention-list">
              {loading ? (
                <div className="empty-state">
                  내역을 불러오는
                  중입니다.
                </div>
              ) : loadError ? (
                <div className="empty-state">
                  내역을 불러오지
                  못했습니다.
                </div>
              ) : attentionItems.length ===
                0 ? (
                <div className="empty-state">
                  확인이 필요한 내역이
                  없습니다.
                </div>
              ) : (
                attentionItems.map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={
                        item.id ??
                        `${item.type}-${index}`
                      }
                      className="attention-item"
                    >
                      <span>
                        {getAttentionMessage(
                          item,
                        )}
                      </span>

                      <button
                        type="button"
                        className="status-badge badge-progress attention-confirm-button"
                        onClick={() => {
                          if (
                            item.actionUrl
                          ) {
                            navigate(
                              item.actionUrl,
                            );
                          }
                        }}
                      >
                        확인
                      </button>
                    </div>
                  ),
                )
              )}
            </div>
          </article>

          <article className="panel month-panel">
            <h2>이번달 요약</h2>

            <div className="month-stats">
              <div>
                <span>
                  완료한 거래
                </span>

                <strong>
                  {monthlySummary
                    ?.completedTransactionCount ??
                    0}
                </strong>

                <em>건</em>
              </div>

              <div>
                <span>
                  진행 중인 정산
                </span>

                <strong>
                  {monthlySummary
                    ?.inProgressSettlementCount ??
                    0}
                </strong>

                <em>건</em>
              </div>

              <div>
                <span>
                  차용증 상환
                </span>

                <strong>
                  {monthlySummary
                    ?.inProgressLoanRepaymentCount ??
                    0}
                </strong>

                <em>건</em>
              </div>
            </div>

            <div className="completion-row">
              <span>
                거래 완료율
              </span>

              <strong>
                {completionRate}%
              </strong>
            </div>

            <div
              className="progress-track"
              aria-hidden="true"
            >
              <span
                style={{
                  width: `${completionRate}%`,
                }}
              />
            </div>
          </article>
        </div>
      </section>

      <section
        className="panel transaction-panel"
        aria-labelledby="recentTransactionTitle"
      >
        <div className="panel-header transaction-header">
          <h2 id="recentTransactionTitle">
            최근 거래 내역
          </h2>

          <div
            className="filter-tabs"
            role="tablist"
            aria-label="거래 유형 필터"
          >
            <button
              className={`filter-tab${
                transactionFilter ===
                'ALL'
                  ? ' is-active'
                  : ''
              }`}
              type="button"
              onClick={() =>
                setTransactionFilter(
                  'ALL',
                )
              }
            >
              전체
            </button>

            <button
              className={`filter-tab${
                transactionFilter ===
                'LOAN'
                  ? ' is-active'
                  : ''
              }`}
              type="button"
              onClick={() =>
                setTransactionFilter(
                  'LOAN',
                )
              }
            >
              계약
            </button>

            <button
              className={`filter-tab${
                transactionFilter ===
                'SETTLEMENT'
                  ? ' is-active'
                  : ''
              }`}
              type="button"
              onClick={() =>
                setTransactionFilter(
                  'SETTLEMENT',
                )
              }
            >
              정산
            </button>
          </div>
        </div>

        <div
          className="transaction-table"
          role="table"
          aria-label="최근 거래 내역"
        >
          <div
            className="transaction-row transaction-row--head"
            role="row"
          >
            <span role="columnheader">
              제목
            </span>
            <span role="columnheader">
              상태
            </span>
            <span role="columnheader">
              금액
            </span>
            <span role="columnheader">
              상세보기
            </span>
          </div>

          <div>
            {loading ? (
              <div className="empty-state">
                거래를 불러오는
                중입니다.
              </div>
            ) : loadError ? (
              <div className="empty-state">
                거래를 불러오지
                못했습니다.
              </div>
            ) : filteredTransactions.length ===
              0 ? (
              <div className="empty-state">
                표시할 거래 내역이
                없습니다.
              </div>
            ) : (
              filteredTransactions.map(
                (
                  transaction,
                  index,
                ) => {
                  const statusLabel =
                    transactionStatusLabels[
                      transaction
                        .status
                    ] ??
                    transaction.status ??
                    '-';

                  const isCompleted =
                    transaction.status ===
                    'COMPLETED';

                  return (
                    <div
                      key={
                        transaction.id ??
                        `${transaction.type}-${transaction.title}-${index}`
                      }
                      className="transaction-row"
                      role="row"
                    >
                      <span>
                        {
                          transaction.title
                        }
                      </span>

                      <span>
                        <span
                          className={`status-badge ${
                            isCompleted
                              ? 'badge-completed'
                              : 'badge-progress'
                          }`}
                        >
                          {
                            statusLabel
                          }
                        </span>
                      </span>

                      <span>
                        {formatWon(
                          transaction.amount,
                        )}
                      </span>

                      <span>
                        <button
                          type="button"
                          className="detail-arrow"
                          aria-label={`${transaction.title} 상세보기`}
                          onClick={() => {
                            if (
                              transaction.detailUrl
                            ) {
                              navigate(
                                transaction.detailUrl,
                              );
                            }
                          }}
                        >
                          ›
                        </button>
                      </span>
                    </div>
                  );
                },
              )
            )}
          </div>
        </div>
      </section>
    </main>
  );
}