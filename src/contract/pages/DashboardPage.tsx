import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDashboard } from "../api/dashboardApi";
import "../../settlement/styles/settlement-common.css";
import "../../settlement/styles/settlement-list.css";
import "../styles/DashboardPage.css";
import type { DashboardResponse } from "../types/dashboard";
import {
  CONTRACT_ROLE_LABELS,
  CONTRACT_STATUS_LABELS,
} from "../types/dashboard";
import RelationModal from "../components/RelationModal";
import type { ContractRelationType } from "../types/contract";

const money = (v: number) =>
  v.toLocaleString("ko-KR", { maximumFractionDigits: 0 });

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortType, setSortType] = useState("");
  const [page, setPage] = useState(1);
  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false);
  const navigate = useNavigate();

  function handleRelationConfirm(relation: ContractRelationType) {
    setIsRelationModalOpen(false);
    navigate(`/contracts/new?relation=${relation}`);
  }

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
    return (
      <main className="page-shell settlement-list-page contract-dashboard-page">
        <p className="updated-text">불러오는 중이에요...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="page-shell settlement-list-page contract-dashboard-page">
        <p className="updated-text">{error ?? "데이터가 없습니다."}</p>
      </main>
    );
  }

  return (
    <main className="page-shell settlement-list-page contract-dashboard-page">
      <section className="page-heading unified-page-header">
        <div>
          <h1 className="unified-page-title">금전소비대차 대시보드</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={() => setIsRelationModalOpen(true)}
          >
            + 새 계약 작성
          </button>
        </div>
      </section>

      <section className="summary-grid" aria-label="계약 요약">
        <article className="summary-card">
          <div>
            <p className="summary-label">전체 계약 수</p>
            <p className="summary-value">
              <strong>{data.summary.totalContractCount}</strong>
              <span>건</span>
            </p>
          </div>
          <p className="summary-foot">진행 중인 계약을 포함한 전체 건수</p>
        </article>
        <article className="summary-card">
          <div>
            <p className="summary-label">받을 금액</p>
            <p className="summary-value">
              <strong>{money(data.summary.totalLentAmount)}</strong>
              <span>원</span>
            </p>
          </div>
          <span className="summary-arrow">↙</span>
          <p className="summary-foot">내가 빌려준 계약의 잔여 금액</p>
        </article>
        <article className="summary-card">
          <div>
            <p className="summary-label">보낼 금액</p>
            <p className="summary-value">
              <strong>{money(data.summary.totalBorrowedAmount)}</strong>
              <span>원</span>
            </p>
          </div>
          <span className="summary-arrow positive">↗</span>
          <p className="summary-foot">
            이번 달 상환 예정 <span>{money(data.summary.thisMonthDueAmount)}원</span>
          </p>
        </article>
      </section>

      <section className="filter-panel">
        <label className="search-box">
          <span>⌕</span>
          <input
            type="search"
            placeholder="계약명 검색"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="filter-field">
          <span>계약 상태</span>
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
        </label>
        <label className="filter-field">
          <span>정렬</span>
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
        </label>
      </section>

      <section className="table-card" aria-label="계약 목록">
        <div className="settlement-table settlement-table-head contract2-table-head-wide">
          <span>계약명</span>
          <span>역할</span>
          <span>거래 금액(원금/잔액)</span>
          <span>다음 상환 예정금액</span>
          <span>다음 상환일</span>
          <span>계약 상태</span>
          <span>만기일</span>
          <span>상세</span>
        </div>

        {data.contracts.length > 0 ? (
          <div className="settlement-list">
            {data.contracts.map((contract) => (
              <article
                key={contract.contractId}
                className="settlement-table settlement-row contract2-row-wide"
                onClick={() =>
                  navigate(`/contracts/${contract.contractId}/schedule`)
                }
              >
                <div className="settlement-name">
                  <span>{contract.contractAlias}</span>
                </div>
                <span
                  className={`type-badge ${
                    contract.role === "CREDITOR" ? "badge-role" : "badge-debtor"
                  }`}
                >
                  {CONTRACT_ROLE_LABELS[contract.role]}
                </span>
                <span>
                  {money(contract.principalAmount)}원 /{" "}
                  {money(contract.totalRemainingAmount)}원
                </span>
                <span>
                  {contract.nextDueAmount !== null
                    ? `${money(contract.nextDueAmount)}원`
                    : "-"}
                </span>
                <span>{contract.nearestScheduleDueDate ?? "-"}</span>
                <span
                  className={`status-badge ${
                    contract.contractStatus === "COMPLETED"
                      ? "badge-completed"
                      : "badge-progress"
                  }`}
                >
                  {CONTRACT_STATUS_LABELS[contract.contractStatus]}
                </span>
                <span>{contract.maturityDate}</span>
                <Link
                  className="detail-link"
                  to={`/contracts/${contract.contractId}/schedule`}
                  aria-label={`${contract.contractAlias} 상세 조회`}
                  onClick={(e) => e.stopPropagation()}
                >
                  ›
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">₩</div>
            <h2>아직 등록된 계약이 없습니다.</h2>
            <p>금전소비대차 계약을 작성하면 이 화면에서 조회할 수 있습니다.</p>
            <button
              type="button"
              className="button button-primary"
              onClick={() => setIsRelationModalOpen(true)}
            >
              첫 계약 작성하기
            </button>
          </div>
        )}
      </section>

      {data.totalPages > 1 && (
        <div className="dashboard-pagination">
          <button
            className="button button-secondary button-small"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            이전
          </button>
          <span className="updated-text">
            {data.currentPage} / {data.totalPages}
          </span>
          <button
            className="button button-secondary button-small"
            disabled={page >= data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            다음
          </button>
        </div>
      )}

      <p className="local-data-note">
        * 본 화면에 표시되는 금액과 일정은 각 계약의 내용을 요약하여 참고용으로
        안내하는 정보이며, 실제 계약 조건 및 확정 금액은 개별 계약서 원문을
        기준으로 합니다. 금액은 원 단위 미만을 반올림하여 표시되며, 실제 정산
        금액과 소수점 이하 차이가 있을 수 있습니다.
      </p>

      {isRelationModalOpen && (
        <RelationModal
          onClose={() => setIsRelationModalOpen(false)}
          onConfirm={handleRelationConfirm}
        />
      )}
    </main>
  );
}