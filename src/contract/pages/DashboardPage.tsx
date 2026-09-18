import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboard } from "../api/dashboardApi";
import "../shared.css";
import type { DashboardResponse } from "../types/dashboard";
import {
  CONTRACT_ROLE_LABELS,
  CONTRACT_STATUS_LABELS,
} from "../types/dashboard";
import "../styles/DashboardPage.css";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortType, setSortType] = useState("");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      getDashboard({ keyword, statusFilter, sortType, page })
        .then((res) => {
          if (cancelled) return;
          setData(res);
          setError(null);
        })
        .catch(() => {
          if (cancelled) return;
          setError("대시보드 정보를 불러오지 못했습니다.");
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [keyword, statusFilter, sortType, page]);

  if (isLoading) {
    return <div className="contract-scope contract-scope--dashboard">불러오는 중이에요...</div>;
  }

  if (error || !data) {
    return <div className="contract-scope contract-scope--dashboard">{error ?? "데이터가 없습니다."}</div>;
  }

  return (
    <div className="contract-scope contract-scope--dashboard">
      <section className="dashboard-summary">
        <div className="summary-card">
          <span className="summary-card__label">전체 계약</span>
          <span className="summary-card__value">
            {data.summary.totalContractCount}건
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-card__label">받을 돈</span>
          <span className="summary-card__value">
            {data.summary.totalLentAmount.toLocaleString("ko-KR", {
              maximumFractionDigits: 0,
            })}
            원
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-card__label">갚을 돈</span>
          <span className="summary-card__value">
            {data.summary.totalBorrowedAmount.toLocaleString("ko-KR", {
              maximumFractionDigits: 0,
            })}
            원
          </span>
        </div>
      </section>

      <input
        type="search"
        placeholder="계약명 검색"
        value={keyword}
        onChange={(e) => {
          setKeyword(e.target.value);
          setPage(1);
        }}
        className="dashboard-search"
      />

      <select
        value={statusFilter}
        onChange={(e) => {
          setStatusFilter(e.target.value);
          setPage(1);
        }}
      >
        <option value="">전체</option>
        <option value="ONGOING">진행 중</option>
        <option value="COMPLETED">완료</option>
      </select>

      <select
        value={sortType}
        onChange={(e) => {
          setSortType(e.target.value);
          setPage(1);
        }}
      >
        <option value="">기본순</option>
        <option value="ALPHABET">이름순</option>
        <option value="AMOUNT_DESC">금액 높은순</option>
        <option value="DEADLINE">마감일순</option>
      </select>

      {data.contracts.length === 0 ? (
        <div className="dashboard-empty">표시할 계약이 없습니다.</div>
      ) : (
        <div className="contract-table">
          <div className="contract-table__head">
            <span>계약명</span>
            <span>역할</span>
            <span>거래 금액(원금/잔액)</span>
            <span>다음 상환 예정금액</span>
            <span>다음 상환일</span>
            <span>계약 상태</span>
            <span>만기일</span>
          </div>

          {data.contracts.map((contract) => (
            <div
              key={contract.contractId}
              className="contract-table__row"
              onClick={() =>
                navigate(`/contracts/${contract.contractId}/schedule`)
              }
            >
              <span className="contract-table__alias">
                {contract.contractAlias}
              </span>
              <span
                className={`badge ${
                  contract.role === "CREDITOR" ? "badge--role" : "badge--debtor"
                }`}
              >
                {CONTRACT_ROLE_LABELS[contract.role]}
              </span>
              <span>
                {contract.principalAmount.toLocaleString("ko-KR", {
                  maximumFractionDigits: 0,
                })}
                원 /{" "}
                {contract.totalRemainingAmount.toLocaleString("ko-KR", {
                  maximumFractionDigits: 0,
                })}
                원
              </span>
              <span>
                {contract.nextDueAmount !== null
                  ? `${contract.nextDueAmount.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}원`
                  : "-"}
              </span>
              <span>{contract.nearestScheduleDueDate ?? "-"}</span>
              <span
                className={`badge ${
                  contract.contractStatus === "COMPLETED"
                    ? "badge--completed"
                    : "badge--progress"
                }`}
              >
                {CONTRACT_STATUS_LABELS[contract.contractStatus]}
              </span>
              <span>{contract.maturityDate}</span>
            </div>
          ))}
        </div>
      )}

      <div className="dashboard-pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
          이전
        </button>
        <span>
          {data.currentPage} / {data.totalPages}
        </span>
        <button
          disabled={page >= data.totalPages}
          onClick={() => setPage(page + 1)}
        >
          다음
        </button>
      </div>
      <p className="disclaimer">
        * 본 화면에 표시되는 금액과 일정은 각 계약의 내용을 요약하여 참고용으로
        안내하는 정보이며, 실제 계약 조건 및 확정 금액은 개별 계약서 원문을
        기준으로 합니다. 금액은 원 단위 미만을 반올림하여 표시되며, 실제 정산
        금액과 소수점 이하 차이가 있을 수 있습니다.
      </p>
    </div>
  );
}
