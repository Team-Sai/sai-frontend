import type { Transaction } from '../transaction/types';
import { matchingApi, ReviewApiError, type MatchingApi } from './api';
import { canReview, transactionKey, type MatchingReview, type MatchingReviewSource } from './types';

interface Outcome {
  kind: 'done' | 'blocked' | 'uncertain';
  message: string;
}

export interface ReviewState {
  reviews: MatchingReview[];
  selections: Record<string, number>;
  outcomes: Record<string, Outcome>;
  deferred: string[];
  loading: boolean;
  busy: boolean;
  hasNext: boolean;
  nextPage: number;
  totalCount: number;
  pageStale: boolean;
  error: string | null;
  message: string | null;
}

const initialState = (): ReviewState => ({
  reviews: [], selections: {}, outcomes: {}, deferred: [], loading: true, busy: false,
  hasNext: false, nextPage: 0, totalCount: 0, pageStale: false, error: null, message: null,
});

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.';
}

function terminalMessage(transaction: Transaction) {
  switch (transaction.processingStatus) {
    case 'APPLIED': return '반영 완료: 거래가 납부 대상에 반영되었습니다.';
    case 'UNMATCHED': return '미매칭 상태: 이 거래는 납부 대상에 반영되지 않았습니다.';
    case 'FAILED': return '처리 실패: 현재 이 거래의 매칭을 진행할 수 없습니다.';
    default: return '현재 매칭 검토 대상이 아닌 거래입니다.';
  }
}

// Owns the request lifetime and write lock independently of React render timing.
export class ReviewController {
  private state = initialState();
  private listeners = new Set<() => void>();
  private lifetime = new AbortController();
  private generation = 0;
  private active = false;
  private readonly source: MatchingReviewSource;
  private onStateChanged: () => void | Promise<void>;
  private readonly api: MatchingApi;

  constructor(source: MatchingReviewSource, onStateChanged: () => void | Promise<void>, api = matchingApi) {
    this.source = source;
    this.onStateChanged = onStateChanged;
    this.api = api;
  }

  getSnapshot = () => this.state;
  setOnStateChanged(callback: () => void | Promise<void>) { this.onStateChanged = callback; }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private update(patch: Partial<ReviewState>) {
    if (!this.active) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }

  private current(generation: number) {
    return this.active && this.generation === generation;
  }

  start() {
    this.lifetime = new AbortController();
    this.generation += 1;
    this.active = true;
    this.state = initialState();
    void this.load(false);
  }

  stop() {
    this.active = false;
    this.generation += 1;
    this.lifetime.abort();
  }

  private notify() {
    const generation = this.generation;
    // A parent's refresh failure must never turn an acknowledged write into a failure.
    void Promise.resolve().then(() => {
      if (this.current(generation)) return this.onStateChanged();
    }).catch(() => {
      if (this.current(generation)) this.update({ error: '거래 상태는 확인되었지만 연결된 화면을 갱신하지 못했습니다.' });
    });
  }

  private replaceReview(review: MatchingReview) {
    const key = transactionKey(review.transaction);
    const found = this.state.reviews.some(item => transactionKey(item.transaction) === key);
    this.update({ ...(this.source.kind === 'transaction' ? { totalCount: 1 } : {}), reviews: found
      ? this.state.reviews.map(item => transactionKey(item.transaction) === key ? review : item)
      : [...this.state.reviews, review] });
  }

  private outcome(transaction: Transaction, outcome: Outcome) {
    const key = transactionKey(transaction);
    this.update({ outcomes: { ...this.state.outcomes, [key]: outcome } });
  }

  private clearChoice(transaction: Transaction) {
    const key = transactionKey(transaction);
    const selections = { ...this.state.selections };
    delete selections[key];
    this.update({ selections });
  }

  private async load(append: boolean) {
    const generation = this.generation;
    this.update({ loading: true, error: null });
    try {
      if (this.source.kind === 'transaction') {
        const review = await this.api.review(this.source, this.lifetime.signal);
        if (!this.current(generation)) return;
        this.replaceReview(review);
        this.update({ totalCount: 1, pageStale: false });
        if (!canReview(review.transaction)) this.outcome(review.transaction, { kind: 'done', message: terminalMessage(review.transaction) });
      } else {
        const page = await this.api.list(this.source, append ? this.state.nextPage : 0, this.lifetime.signal);
        if (!this.current(generation)) return;
        const items = new Map((append ? this.state.reviews : []).map(item => [transactionKey(item.transaction), item]));
        page.content.forEach(item => items.set(transactionKey(item.transaction), item));
        this.update({ reviews: [...items.values()], hasNext: page.hasNext, nextPage: page.page + 1,
          totalCount: page.totalCount, pageStale: false, ...(append ? {} : { selections: {} }) });
      }
    } catch (error) {
      if (!this.current(generation)) return;
      if (this.source.kind === 'transaction' && error instanceof ReviewApiError && error.status === 409) {
        await this.reconcile(this.source);
      } else {
        this.update({ error: errorMessage(error) });
      }
    } finally {
      if (this.current(generation)) this.update({ loading: false });
    }
  }

  refresh = () => {
    if (this.state.busy || this.state.loading) return;
    if (this.source.kind === 'transaction') {
      const generation = this.generation;
      this.update({ loading: true, error: null });
      void this.reconcile(this.source).finally(() => {
        if (this.current(generation)) this.update({ loading: false });
      });
    } else {
      void this.load(false);
    }
  };

