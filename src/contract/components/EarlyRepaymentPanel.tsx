import { useEffect, useState } from "react";
import { getEarlyRepaymentDeposits, processEarlyRepayment } from "../api/scheduleApi";
import type { EarlyRepaymentDeposit, EarlyRepaymentHistory } from "../types/schedule";

function won(amount: number): string {
  return `${amount.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}원`;
}

function dismissedKey(contractId: number): string {
  return `sai.early-repayment.dismissed.${contractId}`;
}

function readDismissed(contractId: number): number[] {
  try {
    return JSON.parse(localStorage.getItem(dismissedKey(contractId)) ?? "[]") as number[];
  } catch {
    return [];
  }
}

function saveDismissed(contractId: number, ids: number[]) {
  try {
    localStorage.setItem(dismissedKey(contractId), JSON.stringify(ids));
  } catch {
    // 저장이 막힌 브라우저에서는 이번 화면에서만 숨긴다.
  }
}

interface PanelProps {
  contractId: number;
  isCreditor: boolean;
  reloadKey: number;
  history: EarlyRepaymentHistory[];
  onDone: () => void;
}

export default function EarlyRepaymentPanel({
  contractId,
  isCreditor,
  reloadKey,
  history,
  onDone,
}: PanelProps) {
  const [deposits, setDeposits] = useState<EarlyRepaymentDeposit[]>([]);
  const [dismissed, setDismissed] = useState<number[]>(() => readDismissed(contractId));

  useEffect(() => {
    if (!isCreditor) return;
    let cancelled = false;
    getEarlyRepaymentDeposits(contractId)
      .then((rows) => {
        if (!cancelled) setDeposits(rows);
      })
      .catch(() => {
        if (!cancelled) setDeposits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [contractId, isCreditor, reloadKey]);

  function dismiss(id: number) {
    const next = [...dismissed, id];
    setDismissed(next);
    saveDismissed(contractId, next);
  }

  const visible = deposits.filter((row) => !dismissed.includes(row.bankTransactionId));
  const historyTotal = history.reduce((sum, item) => sum + item.amount, 0);

  if (visible.length === 0 && history.length === 0) {
    return null;
  }

  return (
    <div className="early-repayment">
      {visible.length > 0 && (
        <p className="early-repayment__title">확인이 필요한 입금 {visible.length}건</p>
      )}

      {visible.map((deposit) => (
        <DepositCard
          key={deposit.bankTransactionId}
          contractId={contractId}
          deposit={deposit}
          onDone={onDone}
          onDismiss={() => dismiss(deposit.bankTransactionId)}
        />
      ))}

      {history.length > 0 && (
        <details className="early-repayment__fold">
          <summary>
            <span className="early-repayment__badge">중도상환</span>
            <span>내역 {history.length}건</span>
            <strong>총 {won(historyTotal)}</strong>
          </summary>

          <div className="early-repayment__fold-body">
            {history.map((item) => (
              <div className="early-repayment__history" key={item.earlyRepaymentId}>
                <div className="early-repayment__history-head">
                  <span className="early-repayment__date">{item.processedAt.slice(0, 10)}</span>
                  <strong>{won(item.amount)}</strong>
                </div>
                <dl className="early-repayment__rows">
                  {item.shortfallAmount > 0 && (
                    <div><dt>부족 회차</dt><dd>{won(item.shortfallAmount)}</dd></div>
                  )}
                  <div><dt>경과 이자</dt><dd>{won(item.accruedInterest)}</dd></div>
                  {item.feeAmount > 0 && (
                    <div><dt>수수료</dt><dd>{won(item.feeAmount)}</dd></div>
                  )}
                  <div><dt>원금 상환</dt><dd>{won(item.principalAmount)}</dd></div>
                </dl>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

interface CardProps {
  contractId: number;
  deposit: EarlyRepaymentDeposit;
  onDone: () => void;
  onDismiss: () => void;
}

function DepositCard({ contractId, deposit, onDone, onDismiss }: CardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const principal = deposit.amount - deposit.shortfallAmount - deposit.accruedInterest;
  const isValid = principal > 0 && principal <= deposit.balance;
  const remaining = deposit.balance - principal;
  const payoff = deposit.shortfallAmount + deposit.accruedInterest + deposit.balance;

  async function handleProcess() {
    if (!window.confirm(`${won(deposit.amount)}을 중도상환으로 처리할까요? 처리하면 되돌릴 수 없어요.`)) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await processEarlyRepayment(contractId, deposit.bankTransactionId);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했습니다.");
      setIsSaving(false);
    }
  }

  return (
    <div className={`early-repayment__card${isValid ? "" : " is-invalid"}`}>
      <div className="early-repayment__card-head">
        <div>
          <span className="early-repayment__date">
            {deposit.transactionAt.slice(0, 10)} · {deposit.counterpartyName ?? "입금"}
          </span>
          <strong>{won(deposit.amount)}</strong>
        </div>
        <button
          type="button"
          className={`button ${isValid ? "button-primary" : "button-secondary"}`}
          disabled={isSaving}
          onClick={isValid ? () => void handleProcess() : onDismiss}
        >
          {isValid ? (isSaving ? "처리 중…" : "중도상환으로 처리") : "확인"}
        </button>
      </div>

      {isValid ? (
        <p className="early-repayment__result">
          {remaining === 0
            ? "처리하면 전액 상환으로 끝나요."
            : `처리 후 남은 원금 ${won(remaining)} · 다음 회차부터 금액이 줄어요.`}
        </p>
      ) : (
        <p className="early-repayment__error">
          {principal <= 0
            ? "입금액이 부족 회차와 경과 이자보다 적어 처리할 수 없어요."
            : `전액 상환 금액보다 ${won(deposit.amount - payoff)} 더 들어왔어요.`}{" "}
          이체는 이미 끝났으니 돌려줄 금액은 은행에서 직접 이체해 주세요.
        </p>
      )}

      {error && <p className="early-repayment__error">{error}</p>}

      <details className="early-repayment__more">
        <summary>금액 자세히</summary>
        <dl className="early-repayment__rows">
          {deposit.shortfallAmount > 0 && (
            <div><dt>부족 회차</dt><dd>{won(deposit.shortfallAmount)}</dd></div>
          )}
          <div><dt>경과 이자</dt><dd>{won(deposit.accruedInterest)}</dd></div>
          <div><dt>원금 상환</dt><dd>{won(Math.max(principal, 0))}</dd></div>
          <div><dt>전액 상환에 필요한 금액</dt><dd>{won(payoff)}</dd></div>
        </dl>
      </details>
    </div>
  );
}