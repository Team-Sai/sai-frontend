import { useEffect, useState, type FormEvent } from 'react';
import { Button, Select } from '../../common/components';
import LoadingSkeleton from '../../common/components/LoadingSkeleton';
import { getLinkedAccounts } from '../../accounts/api/accountApi';
import type { LinkedBankAccount } from '../../accounts/types/account';
import { formatMoney, formatTransactionDate, transactionStatusLabels } from '../format';
import { getIntegratedTransactions } from '../integratedApi';
import type { IntegratedTransactionQuery } from '../integratedApi';
import type { IntegratedTransaction, IntegratedTransactionStatus, TransactionPage } from '../integratedTypes';

function formatAmount(transaction: IntegratedTransaction): string {
  const prefix = transaction.transactionType === 'DEPOSIT' ? '+' : '-';
  return `${prefix}${formatMoney(transaction.amount)}`;
}

export default function IntegratedTransactionPage() {
  const [accounts, setAccounts] = useState<LinkedBankAccount[]>([]);
  const [result, setResult] = useState<TransactionPage | null>(null);
  const [accountId, setAccountId] = useState('');
  const [status, setStatus] = useState<'' | IntegratedTransactionStatus>('');
  const [keyword, setKeyword] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [query, setQuery] = useState<IntegratedTransactionQuery>({ page: 0, size: 20 });
  const [accountError, setAccountError] = useState('');
  const [accountRetry, setAccountRetry] = useState(0);
  const [dateError, setDateError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void getLinkedAccounts().then(value => {
      if (active) { setAccounts(value); setAccountError(''); }
    }).catch(() => {
      if (active) setAccountError('계좌 목록을 불러오지 못했습니다. 다시 시도해 주세요.');
    });
    return () => { active = false; };
  }, [accountRetry]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      setIsLoading(true);
      setError('');
      setResult(null);
      try {
        const value = await getIntegratedTransactions(query, controller.signal);
        if (active) setResult(value);
      } catch (e) {
        if (active) {
          setResult(null);
          setError(e instanceof Error ? e.message : '거래내역을 불러오지 못했습니다.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [query]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (fromDate && toDate && fromDate > toDate) {
      setDateError('시작일은 종료일보다 늦을 수 없습니다.');
      return;
    }
    setDateError('');
    setResult(null);
    setIsLoading(true);
    setQuery({
      linkedAccountId: accountId ? Number(accountId) : undefined,
      processingStatus: status || undefined, keyword: keyword.trim() || undefined,
      fromDate: fromDate || undefined, toDate: toDate || undefined, page: 0, size: 20,
    });
  }

  function changePage(page: number) {
    setResult(null);
    setIsLoading(true);
    setQuery(current => ({ ...current, page }));
  }

  return <div className="mx-auto w-[min(1040px,calc(100%-40px))] py-9 pb-18">
    <div className="mb-6">
      <h1 className="m-0 text-[36px] leading-none font-extrabold">거래내역</h1>
      <p className="mt-3 text-base text-muted">연결된 계좌의 거래내역을 확인할 수 있습니다.</p>
    </div>
    <form onSubmit={submit} className="mb-4 rounded-lg border border-[#d9dee8] bg-surface p-5 shadow-[0_10px_30px_rgba(28,39,60,0.08)]">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Select aria-label="계좌 선택" value={accountId} onChange={e => setAccountId(e.target.value)}>
          <option value="">전체 계좌</option>{accounts.map(a => <option key={a.linkedAccountId} value={a.linkedAccountId}>{a.bankName} {a.maskedAccountNumber}</option>)}
        </Select>
        <Select aria-label="처리 상태" value={status} onChange={e => setStatus(e.target.value as typeof status)}><option value="">전체 상태</option>{Object.entries(transactionStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select>
        <input aria-label="거래 상대 또는 메모 검색" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="거래 상대 또는 메모 검색" className="h-11 rounded-md border border-outline bg-background px-3.5 text-sm outline-none focus:border-primary" />
        <input aria-label="시작일" type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setDateError(''); }} className="h-11 rounded-md border border-outline bg-background px-3.5 text-sm" />
        <input aria-label="종료일" type="date" value={toDate} onChange={e => { setToDate(e.target.value); setDateError(''); }} className="h-11 rounded-md border border-outline bg-background px-3.5 text-sm" />
        <Button type="submit" className="h-11 rounded-lg px-5 text-sm md:col-start-3 md:row-start-2 md:justify-self-end">검색</Button>
      </div>
      {dateError && <p role="alert" className="mt-3 text-xs text-error">{dateError}</p>}
      {accountError && <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 text-xs text-error">
        {accountError}
        <Button variant="secondary" controlSize="sm" onClick={() => setAccountRetry(n => n + 1)}>계좌 다시 조회</Button>
      </div>}
    </form>
    {error && <div role="alert" className="mb-4 rounded-lg border border-[#f0beb9] bg-[#fff2f1] px-3.5 py-3 text-xs text-error">{error}</div>}
    <section className="rounded-lg border border-[#d9dee8] bg-surface p-5 shadow-[0_10px_30px_rgba(28,39,60,0.08)]">
      <div className="mb-3 flex items-center justify-between border-b border-outline pb-3"><h2 className="m-0 text-[17px] font-bold">거래 목록</h2><span className="text-xs text-muted">총 {result?.totalCount ?? 0}건</span></div>
      {isLoading ? <LoadingSkeleton className="loading-skeleton--page" rows={6} /> : result?.content.length === 0 ? <div className="py-14 text-center text-sm text-muted">표시할 거래내역이 없습니다.</div> : <ul className="m-0 list-none p-0">{result?.content.map(t => <li key={`${t.linkedAccountId}-${t.bankTransactionId}`} className="border-b border-outline py-4 last:border-0"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{t.counterpartyName?.trim() || '거래 상대 미상'}</strong><span className="text-[11px] text-muted">{t.bankName} {t.maskedAccountNumber}</span></div><div className="mt-1 text-xs text-muted">{formatTransactionDate(t.transactionAt)} · {t.memo?.trim() || '메모 없음'}</div></div><div className="text-right"><strong className={`text-base ${t.transactionType === 'DEPOSIT' ? 'text-[#056347]' : 'text-[#a23d3d]'}`}>{formatAmount(t)}</strong><div className="mt-1 text-[11px] text-muted">{transactionStatusLabels[t.processingStatus]}</div></div></div></li>)}</ul>}
      {error && <div className="py-6 text-center">
        <Button variant="secondary" onClick={() => setQuery(current => ({ ...current }))}>다시 조회</Button>
      </div>}
      {!isLoading && result && result.totalPages > 1 && <div className="mt-4 flex items-center justify-center gap-3 border-t border-outline pt-4">
        <Button variant="secondary" controlSize="sm" disabled={!result.hasPrevious} onClick={() => changePage(result.page - 1)}>이전</Button>
        <span className="text-xs text-muted">{result.page + 1} / {result.totalPages}</span>
        <Button variant="secondary" controlSize="sm" disabled={!result.hasNext} onClick={() => changePage(result.page + 1)}>다음</Button>
      </div>}
    </section>
  </div>;
}
