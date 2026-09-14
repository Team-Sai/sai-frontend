import './RiskModal.css';

const STANDARD_INTEREST_RATE = 4.6;
const GIFT_TAX_THRESHOLD = 10_000_000;

function computeSafeInterestRate(totalAmount: number): number {
  if (totalAmount <= 0) return 0.5;

  const minRate = STANDARD_INTEREST_RATE - (GIFT_TAX_THRESHOLD * 100) / totalAmount;
  const roundedUp = Math.ceil(minRate * 2 - 1e-9) / 2;

  return Math.min(20, Math.max(0.5, roundedUp));
}

function formatWon(amount: number): string {
  return `${Math.round(amount).toLocaleString('ko-KR')}원`;
}

interface RiskModalProps {
  previousAmount: number;
  currentAmount: number;
  interestRate: number;
  onClose: () => void;
  onApplySafeRate: (rate: number) => void;
  onProceed: () => void;
}

export default function RiskModal({
  previousAmount,
  currentAmount,
  interestRate,
  onClose,
  onApplySafeRate,
  onProceed,
}: RiskModalProps) {
  const totalAmount = previousAmount + currentAmount;
  const standardInterest = totalAmount * (STANDARD_INTEREST_RATE / 100);
  const actualInterest = totalAmount * (interestRate / 100);
  const savedInterestRaw = standardInterest - actualInterest;
  const savedInterest = Math.max(0, Math.round(savedInterestRaw));
  const isSafe = savedInterestRaw < GIFT_TAX_THRESHOLD;
  const safeRate = computeSafeInterestRate(totalAmount);

  function handleActionClick() {
    if (isSafe) {
      onProceed();
      return;
    }
    onApplySafeRate(safeRate);
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="notice">
        <header className="notice__header">
          <span className="notice__eyebrow">안심거래진단</span>
          <button type="button" className="notice__close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>

        <div className="notice__body">
          <div className="notice__intro">
            <h2 className="notice__question">가족 간 거래 세금 안심 가이드</h2>
            <p className="notice__desc">
              국세청에서 제시하는 표준 이자율은 연 4.6%입니다.
              <br />
              국세청 기준 이자보다 설정한 이자가 1,000만 원 미만이면 세금이 안 나와요.
            </p>
          </div>

          <div className="summary-box">
            <p className="summary-title">상환/누적 현황</p>
            <p>
              <span>이전 차용금</span>
              <span>{formatWon(previousAmount)}</span>
            </p>
            <p>
              <span>이번 차용금</span>
              <span>{formatWon(currentAmount)}</span>
            </p>
            <p className="summary-total">
              <span>총 누적 금액</span>
              <span>{formatWon(totalAmount)}</span>
            </p>
          </div>

          <div className="result-area">
            {isSafe ? (
              <>
                <p className="result-badge result-badge--safe">세금 안전 범위</p>
                <p className="result-safe-line">안전 이자선: 연 {safeRate}% 이상</p>
                <p className="result-desc">
                  연간 이자로 아낀 금액이 <strong>{formatWon(savedInterest)}</strong>으로 1,000만 원 미만이라
                  채무자(돈을 빌리는 분)에게 증여세가 발생하지 않아요!
                </p>
              </>
            ) : (
              <>
                <p className="result-badge result-badge--danger">증여세 과세 위험</p>
                <p className="result-safe-line">증여세를 피하려면 연 {safeRate}% 이상으로 설정해야 해요.</p>
                <p className="result-desc">
                  연간 이자로 아낀 금액이 <strong>{formatWon(savedInterest)}</strong>으로 1,000만 원을 초과하여
                  채무자(돈을 빌리는 분)가 증여세 대상이 될 수 있어요!
                </p>
              </>
            )}
          </div>
        </div>

        <footer className="notice__footer">
          <button type="button" className="btn btn--primary btn--block" onClick={handleActionClick}>
            {isSafe ? '이대로 작성 완료하기' : `안전 이자율(${safeRate}%) 적용하기`}
          </button>
        </footer>
      </div>
    </div>
  );
}
