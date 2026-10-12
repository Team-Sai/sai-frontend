import { authFetch } from '../../auth/authFetch';

import type {
  ContractLegalReviewRequest,
  ContractLegalReviewResponse,
} from '../types/legalReview';

export async function reviewContractLegal(
  request: ContractLegalReviewRequest,
  signal?: AbortSignal,
): Promise<ContractLegalReviewResponse> {
  const response = await authFetch(
    '/api/contracts/legal-review',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(request),
      signal,
    },
  );

  if (!response.ok) {
    let message =
      `법률 검토 요청에 실패했습니다. (HTTP ${response.status})`;

    try {
      const body = await response.json();

      if (
        body &&
        typeof body === 'object' &&
        'message' in body &&
        typeof body.message === 'string'
      ) {
        message = body.message;
      }

      if (
        body &&
        typeof body === 'object' &&
        'detail' in body &&
        typeof body.detail === 'string'
      ) {
        message = body.detail;
      }
    } catch {
      // 응답 body 파싱 실패 시 기본 메시지 사용
    }

    throw new Error(message);
  }

  const data =
    (await response.json()) as ContractLegalReviewResponse;

  if (!data.review) {
    throw new Error(
      '법률 검토 응답 형식이 올바르지 않습니다.',
    );
  }

  return data;
}