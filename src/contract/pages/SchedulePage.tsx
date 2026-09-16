import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../shared.css";
import "./SchedulePage.css";
import {
  getScheduleSummary,
  getContractDetailForSchedule,
} from "../api/scheduleApi";
import type {
  RepaymentScheduleSummary,
  ContractDetailForSchedule,
} from "../types/schedule";
import {
  SCHEDULE_STATUS_LABELS,
  CONTRACT_STATUS_LABELS,
  REPAYMENT_METHOD_LABELS,
} from "../types/schedule";

const PAGE_SIZE = 5;

function formatWon(amount: number): string {
  return `${amount.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}원`;
}

function formatDateTimeKorean(dateString: string): string {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    return `${year}년 ${month}월 ${day}일 ${hours}시 ${minutes}분 ${seconds}초`;
}

export default function SchedulePage() {
  const { contractId } = useParams();

  if (!contractId) {
    return <div className="contract-scope contract-scope--schedule">잘못된 접근입니다.</div>;
  }
  return <ScheduleContent key={contractId} contractId={contractId} />;
}

  function ScheduleContent({contractId}: {contractId: string}) {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<RepaymentScheduleSummary | null>(
    null,
  );
  const [contractDetail, setContractDetail] =
    useState<ContractDetailForSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    
    Promise.all([
      getScheduleSummary(Number(contractId)),
      getContractDetailForSchedule(Number(contractId)),
    ])
      .then(([scheduleRes, detailRes]) => {
        if (cancelled) return;
        setSchedule(scheduleRes);
        setContractDetail(detailRes);
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setError("정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contractId]);

  if (isLoading) {
    return <div className="contract-scope contract-scope--schedule">불러오는 중이에요...</div>;
  }

  if (error || !schedule || !contractDetail) {
    return <div className="contract-scope contract-scope--schedule">{error ?? "데이터가 없습니다."}</div>;
  }

  const { contract, isCreditor } = contractDetail;

  const progressPercent =
    schedule.totalCount > 0
      ? Math.round((schedule.paidCount / schedule.totalCount) * 100)
      : 0;

  const totalPages = Math.ceil(schedule.schedules.length / PAGE_SIZE);
  const pageItems = schedule.schedules.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  return (
    <div className="contract-scope contract-scope--schedule">
      <div className="schedule-header">
        <div className="schedule-header__info">
          <span className="status-badge">
            {CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}
          </span>
          <span className="contract-alias">{contract.contractAlias}</span>
        </div>
        <div className="schedule-header__actions">
          {isCreditor && (
            <button type="button" className="btn-secondary" disabled>
              거래동기화
            </button>
          )}
          <button
            type="button"
            className="btn-primary-small"
            onClick={() => navigate(`/contracts/${contractId}/contract-detail`)}
          >
            계약서 보기
          </button>
        </div>
      </div>

      <div className="schedule-card">
        <dl className="summary-grid">
          <div className="summary-item">
            <dt>총 상환예정액</dt>
            <dd>{formatWon(schedule.totalScheduledAmount)}</dd>
          </div>
          <div className="summary-item">
            <dt>누적 납부액</dt>
            <dd>{formatWon(schedule.paidAmount)}</dd>
          </div>
          <div className="summary-item">
            <dt>잔여 상환액</dt>
            <dd>{formatWon(schedule.remainingAmount)}</dd>
          </div>
          <div className="summary-item">
            <dt>진행률</dt>
            <dd>
              {schedule.paidCount}/{schedule.totalCount}회차 ({progressPercent}
              %)
            </dd>
          </div>
        </dl>

        <div className="progress-wrap">
          <div
            className="progress-bar"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="schedule-card">
        <dl className="contract-info-grid">
          <dt>생성일</dt>
          <dd>{formatDateTimeKorean(contract.createdAt)}</dd>
          <dt>이율</dt>
          <dd>{contract.interestRate}%</dd>
          <dt>만기일</dt>
          <dd>{contract.maturityDate}</dd>
          <dt>상환방식</dt>
          <dd>{REPAYMENT_METHOD_LABELS[contract.repaymentType]}</dd>
          <dt>다음 납부일</dt>
          <dd>{schedule.nextDueDate ?? "없음"}</dd>
        </dl>
      </div>

      <div className="schedule-card">
        {schedule.schedules.length === 0 ? (
          <p className="schedule-empty">등록된 상환 스케줄이 없습니다.</p>
        ) : (
          <>
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>회차</th>
                  <th>상환일</th>
                  <th>상환금액</th>
                  <th>입금일</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((row) => (
                  <tr key={row.scheduleId}>
                    <td>{row.sequence}회차</td>
                    <td>{row.dueDate}</td>
                    <td>{formatWon(row.totalPaymentDue)}</td>
                    <td>{row.paidAt ?? "-"}</td>
                    <td>
                      <span
                        className={`badge badge--${row.status.toLowerCase()}`}
                      >
                        {SCHEDULE_STATUS_LABELS[row.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="schedule-pagination">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (num) => (
                    <button
                      key={num}
                      className={num === page ? "is-active" : ""}
                      onClick={() => setPage(num)}
                    >
                      {num}
                    </button>
                  ),
                )}
              </div>
            )}
          </>
        )}
      </div>

      <p className="disclaimer">
        * 본 화면의 상환 회차별 금액은 계약 조건을 기준으로 자동 산정된 예정
        금액으로, 실제 입금 및 처리 시점에 따라 표시된 상태와 차이가 있을 수
        있습니다. 금액은 원 단위 미만을 반올림하여 표시됩니다.
      </p>
    </div>
  );
}
