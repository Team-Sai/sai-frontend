import { useEffect, useState } from 'react';
import { getRepaymentPlan } from '../api/repaymentManagementApi';
import { subscribeRepaymentChanged } from '../repaymentRefresh';
import {
    getAutoRetryDelay,
    isAnalysisPending,
    MAX_AUTO_RETRIES,
    waitForRetry,
} from '../repaymentRetry';

import type {
    RepaymentManagementResponse,
} from '../types/repaymentManagement';
import '../styles/RepaymentManagementCard.css';

const moneyFormatter = new Intl.NumberFormat('ko-KR');

function money(amount: number): string {
    return `${moneyFormatter.format(amount)}원`;
}

function dateLabel(value: string): string {
    const [, month, day] = value.split('-');

    return `${Number(month)}월 ${Number(day)}일`;
}

function formatAnalysisTime(value: string): string {
    return new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(new Date(value));
}

export default function RepaymentManagementCard() {
    const [data, setData] =
        useState<RepaymentManagementResponse | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [requestVersion, setRequestVersion] = useState(0);
    const [autoRetryExhausted, setAutoRetryExhausted] =
        useState(false);

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        async function load() {
            setLoading(true);
            setError(null);
            setAutoRetryExhausted(false);

            let retriesUsed = 0;

            try {
                while (active && !controller.signal.aborted) {
                    const result = await getRepaymentPlan(
                        controller.signal,
                    );

                    if (!active || controller.signal.aborted) return;

                    // 기본 안내를 포함해 현재 결과를 먼저 표시한다.
                    setData(result);
                    setLoading(false);

                    const delay = getAutoRetryDelay(
                        result.metadata,
                        retriesUsed,
                    );

                    if (delay === null) {
                        setAutoRetryExhausted(
                            isAnalysisPending(result.metadata) &&
                            retriesUsed >= MAX_AUTO_RETRIES,
                        );

                        return;
                    }

                    await waitForRetry(
                        delay,
                        controller.signal,
                    );

                    retriesUsed += 1;
                }
            } catch (cause) {
                if (!active || controller.signal.aborted) return;

                setError(
                    cause instanceof Error
                        ? cause.message
                        : '상환 안내를 불러오지 못했습니다.',
                );
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        // StrictMode의 즉시 재실행 시 첫 요청을 취소한다.
        const timer = window.setTimeout(() => {
            void load();
        }, 0);

        return () => {
            active = false;
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [requestVersion]);

    useEffect(() => {
        let timer: number | undefined;

        const refresh = () => {
            if (document.visibilityState !== 'visible') return;

            window.clearTimeout(timer);

            // 여러 반영 이벤트가 연달아 발생하면 한 번으로 합친다.
            timer = window.setTimeout(() => {
                setRequestVersion((value) => value + 1);
            }, 300);
        };

        const unsubscribe = subscribeRepaymentChanged(refresh);

        window.addEventListener('focus', refresh);
        document.addEventListener('visibilitychange', refresh);

        return () => {
            unsubscribe();
            window.clearTimeout(timer);

            window.removeEventListener('focus', refresh);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, []);

    if (loading && !data) {
        return (
            <section
                className="repayment-card"
                aria-label="상환관리"
                aria-busy="true"
            >
                <h2>상환관리</h2>
                <p role="status">
                    상환 기록을 확인하고 안내를 준비하고 있습니다.
                </p>
            </section>
        );
    }

    if (!data) {
        return (
            <section className="repayment-card" aria-label="상환관리">
                <h2>상환관리</h2>
                <p role="alert">{error ?? '상환 안내가 없습니다.'}</p>
                <button
                    type="button"
                    className="repayment-card__retry"
                    onClick={() => setRequestVersion((value) => value + 1)}
                >
                    다시 불러오기
                </button>
            </section>
        );
    }

    const { context, agentAnalysis, metadata } = data;
    const isAi = agentAnalysis.source === 'AI';
    const hasPastDue = agentAnalysis.status === 'PAST_DUE';

    const statusLabel = hasPastDue
        ? '기한 지난 상환 있음'
        : agentAnalysis.status === 'UPCOMING'
            ? '상환 일정 확인'
            : '이번 달까지 남은 상환 없음';

    return (
        <section className="repayment-card" aria-label="상환관리">
            <div className="repayment-card__header">
                <div>
                    <h2>{isAi ? 'AI 상환관리' : '상환관리'}</h2>
                    <p className="repayment-card__muted">
                        {context.targetMonth} 상환 현황 ·{' '}
                        {context.analysisDate} 기준
                    </p>
                    {isAi && metadata.analyzedAt && (
                        <p className="repayment-card__muted">
                            분석 시각 {formatAnalysisTime(metadata.analyzedAt)}
                            {' · '}
                            {metadata.delivery === 'CACHE'
                                ? '저장된 분석 재사용'
                                : metadata.delivery === 'SHARED'
                                    ? '진행 중 분석 결과 공유'
                                    : '새 분석'}
                        </p>
                    )}
                </div>

                <span
                    className={`repayment-card__badge ${
                        hasPastDue ? 'repayment-card__badge--warning' : ''
                    }`}
                >
          {statusLabel}
        </span>
            </div>
            {error && (
                <div
                    className="repayment-card__refresh-error"
                    role="alert"
                >
                    <p>
                        최신 조회에 실패했습니다.
                        이전 조회 결과를 표시합니다.
                    </p>

                    <p className="repayment-card__muted">
                        이전 조회 시각{' '}
                        {formatAnalysisTime(metadata.checkedAt)}
                    </p>

                    <p className="repayment-card__muted">
                        {error}
                    </p>

                    <button
                        type="button"
                        className="repayment-card__retry"
                        disabled={loading}
                        onClick={() => {
                            setRequestVersion((value) => value + 1);
                        }}
                    >
                        {loading ? '조회 중…' : '다시 확인'}
                    </button>
                </div>
            )}
            <dl className="repayment-card__amounts">
                <div>
                    <dt>이번 달 남은 상환액</dt>
                    <dd>{money(context.payableThisMonthAmount)}</dd>
                </div>
                <div>
                    <dt>이전 달 미상환액</dt>
                    <dd>{money(context.overdueAmount)}</dd>
                </div>
                <div>
                    <dt>총 관리 필요액</dt>
                    <dd>{money(context.totalRequiredAmount)}</dd>
                </div>
            </dl>

            <p className="repayment-card__summary">
                {agentAnalysis.summary}
            </p>

            {!isAi && (
                <p className="repayment-card__muted">
                    계약과 상환 기록을 기준으로 정리한 기본 안내입니다.
                </p>
            )}

            {metadata.delivery === 'FALLBACK' && (
                <div className="repayment-card__muted" role="status">
                    <p>
                        {isAnalysisPending(metadata)
                            ? error
                                ? '자동 재조회가 중단됐습니다. 이전 조회 결과를 확인하고 다시 확인 버튼을 눌러 주세요.'
                                : autoRetryExhausted
                                    ? '분석 결과를 아직 받지 못했습니다. 현재 상환 기록으로 정리한 안내를 확인하고 잠시 후 다시 조회해 주세요.'
                                    : 'AI 분석 결과를 기다리고 있습니다. 잠시 후 자동으로 다시 확인합니다.'
                            : metadata.fallbackReason === 'COOLDOWN'
                                ? '최근 AI 분석 실패로 잠시 재호출을 쉬고 있습니다. 현재 상환 기록으로 정리한 기본 안내를 표시합니다.'
                                : '현재 AI 분석을 이용할 수 없어 상환 기록으로 정리한 기본 안내를 표시합니다.'}                    </p>

                    <button
                        type="button"
                        className="repayment-card__retry"
                        onClick={() => {
                            setRequestVersion((value) => value + 1);
                        }}
                    >
                        다시 확인
                    </button>
                </div>
            )}

            <h3>상환 순서와 일정</h3>

            {agentAnalysis.plans.length === 0 ? (
                <p>이번 달까지 처리할 미상환 회차가 없습니다.</p>
            ) : (
                <ol className="repayment-card__plans">
                    {agentAnalysis.plans.map((plan) => (
                        <li
                            key={plan.scheduleId}
                            className={
                                plan.pastDue
                                    ? 'repayment-card__plan repayment-card__plan--overdue'
                                    : 'repayment-card__plan'
                            }
                        >
              <span className="repayment-card__number">
                {plan.priority}
              </span>

                            <div className="repayment-card__plan-body">
                                <div className="repayment-card__plan-heading">
                                    <strong>{plan.contractName}</strong>
                                    <strong>{money(plan.amount)}</strong>
                                </div>

                                <p className="repayment-card__due">
                                    {plan.pastDue
                                        ? `기한 경과 · 원래 납기 ${dateLabel(plan.dueDate)}`
                                        : `${dateLabel(plan.dueDate)}까지`}
                                </p>

                                <p>{plan.reason}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            )}

            <div className="repayment-card__recommendation">
                <h3>{isAi ? 'AI 안내' : '상환 안내'}</h3>
                <p>{agentAnalysis.recommendation}</p>
            </div>

            <p className="repayment-card__muted">
                전체 채무 잔여액 {money(context.totalRemainingAmount)}
                {' · '}다음 달 이후 회차 포함
            </p>
        </section>
    );
}