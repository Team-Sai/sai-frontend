import { authFetch } from '../../auth/authFetch';

import type {
  DashboardResponse,
} from '../types/dashboard';

type ErrorBody = {
  message?: string;
};

async function readBody(
  response: Response,
): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {
      message: text,
    };
  }
}

function getErrorMessage(
  body: unknown,
): string | undefined {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('message' in body)
  ) {
    return undefined;
  }

  const errorBody = body as ErrorBody;

  return typeof errorBody.message === 'string'
    ? errorBody.message
    : undefined;
}

async function requestJson<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await authFetch(
    url,
    options,
  );

  const body = await readBody(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(body) ??
        `요청 처리에 실패했습니다. (HTTP ${response.status})`,
    );
  }

  return body as T;
}

export const dashboardApi = {
  getDashboard: (
    yearMonth: string,
  ): Promise<DashboardResponse> =>
    requestJson<DashboardResponse>(
      `/api/integration/dashboard?yearMonth=${encodeURIComponent(
        yearMonth,
      )}`,
    ),
};