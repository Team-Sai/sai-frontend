import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDashboard } from "../api/contractDashboardApi";
import { settlementApi } from "../../settlement/api/settlementApi";
import MatchingReviewModal from "../../settlement/components/MatchingReviewModal";
import LoadingSkeleton from "../../common/components/LoadingSkeleton";
import { formatTransactionSyncTime, getLastTransactionSyncAt, recordTransactionSync } from "../../transaction/syncTimestamp";
import "../../settlement/styles/settlement-common.css";
import "../../settlement/styles/settlement-list.css";
import "../styles/ContractDashboardPage.css";
import type { DashboardResponse } from "../types/contractDashboard";
import {
  CONTRACT_ROLE_LABELS,
  CONTRACT_STATUS_LABELS,
} from "../types/contractDashboard";
import RelationModal from "../components/RelationModal";
import type { ContractRelationType } from "../types/contract";

const money = (v: number) =>
  v.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
export default function ContractDashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortType, setSortType] = useState("");
  const [page, setPage] = useState(1);
  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncTime, setSyncTime] = useState(() => formatTransactionSyncTime(getLastTransactionSyncAt()));
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const navigate = useNavigate();

  function showToast(text: string, error = false) {
    setToast({ text, error });
    window.setTimeout(() => setToast(null), 4000);
  }

  async function syncTransactions() {
    try {
      setIsSyncing(true);
      const result = await settlementApi.syncAll();
      setSyncTime(formatTransactionSyncTime(recordTransactionSync()));
      showToast(
        `동기화 완료: 자동반영 ${result.appliedCount ?? 0}건, 확인필요 ${result.needsCheckCount ?? 0}건, 미매칭 ${result.unmatchedCount ?? 0}건`,
      );
      await refreshDashboard();
      setIsReviewOpen(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "거래내역 동기화에 실패했습니다.", true);
    } finally {
      setIsSyncing(false);
    }
  }

  async function refreshDashboard() {
    try {
      const refreshed = await getDashboard({ keyword, statusFilter, sortType, page });
      setData(refreshed);
      setError(null);
    } catch {
      setError("대시보드 정보를 불러오지 못했습니다.");
    }
  }

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
    }, keyword ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [keyword, statusFilter, sortType, page]);

  if (isLoading) {
    return (
      <main className="page-shell settlement-list-page contract-dashboard-page">
        <LoadingSkeleton className="loading-skeleton--page" rows={7} />
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
          <h1 className="unified-page-title">대여금 관리</h1>
        </div>
        <div className="heading-actions">
          <p className="updated-text">최근 동기화 <span>{syncTime}</span></p>
          <button
            type="button"
            className="button button-secondary settlement-sync-button"
            onClick={() => void syncTransactions()}
            disabled={isSyncing}
          >
            {isSyncing && <span className="button-spinner" aria-hidden="true" />}
            ↻ 거래내역 동기화
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={() => setIsRelationModalOpen(true)}
          >
            차용증 작성
          </button>
        </div>
      </section>

      <section className="summary-grid" aria-label="차용증 요약">
        <article className="summary-card">
          <div>
            <p className="summary-label">전체 차용증</p>
            <p className="summary-value">
              <strong>{data.summary.totalContractCount}</strong>
              <span>건</span>
            </p>
          </div>
            <p className="summary-foot">완료된 차용증 포함</p>
        </article>
        <article className="summary-card">
          <div>
            <p className="summary-label">대여 잔액</p>
            <p className="summary-value">
              <strong>{money(data.summary.totalLentAmount)}</strong>
              <span>원</span>
            </p>
          </div>
          <span className="summary-arrow">↙</span>
          <p className="summary-foot">미회수 대여 원금 합계</p>
        </article>
        <article className="summary-card">
          <div>
            <p className="summary-label">차입 잔액</p>
            <p className="summary-value">
              <strong>{money(data.summary.totalBorrowedAmount)}</strong>
              <span>원</span>
            </p>
          </div>
          <span className="summary-arrow positive">↗</span>
          <p className="summary-foot">
            당월 상환 예정액 <span>{money(data.summary.thisMonthDueAmount)}원</span>
          </p>
        </article>
      </section>

      <section className="filter-panel">
        <label className="search-box">
          <span>⌕</span>
          <input
            type="search"
            placeholder="차용증명 검색"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="filter-field">
            <span>진행 상태</span>
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
            <option value="">등록순</option>
            <option value="ALPHABET">이름순</option>
            <option value="AMOUNT_DESC">대여 원금 큰 순</option>
            <option value="DEADLINE">최종 상환기일순</option>
          </select>
        </label>
      </section>

      <section className="table-card" aria-label="차용증 목록">
        <div className="settlement-table settlement-table-head contract2-table-head-wide">
          <span>차용증명</span>
          <span>당사자 구분</span>
          <span>대여 원금 / 잔여 원금</span>
          <span>차기 상환 예정액</span>
          <span>차기 상환일</span>
          <span>상환 상태</span>
          <span>최종 상환기일</span>
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
            <h2>아직 등록된 차용증이 없습니다.</h2>
            <p>차용증을 작성하면 대여·상환 현황을 확인할 수 있습니다.</p>
            <button
              type="button"
              className="button button-primary"
              onClick={() => setIsRelationModalOpen(true)}
            >
              첫 차용증 작성하기
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
      {isReviewOpen && (
        <MatchingReviewModal
          open
          onClose={(changed) => {
            setIsReviewOpen(false);
            if (changed) void refreshDashboard();
          }}
          options={{ reviewChannel: "TRANSACTION_HISTORY", targetType: "LOAN" }}
        />
      )}
      {toast && (
        <div className={`toast visible${toast.error ? " error" : ""}`} role="status">
          {toast.text}
        </div>
      )}
    </main>
  );
}
