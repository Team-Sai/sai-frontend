import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../../auth/authFetch';

export default function AccountsPage() {
  const navigate = useNavigate();

  const [isAgreed, setIsAgreed] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        navigate('/mypage');
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);

  const handleClose = () => {
    navigate('/mypage');
  };

  const handleOpenAgreementDetail = () => {
    window.open('/terms/account-link', '_blank');
  };

  const handleConfirm = async () => {
    if (!isAgreed || isLinking) {
      return;
    }

    setIsLinking(true);

    try {
      const response = await authFetch('/api/mock-bank/link', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('계좌 연동 준비에 실패했습니다.');
      }

      navigate('/accounts/link/select');
    } catch (error) {
      console.error(error);

      const message =
          error instanceof Error
              ? error.message
              : '계좌 연동 준비 중 오류가 발생했습니다.';

      window.alert(message);
      setIsLinking(false);
    }
  };

  return (
      <main className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-5">
        <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-link-title"
            className="max-h-[calc(100vh-40px)] w-full max-w-[420px] overflow-y-auto rounded-[14px] bg-surface px-[26px] pb-[22px] pt-7 shadow-2xl"
        >
          {/* 닫기 */}
          <div className="flex justify-end">
            <button
                type="button"
                onClick={handleClose}
                aria-label="닫기"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[28px] leading-none text-muted transition hover:bg-surface-low hover:text-text"
            >
              ×
            </button>
          </div>

          {/* 제목 */}
          <div className="mt-1">
            <h1
                id="account-link-title"
                className="text-[22px] font-bold leading-[1.4] text-text"
            >
              계좌를 연결할까요?
            </h1>

            <p className="mt-3 text-[13px] leading-[1.7] text-muted">
              가상 금융망 서비스를 통해 본인 계좌를 확인하고, 선택한 계좌의
              정보를 사이원장에 연결합니다.
            </p>
          </div>

          {/* 조회 항목 */}
          <section className="mt-6">
            <h2 className="text-[14px] font-bold text-text">조회 항목</h2>

            <ul className="mt-3 space-y-2.5">
              <li className="flex items-center gap-2.5 text-[13px] text-muted">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                ✓
              </span>
                계좌 기본정보
              </li>

              <li className="flex items-center gap-2.5 text-[13px] text-muted">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                ✓
              </span>
                현재 잔액
              </li>

              <li className="flex items-center gap-2.5 text-[13px] text-muted">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                ✓
              </span>
                입출금 거래내역
              </li>
            </ul>
          </section>

          {/* 이용 확인 */}
          <section className="mt-6">
            <h2 className="text-[14px] font-bold text-text">이용 확인</h2>

            <ul className="mt-3 space-y-2.5">
              <li className="flex items-center gap-2.5 text-[13px] text-muted">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                ✓
              </span>
                정산 입금 확인
              </li>

              <li className="flex items-center gap-2.5 text-[13px] text-muted">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                ✓
              </span>
                차용금 지급 확인
              </li>

              <li className="flex items-center gap-2.5 text-[13px] text-muted">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                ✓
              </span>
                원금 및 이자 상환 확인
              </li>
            </ul>
          </section>

          {/* 동의 */}
          <div className="mt-7 rounded-xl bg-surface-low p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                  type="checkbox"
                  checked={isAgreed}
                  onChange={(event) => setIsAgreed(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />

              <span className="text-[13px] font-medium leading-[1.6] text-text">
              계좌 조회 및 연결에 동의합니다.
            </span>
            </label>

            <button
                type="button"
                onClick={handleOpenAgreementDetail}
                className="ml-7 mt-2 text-[12px] text-muted underline underline-offset-2 transition hover:text-text"
            >
              동의 내용 자세히 보기
            </button>
          </div>

          {/* 버튼 */}
          <div className="mt-6 flex gap-2.5">
            <button
                type="button"
                onClick={handleClose}
                disabled={isLinking}
                className="h-11 flex-1 rounded-lg border border-outline bg-surface text-[13px] font-bold text-text transition hover:bg-surface-low disabled:cursor-not-allowed disabled:opacity-50"
            >
              취소
            </button>

            <button
                type="button"
                onClick={handleConfirm}
                disabled={!isAgreed || isLinking}
                className="h-11 flex-1 rounded-lg bg-primary text-[13px] font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLinking ? '연동 중...' : '확인'}
            </button>
          </div>
        </section>
      </main>
  );
}