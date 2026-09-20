import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../settlement/styles/settlement-common.css";
import "../../settlement/styles/settlement-detail.css";
import "../styles/SchedulePage.css";
import {
  getScheduleSummary,
  getContractDetailForSchedule,
} from "../api/scheduleApi";
import { getContractAccount } from "../api/contractApi";
import type { LinkedBankAccount } from "../../accounts/types/account";
import type {
  RepaymentScheduleSummary,
  RepaymentScheduleRow,
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
  return `${year}. ${String(month).padStart(2, "0")}. ${String(day).padStart(2, "0")} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function rowStatusClass(status: RepaymentScheduleRow["status"]): string {
  if (status === "PAID") return "status-paid";
  if (status === "OVERDUE") return "status-overdue";
  if (status === "WRITTEN_OFF") return "status-written-off";
  return "status-unpaid";
}

export default function SchedulePage() {
  const { contractId } = useParams();

  if (!contractId) {
    return (
      <main className="page-shell settlement-detail-page contract-schedule-page">
        <div className="empty-state">잘못된 접근입니다.</div>
      </main>
    );
  }
  return <ScheduleContent key={contractId} contractId={contractId} />;
}

function ScheduleContent({ contractId }: { contractId: string }) {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<RepaymentScheduleSummary | null>(
    null,
  );
  const [contractDetail, setContractDetail] =
    useState<ContractDetailForSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [account, setAccount] = useState<LinkedBankAccount | null>(null);

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

  // 수취 계좌 조회는 채권자에게만 허용되므로, 채무자면 패널 자체를 숨긴다.
  useEffect(() => {
    if (!contractDetail?.isCreditor) return;
    let cancelled = false;
    getContractAccount(Number(contractId))
      .then((res) => {
        if (!cancelled) setAccount(res);
      })
      .catch(() => {
        if (!cancelled) setAccount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [contractDetail, contractId]);

  if (isLoading) {
    return (
      <main className="page-shell settlement-detail-page contract-schedule-page">
        <p className="updated-text">불러오는 중이에요...</p>
      </main>
    );
  }

  if (error || !schedule || !contractDetail) {
    return (
      <main className="page-shell settlement-detail-page contract-schedule-page">
        <div className="empty-state">{error ?? "데이터가 없습니다."}</div>
      </main>
    );
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
    <main className="page-shell settlement-detail-page contract-schedule-page">
      <section className="detail-heading">
        <div>
          <div className="heading-badges">
            <span className="badge badge-progress">
              {CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}
            </span>
            <span className="badge badge-role">
              {isCreditor ? "대여" : "차용"}
            </span>
          </div>
          <h1>{contract.contractAlias}</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => navigate("/contracts/dashboard")}
          >
            목록으로
          </button>
          {isCreditor && (
            <button
              type="button"
              className="button button-secondary"
              disabled
            >
              ↻ 거래내역 동기화
            </button>
          )}
          <button
            type="button"
            className="button button-primary"
            onClick={() => navigate(`/contracts/${contractId}/contract-detail`)}
          >
            계약서 보기
          </button>
        </div>
      </section>

      <section className="summary-card">
        <div className="summary-item">
          <span>총 상환예정액</span>
          <strong>{formatWon(schedule.totalScheduledAmount)}</strong>
        </div>
        <div className="summary-item">
          <span>누적 납부액</span>
          <strong className="text-success">{formatWon(schedule.paidAmount)}</strong>
        </div>
        <div className="summary-item">
          <span>잔여 상환액</span>
          <strong>{formatWon(schedule.remainingAmount)}</strong>
        </div>
        <div className="summary-progress">
          <div className="progress-meta">
            <span>진행률</span>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="progress-track">
            <div
              className="progress-bar"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
          <div className="progress-count">
            <strong>{schedule.paidCount}</strong>/<span>{schedule.totalCount}</span>회차
          </div>
        </div>
      </section>

      <section className="meta-card">
        <div className="meta-item">
          <span>생성일</span>
          <strong>{formatDateTimeKorean(contract.createdAt)}</strong>
        </div>
        <div className="meta-divider" />
        <div className="meta-item">
          <span>이율</span>
          <strong>{contract.interestRate}%</strong>
        </div>
        <div className="meta-divider" />
        <div className="meta-item">
          <span>상환방식</span>
          <strong>{REPAYMENT_METHOD_LABELS[contract.repaymentType]}</strong>
        </div>
        <div className="meta-divider" />
        <div className="meta-item meta-grow">
          <span>만기일</span>
          <strong>{contract.maturityDate}</strong>
        </div>
        <div className="meta-divider" />
        <div className="meta-item">
          <span>다음 납부일</span>
          <strong>{schedule.nextDueDate ?? "없음"}</strong>
        </div>
      </section>

      <div className="detail-grid">
        <aside className="side-column">
          {isCreditor && (
            <section className="panel">
              <div className="panel-header">
                <h2>상환 수취 계좌</h2>
                <button className="text-button" type="button" disabled>
                  계좌 변경
                </button>
              </div>
              {account ? (
                <div className="account-card">
                  <div className="account-icon">₩</div>
                  <div>
                    <span>{account.bankName}</span>
                    <strong>{account.maskedAccountNumber}</strong>
                    <small>{account.accountHolderName}</small>
                  </div>
                </div>
              ) : (
                <div className="empty-state">등록된 수취 계좌가 없습니다.</div>
              )}
            </section>
          )}

          <section className="panel">
            <div className="panel-header">
              <h2>계약 당사자</h2>
            </div>
            <div className="participant-avatar-list">
              <div className="participant-avatar">
                <div className="avatar-circle" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21a8 8 0 0 1 16 0" />
                  </svg>
                </div>
                <strong>{schedule.creditorName}</strong>
                <small>대여자</small>
              </div>
              <div className="participant-avatar">
                <div className="avatar-circle" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21a8 8 0 0 1 16 0" />
                  </svg>
                </div>
                <strong>{schedule.debtorName}</strong>
                <small>차용자</small>
              </div>
            </div>
          </section>
        </aside>

        <section className="panel participant-panel">
          <div className="panel-header participant-panel-header">
            <div>
              <h2>회차별 상환 내역</h2>
              <p>계약 조건에 따라 산정된 상환 회차별 예정 및 완료 내역입니다.</p>
            </div>
          </div>

          {schedule.schedules.length === 0 ? (
            <div className="empty-state">등록된 상환 스케줄이 없습니다.</div>
          ) : (
            <>
              <div className="table-scroll">
                <table className="payment-table">
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
                          <span className={`status-chip ${rowStatusClass(row.status)}`}>
                            ● {SCHEDULE_STATUS_LABELS[row.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
        </section>
      </div>

      <p className="local-data-note">
        * 본 화면의 상환 회차별 금액은 계약 조건을 기준으로 자동 산정된 예정
        금액으로, 실제 입금 및 처리 시점에 따라 표시된 상태와 차이가 있을 수
        있습니다. 금액은 원 단위 미만을 반올림하여 표시됩니다.
      </p>
    </main>
  );
}