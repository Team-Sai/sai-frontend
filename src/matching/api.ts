import { authFetch } from '../auth/authFetch';
import type { Transaction } from '../transaction/types';
import type { MatchingReview, MatchingReviewSource, ProcessResult, ReviewPage } from './types';

export class ReviewApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const timeout = AbortSignal.timeout(30_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const response = await authFetch(url, { ...options, signal });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ReviewApiError(typeof body?.message === 'string' ? body.message : '요청을 처리하지 못했습니다.', response.status);
  }
  if (!body || typeof body !== 'object') throw new Error('서버 응답을 확인하지 못했습니다.');
  return body as T;
}

function base(transaction: Pick<Transaction, 'linkedAccountId' | 'bankTransactionId'>) {
  if (![transaction.linkedAccountId, transaction.bankTransactionId].every(id => Number.isSafeInteger(id) && id > 0)) {
    throw new ReviewApiError('거래 식별 정보를 확인할 수 없습니다.', 400);
  }
  return `/api/linked-accounts/${transaction.linkedAccountId}/transactions/${transaction.bankTransactionId}`;
}

export const matchingApi = {
  async review(transaction: Pick<Transaction, 'linkedAccountId' | 'bankTransactionId'>, signal: AbortSignal) {
    const body = await request<MatchingReview>(`${base(transaction)}/match-candidates`, { signal });
    if (!body.transaction || !Array.isArray(body.candidates)) throw new Error('매칭 후보 응답이 올바르지 않습니다.');
    return body;
  },
  async detail(transaction: Pick<Transaction, 'linkedAccountId' | 'bankTransactionId'>, signal: AbortSignal) {
    const body = await request<Transaction>(base(transaction), { signal });
    if (body.bankTransactionId !== transaction.bankTransactionId || body.linkedAccountId !== transaction.linkedAccountId
      || !['PENDING', 'APPLIED', 'UNMATCHED', 'NEEDS_CHECK', 'FAILED'].includes(body.processingStatus)) {
      throw new Error('거래 상태 응답이 올바르지 않습니다.');
    }
    return body;
  },
  async list(source: Extract<MatchingReviewSource, { kind: 'list' }>, page: number, signal: AbortSignal) {
    const query = new URLSearchParams({ reviewChannel: source.reviewChannel, page: String(page), size: '20' });
    if (source.targetType) query.set('targetType', source.targetType);
    if (source.aggregateId != null) query.set('aggregateId', String(source.aggregateId));
    const body = await request<ReviewPage>(`/api/matching-reviews?${query}`, { signal });
    if (!Array.isArray(body.content) || !Number.isInteger(body.page) || typeof body.hasNext !== 'boolean') {
      throw new Error('검토 목록 응답이 올바르지 않습니다.');
    }
    return body;
  },
  async process(transaction: Transaction, candidateId: number | null, signal: AbortSignal) {
    const body = await request<ProcessResult>(`${base(transaction)}/matching-review/${candidateId == null ? 'reject' : 'apply'}`, {
      method: 'POST', signal,
      ...(candidateId == null ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchCandidateId: candidateId }) }),
    });
    if (body.bankTransactionId !== transaction.bankTransactionId
      || !['APPLIED', 'REJECTED', 'CANDIDATE_INVALIDATED'].includes(body.reviewResult)
      || !['APPLIED', 'UNMATCHED', 'FAILED', 'NEEDS_CHECK'].includes(body.processingStatus)
      || (body.reviewResult === 'APPLIED' && body.processingStatus !== 'APPLIED')
      || (body.reviewResult === 'REJECTED' && body.processingStatus !== 'UNMATCHED')
      || (body.reviewResult === 'CANDIDATE_INVALIDATED' && body.processingStatus === 'APPLIED')) {
      throw new Error('처리 결과를 확인하지 못했습니다.');
    }
    return body;
  },
};

export type MatchingApi = typeof matchingApi;
