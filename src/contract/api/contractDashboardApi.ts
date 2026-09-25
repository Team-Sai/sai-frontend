import { authFetch } from "../../auth/authFetch";
import type {
  DashboardResponse,
  DashboardContractRow,
} from "../types/contractDashboard";

function isDashboardContractRow(value: unknown): value is DashboardContractRow {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const row = value as Record<string, unknown>;

  return (
    typeof row.contractId === "number" &&
    typeof row.contractAlias === "string" &&
    typeof row.role === "string" &&
    typeof row.principalAmount === "number" &&
    typeof row.totalRemainingAmount === "number" &&
    typeof row.contractStatus === "string" &&
    typeof row.paymentStatus === "string" &&
    typeof row.maturityDate === "string" &&
    (typeof row.nearestScheduleDueDate === "string" ||
      row.nearestScheduleDueDate === null) &&
    (typeof row.nextDueAmount === "number" || row.nextDueAmount === null)
  );
}

function isDashboardResponse(value: unknown): value is DashboardResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    typeof data.summary === "object" &&
    typeof data.currentPage === "number" &&
    typeof data.totalPages === "number" &&
    typeof data.totalCount === "number" &&
    typeof data.pageSize === "number" &&
    data.summary !== null &&
    Array.isArray(data.contracts) &&
    data.contracts.every(isDashboardContractRow)
  );
}

export interface DashboardQuery {
  keyword?: string;
  statusFilter?: string;
  sortType?: string;
  page?: number;
}

export async function getDashboard(
  query: DashboardQuery = {},
): Promise<DashboardResponse> {
  const params = new URLSearchParams();

  if (query.keyword) params.set("keyword", query.keyword);
  if (query.statusFilter) params.set("statusFilter", query.statusFilter);
  if (query.sortType) params.set("sortType", query.sortType);
  if (query.page) params.set("page", String(query.page));

  const queryString = params.toString();

  const response = await authFetch(
    `/api/contracts/dashboard${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error(
      `대시보드 정보를 불러오지 못했습니다. (HTTP ${response.status})`,
    );
  }

  const data: unknown = await response.json();

  if (!isDashboardResponse(data)) {
    throw new Error("대시보드 응답 형식이 올바르지 않습니다.");
  }

  return data;
}
