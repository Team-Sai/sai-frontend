import { useEffect, useState } from 'react';
import { getRepaymentPlan } from '../api/repaymentManagementApi';
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

export default function RepaymentManagementCard() {
    const [data, setData] =
        useState<RepaymentManagementResponse | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [requestVersion, setRequestVersion] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                const result = await getRepaymentPlan(controller.signal);

                if (active) {
                    setData(result);
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

        // 개발 환경 StrictMode의 즉시 재실행 시 첫 요청을 취소한다.
        const timer = window.setTimeout(() => {
            void load();
        }, 0);

        return () => {
            active = false;
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [requestVersion]);

    if (loading) {
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

    if (error || !data) {
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

    const { context, agentAnalysis } = data;
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
                </div>

                <span
                    className={`repayment-card__badge ${
                        hasPastDue ? 'repayment-card__badge--warning' : ''
                    }`}
                >
          {statusLabel}
        </span>
            </div>

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