import { useEffect, useState } from "react";
import { getEarlyRepaymentDeposits, processEarlyRepayment } from "../api/scheduleApi";
import type { EarlyRepaymentDeposit, EarlyRepaymentHistory } from "../types/schedule";

function won(amount: number): string {
  return `${amount.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}원`;
}

interface PanelProps {
  contractId: number;
  reloadKey: number;
  history: EarlyRepaymentHistory[];
  onDone: () => void;
}

export default function EarlyRepaymentPanel({ contractId, reloadKey, history, onDone }: PanelProps) {
  const [deposits, setDeposits] = useState<EarlyRepaymentDeposit[]>([]);

  useEffect(() => {
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
  }, [contractId, reloadKey]);

  if (deposits.length === 0 && history.length === 0) {
    return null;
  }

  return (
    <div className="early-repayment">
      {deposits.length > 0 && <strong>확인이 필요한 입금 {deposits.length}건</strong>}

      {deposits.map((deposit) => (
        <DepositCard
          key={deposit.bankTransactionId}
          contractId={contractId}
          deposit={deposit}
          onDone={onDone}
        />
      ))}

      {history.length > 0 && (
        <ul className="early-repayment__history">
          {history.map((item) => (
            <li key={item.earlyRepaymentId}>
              {item.processedAt.slice(0, 10)} 중도상환 {won(item.amount)} · 부족분 {won(item.shortfallAmount)} ·
              경과 이자 {won(item.accruedInterest)} · 수수료 {won(item.feeAmount)} · 원금 {won(item.principalAmount)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface CardProps {
  contractId: number;
  deposit: EarlyRepaymentDeposit;
  onDone: () => void;
}

function DepositCard({ contractId, deposit, onDone }: CardProps) {
  const [fee, setFee] = useState("0");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const feeAmount = Number(fee) || 0;
  const principal = deposit.amount - deposit.shortfallAmount - deposit.accruedInterest - feeAmount;
  const isValid = principal > 0 && principal <= deposit.balance;
  const remaining = deposit.balance - principal;

  async function handleProcess() {
    if (!window.confirm(`${won(deposit.amount)}을 중도상환으로 처리할까요? 처리하면 되돌릴 수 없어요.`)) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await processEarlyRepayment(contractId, deposit.bankTransactionId, feeAmount);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했습니다.");
      setIsSaving(false);
    }
  }

  return (
    <div className="early-repayment__card">
      <p>
        <b>{deposit.transactionAt.slice(0, 10)} · {deposit.counterpartyName ?? "입금"} · {won(deposit.amount)}</b>
      </p>
      <p>
        {deposit.shortfallAmount > 0 && `부족 회차 ${won(deposit.shortfallAmount)} · `}
        경과 이자 {won(deposit.accruedInterest)} · 원금 {won(Math.max(principal, 0))}
      </p>

      {isValid ? (
        <p>
          {remaining === 0
            ? "처리하면 전액 상환으로 끝나요."
            : `처리 후 남은 원금 ${won(remaining)} · 다음 회차부터 금액이 줄어요.`}
        </p>
      ) : (
        <p className="early-repayment__error">입금액이 부족하거나 남은 원금보다 많아 처리할 수 없어요.</p>
      )}

      <label>
        수수료
        <input type="number" min="0" step="1" value={fee} onChange={(e) => setFee(e.target.value)} />
      </label>

      {error && <p className="early-repayment__error">{error}</p>}

      <button type="button" disabled={!isValid || isSaving} onClick={() => void handleProcess()}>
        {isSaving ? "처리 중…" : "중도상환으로 처리"}
      </button>
    </div>
  );
}