  more = () => {
    if (this.state.busy || this.state.loading || this.state.pageStale || !this.state.hasNext) return;
    void this.load(true);
  };

  select = (transaction: Transaction, candidateId: number) => {
    if (!this.editable(transaction)) return;
    const review = this.state.reviews.find(item => transactionKey(item.transaction) === transactionKey(transaction));
    if (!review?.candidates.some(item => item.matchCandidateId === candidateId)) return;
    this.update({ selections: { ...this.state.selections, [transactionKey(transaction)]: candidateId } });
  };

  defer = (transaction: Transaction) => {
    if (!this.editable(transaction)) return;
    this.update({ deferred: [...this.state.deferred, transactionKey(transaction)] });
  };

  private editable(transaction: Transaction) {
    const key = transactionKey(transaction);
    return this.active && !this.state.busy && !this.state.loading && !this.state.pageStale
      && canReview(transaction) && !this.state.outcomes[key] && !this.state.deferred.includes(key);
  }

  private async reconcile(transaction: Pick<Transaction, 'linkedAccountId' | 'bankTransactionId'>) {
    const generation = this.generation;
    let detail: Transaction | undefined;
    try {
      detail = await this.api.detail(transaction, this.lifetime.signal);
      if (!this.current(generation)) return;
      this.clearChoice(detail);
      if (canReview(detail)) {
        // Keep writes blocked until both the status and the current candidates are known.
        const review = await this.api.review(detail, this.lifetime.signal);
        if (!this.current(generation)) return;
        this.replaceReview(review);
        const outcomes = { ...this.state.outcomes };
        delete outcomes[transactionKey(detail)];
        this.update({ outcomes, message: '최신 거래 상태와 후보를 확인했습니다.', error: null });
      } else {
        this.replaceReview({ transaction: detail, candidates: [], reviewChannel: 'TRANSACTION_HISTORY' });
        this.outcome(detail, { kind: 'done', message: terminalMessage(detail) });
        this.update({ message: terminalMessage(detail), error: null });
      }
      this.notify();
      if (this.source.kind === 'list') {
        this.update({ pageStale: true });
        await this.load(false);
      }
    } catch (error) {
      if (!this.current(generation)) return;
      const previous = this.state.reviews.find(item => transactionKey(item.transaction) === transactionKey(transaction))?.transaction;
      if (detail || previous) {
        const known = detail ?? previous!;
        if (detail) this.replaceReview({ transaction: detail, candidates: [], reviewChannel: 'TRANSACTION_HISTORY' });
        this.outcome(known, {
          kind: error instanceof ReviewApiError && [403, 404].includes(error.status) ? 'blocked' : 'uncertain',
          message: errorMessage(error),
        });
      }
      this.update({ error: '거래 상태를 확인하지 못했습니다. 상태를 다시 확인해 주세요.' });
    }
  }

  checkStatus = async (transaction: Transaction) => {
    if (this.state.busy || this.state.loading || !this.active) return;
    const generation = this.generation;
    this.update({ busy: true });
    try { await this.reconcile(transaction); }
    finally { if (this.current(generation)) this.update({ busy: false }); }
  };

  process = async (transaction: Transaction, reject = false) => {
    if (!this.editable(transaction)) return;
    const key = transactionKey(transaction);
    const candidateId = reject ? null : this.state.selections[key];
    if (!reject && !candidateId) return;
    const generation = this.generation;
    this.update({ busy: true, error: null, message: null });
    try {
      const result = await this.api.process(transaction, candidateId, this.lifetime.signal);
      if (!this.current(generation)) return;
      this.clearChoice(transaction);
      if (result.reviewResult === 'CANDIDATE_INVALIDATED' && result.processingStatus === 'NEEDS_CHECK') {
        // Invalidating a candidate can remove this transaction from a filtered list.
        // Keep old page offsets blocked even if the following status read fails.
        if (this.source.kind === 'list') this.update({ pageStale: true });
        this.outcome(transaction, { kind: 'uncertain', message: '선택한 후보가 더 이상 유효하지 않습니다.' });
        this.notify();
        await this.reconcile(transaction);
        if (this.current(generation)) this.update({ message: '선택한 후보가 더 이상 유효하지 않습니다. 최신 후보를 확인해 주세요.' });
      } else {
        const updated = { ...transaction, processingStatus: result.processingStatus };
        this.replaceReview({ transaction: updated, candidates: [], reviewChannel: 'TRANSACTION_HISTORY' });
        this.outcome(updated, { kind: 'done', message: terminalMessage(updated) });
        this.update({ message: terminalMessage(updated) });
        this.notify();
        if (this.source.kind === 'list') {
          this.update({ pageStale: true });
          await this.load(false);
        }
      }
    } catch (error) {
      if (!this.current(generation)) return;
      if (error instanceof ReviewApiError && [403, 404].includes(error.status)) {
        this.outcome(transaction, { kind: 'blocked', message: errorMessage(error) });
        this.update({ error: errorMessage(error) });
      } else if (error instanceof ReviewApiError && error.status >= 400 && error.status < 500 && error.status !== 409) {
        this.update({ error: errorMessage(error) });
      } else {
        this.outcome(transaction, { kind: 'uncertain', message: '처리 결과를 확인하고 있습니다.' });
        this.update({ error: '처리 결과를 확인해야 합니다. 거래 상태를 조회합니다.',
          ...(this.source.kind === 'list' ? { pageStale: true } : {}) });
        await this.reconcile(transaction);
      }
    } finally {
      if (this.current(generation)) this.update({ busy: false });
    }
  };
}
