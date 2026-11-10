import { useEffect, useState } from "react";
import {
  getEarlyRepaymentDeposits,
  markDepositReturned,
  processEarlyRepayment,
} from "../api/scheduleApi";
import type {
  EarlyRepaymentDeposit,
  EarlyRepaymentHistory,
  ReturnedDeposit,
} from "../types/schedule";

function won(amount: number): string {
  return `${amount.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}원`;
}

// 중도상환과 반환을 날짜순으로 한 목록에 보여 주기 위한 줄
type HistoryItem =
  | { kind: "early"; at: string; early: EarlyRepaymentHistory }
  | { kind: "returned"; at: string; returned: ReturnedDeposit };

interface PanelProps {
  contractId: number;
  isCreditor: boolean;
  reloadKey: number;
  history: EarlyRepaymentHistory[];
  returned: ReturnedDeposit[];
  onDone: () => void;
}

export default function EarlyRepaymentPanel({
  contractId,
  isCreditor,
  reloadKey,
  history,
  returned,
  onDone,
}: PanelProps) {
  const [deposits, setDeposits] = useState<EarlyRepaymentDeposit[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEarlyRepaymentDeposits(contractId)
      .then((rows) => {
        if (cancelled) return;
        setDeposits(rows);
        setLoadError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setDeposits([]);
        setLoadError(e instanceof Error ? e.message : "입금 내역을 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [contractId, isCreditor, reloadKey]);

  const items: HistoryItem[] = [
    ...history.map((early) => ({ kind: "early" as const, at: early.processedAt, early })),
    ...returned.map((item) => ({ kind: "returned" as const, at: item.returnedAt, returned: item })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  if (deposits.length === 0 && items.length === 0 && !loadError) {
    return null;
  }

  return (
    <div className="early-repayment">
      {loadError && <p className="early-repayment__error">{loadError}</p>}
      {deposits.length > 0 && (
        <p className="early-repayment__title">
          {isCreditor ? "확인이 필요한 입금" : "채권자 확인을 기다리는 입금"} {deposits.length}건
        </p>
      )}

      {deposits.map((deposit) => (
        <DepositCard
          key={deposit.bankTransactionId}
          contractId={contractId}
          isCreditor={isCreditor}
          deposit={deposit}
          onDone={onDone}
        />
      ))}

      {items.length > 0 && (
        <details className="early-repayment__fold">
          <summary>
            <span>입금 처리 내역 {items.length}건</span>
          </summary>

          <div className="early-repayment__fold-body">
            {items.map((item) =>
              item.kind === "early" ? (
                <div className="early-repayment__history" key={`early-${item.early.earlyRepaymentId}`}>
                  <div className="early-repayment__history-head">
                    <span className="early-repayment__badge">
                      {item.early.principalAmount > 0 ? "중도상환" : "밀린 회차 납부"}
                    </span>
                    <span className="early-repayment__date">{item.at.slice(0, 10)}</span>
                    <strong>{won(item.early.amount)}</strong>
                  </div>
                  <dl className="early-repayment__rows">
                    {item.early.shortfallAmount > 0 && (
                      <div><dt>밀린 회차</dt><dd>{won(item.early.shortfallAmount)}</dd></div>
                    )}
                    {item.early.principalAmount > 0 && (
                      <div><dt>이자</dt><dd>{won(item.early.accruedInterest)}</dd></div>
                    )}
                    {item.early.principalAmount > 0 && (
                      <div><dt>원금 상환</dt><dd>{won(item.early.principalAmount)}</dd></div>
                    )}
                  </dl>
                </div>
              ) : (
                <div className="early-repayment__history" key={`returned-${item.returned.bankTransactionId}`}>
                  <div className="early-repayment__history-head">
                    <span className="early-repayment__badge is-returned">반환됨</span>
                    <span className="early-repayment__date">
                      {item.returned.transactionAt.slice(0, 10)} 입금분
                    </span>
                    <strong>{won(item.returned.amount)}</strong>
                  </div>
                </div>
              ),
            )}
          </div>
        </details>
      )}
    </div>
  );
}

interface CardProps {
  contractId: number;
  isCreditor: boolean;
  deposit: EarlyRepaymentDeposit;
  onDone: () => void;
}

type CardMode = "arrears" | "arrearsLeftover" | "early" | "over" | "returnOnly";

function DepositCard({ contractId, isCreditor, deposit, onDone }: CardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const arrears = deposit.shortfallAmount;
  const interest = deposit.accruedInterest;
  const balance = deposit.balance;
  const amount = deposit.amount;
  const principal = amount - arrears - interest;
  const payoff = arrears + interest + balance;

  // 들어온 돈의 크기로 처리 방식을 정한다. (백엔드와 같은 규칙)
  const mode: CardMode =
    arrears > 0 && (balance === 0 || amount <= arrears + interest)
      ? amount <= arrears
        ? "arrears"
        : "arrearsLeftover"
      : principal <= 0
        ? "returnOnly"
        : principal <= balance
          ? "early"
          : "over";

  const leftover = mode === "arrearsLeftover" ? amount - arrears : mode === "over" ? amount - payoff : 0;
  const isOk = mode === "arrears" || mode === "early";

  async function run(action: () => Promise<void>, message: string) {
    if (!window.confirm(message)) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await action();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했습니다.");
      setIsSaving(false);
    }
  }

  const apply = () =>
    run(
      () => processEarlyRepayment(contractId, deposit.bankTransactionId, leftover > 0),
      leftover > 0
        ? `${won(amount - leftover)}을 반영하고, 은행에서 ${won(leftover)}을 돌려보냈다고 기록할까요?`
        : `${won(amount)}을 반영할까요? 처리하면 되돌릴 수 없어요.`,
    );

  const returnAll = () =>
    run(
      () => markDepositReturned(contractId, deposit.bankTransactionId),
      `은행에서 ${won(amount)} 전부를 돌려보냈나요? 반환 완료로 표시해요.`,
    );

  const applyLabel: Record<CardMode, string> = {
    arrears: "밀린 회차에 반영",
    arrearsLeftover: "밀린 회차 납부 + 차액 반환",
    early: "중도상환으로 처리",
    over: "완납 처리 + 차액 반환",
    returnOnly: "",
  };

  const message: Record<CardMode, string> = {
    arrears: "밀린 회차를 앞에서부터 채워요.",
    arrearsLeftover: `밀린 회차를 다 채우고 ${won(leftover)}이 남아요. 원금을 갚기엔 모자라 돌려줘야 해요.`,
    early:
      principal === balance
        ? "처리하면 전액 상환으로 끝나요."
        : `처리 후 남은 원금 ${won(balance - principal)} · 다음 회차부터 금액이 줄어요.`,
    over: `완납 금액보다 ${won(leftover)} 더 들어왔어요. 완납 처리하고 차액만 돌려주거나, 전부 돌려줄 수 있어요.`,
    returnOnly: "이자보다 적게 들어와 반영할 곳이 없어요. 은행에서 돌려보낸 뒤 [반환했어요]를 눌러 주세요.",
  };

  return (
    <div className={`early-repayment__card${isOk ? "" : " is-invalid"}`}>
      <div className="early-repayment__card-head">
        <div>
          <span className="early-repayment__date">
            {deposit.transactionAt.slice(0, 10)} · {deposit.counterpartyName ?? "입금"}
          </span>
          <strong>{won(amount)}</strong>
        </div>

        {isCreditor && (
          <div className="early-repayment__actions">
            {mode !== "returnOnly" && (
              <button type="button" className="button button-primary" disabled={isSaving} onClick={() => void apply()}>
                {isSaving ? "처리 중…" : applyLabel[mode]}
              </button>
            )}
            {(
              <button type="button" className="button button-secondary" disabled={isSaving} onClick={() => void returnAll()}>
                {mode === "returnOnly" ? "반환했어요" : "전액 반환"}
              </button>
            )}
          </div>
        )}
      </div>

      {!deposit.memoConfirmed && (
        <p className="early-repayment__warn">
          메모에 차용증 번호가 없어 다른 차용증에도 보일 수 있어요.
        </p>
      )}

      <p className={isOk ? "early-repayment__result" : "early-repayment__error"}>
        {isCreditor ? message[mode] : "채권자 확인을 기다리고 있어요."}
      </p>

      {error && <p className="early-repayment__error">{error}</p>}

      <dl className="early-repayment__rows">
        {arrears > 0 && <div><dt>밀린 회차</dt><dd>{won(arrears)}</dd></div>}
        {balance > 0 && <div><dt>남은 원금</dt><dd>{won(balance)}</dd></div>}
        {balance > 0 && <div><dt>입금일까지 이자</dt><dd>{won(interest)}</dd></div>}
        {balance > 0 && <div><dt>완납에 필요한 금액</dt><dd>{won(payoff)}</dd></div>}
        {leftover > 0 && (
          <div className="is-refund"><dt>차액 (돌려줄 금액)</dt><dd>{won(leftover)}</dd></div>
        )}
      </dl>
    </div>
  );
}