import { authFetch } from '../../auth/authFetch';

import type {
  DashboardResponse,
} from '../types/dashboard';

async function readBody(response: Response): Promise<any> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function requestJson<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await authFetch(url, options);
  const body = await readBody(response);

  if (!response.ok) {
    throw new Error(
      body?.message ||
        `요청 처리에 실패했습니다. (HTTP ${response.status})`,
    );
  }

  return body as T;
}

export const dashboardApi = {
  getDashboard: (yearMonth: string) =>
    requestJson<DashboardResponse>(
      `/api/integration/dashboard?yearMonth=${encodeURIComponent(yearMonth)}`,
    ),
};