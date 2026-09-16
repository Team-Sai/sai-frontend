import { useCallback, useEffect, useState } from 'react';
import { Button } from '../../common/components';

interface AccountLinkModalProps {
    isOpen: boolean;
    isConnecting?: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export default function AccountLinkModal({
                                             isOpen,
                                             isConnecting = false,
                                             onClose,
                                             onConfirm,
                                         }: AccountLinkModalProps) {
    const [agreed, setAgreed] = useState(false);

    const handleClose = useCallback(() => {
        if (isConnecting) {
            return;
        }

        setAgreed(false);
        onClose();
    }, [isConnecting, onClose]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                handleClose();
            }
        }

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleClose]);

    if (!isOpen) {
        return null;
    }

    function handleConfirm() {
        if (!agreed || isConnecting) {
            return;
        }

        onConfirm();
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    handleClose();
                }
            }}
        >
            <div
                className="relative w-full max-w-[460px] rounded-2xl bg-surface p-7 shadow-xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="account-link-modal-title"
            >
                <Button
                    variant="text"
                    className="absolute right-5 top-5 h-8 w-8 rounded-none border-0 p-0 text-muted transition hover:text-text disabled:opacity-50 active:transform-none"
                    aria-label="닫기"
                    disabled={isConnecting}
                    onClick={handleClose}
                >
                    <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="h-5 w-5 fill-none stroke-current stroke-2"
                    >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </Button>

                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="h-6 w-6 fill-none stroke-current stroke-[1.8]"
                    >
                        <path d="m3 10 9-6 9 6" />
                        <path d="M5 10v8" />
                        <path d="M9 10v8" />
                        <path d="M15 10v8" />
                        <path d="M19 10v8" />
                        <path d="M3 18h18" />
                        <path d="M2 21h20" />
                    </svg>
                </div>

                <h2
                    id="account-link-modal-title"
                    className="text-xl font-bold text-text"
                >
                    계좌를 연결할까요?
                </h2>

                <p className="mt-3 text-sm leading-6 text-muted">
                    가상 금융망 서비스를 통해 본인 계좌를 확인하고,
                    선택한 계좌의 정보를 사이원장에 연결합니다.
                </p>

                <section className="mt-6">
                    <h3 className="text-sm font-bold text-text">
                        조회 항목
                    </h3>

                    <ul className="mt-3 space-y-3 text-sm text-text">
                        <li className="flex items-center gap-3">
                            <InfoIcon />
                            계좌 기본정보
                        </li>

                        <li className="flex items-center gap-3">
                            <CardIcon />
                            현재 잔액
                        </li>

                        <li className="flex items-center gap-3">
                            <TransferIcon />
                            입출금 거래내역
                        </li>
                    </ul>
                </section>

                <section className="mt-6">
                    <h3 className="text-sm font-bold text-text">
                        이용 확인
                    </h3>

                    <ul className="mt-3 space-y-3 text-sm text-text">
                        <li className="flex items-center gap-3">
                            <CheckIcon />
                            정산 입금 확인
                        </li>

                        <li className="flex items-center gap-3">
                            <CheckIcon />
                            차용금 지급 확인
                        </li>

                        <li className="flex items-center gap-3">
                            <CheckIcon />
                            원금 및 이자 상환 확인
                        </li>
                    </ul>
                </section>

                <label className="mt-7 flex cursor-pointer items-center gap-3">
                    <input
                        type="checkbox"
                        checked={agreed}
                        disabled={isConnecting}
                        onChange={(event) => {
                            setAgreed(event.target.checked);
                        }}
                        className="h-4 w-4 accent-primary"
                    />

                    <span className="text-sm text-text">
            계좌정보 조회 및 이용에 동의합니다.
          </span>
                </label>

                <div className="mt-7 flex gap-3">
                    <Button
                        variant="secondary"
                        disabled={isConnecting}
                        onClick={handleClose}
                        className="h-11 flex-1 rounded-lg border border-outline bg-surface p-0 text-sm text-text transition hover:border-outline hover:bg-surface-low hover:text-text disabled:opacity-50 active:transform-none"
                    >
                        취소
                    </Button>

                    <Button
                        disabled={!agreed || isConnecting}
                        isLoading={isConnecting}
                        onClick={handleConfirm}
                        className="h-11 flex-1 rounded-lg border-0 p-0 text-sm transition hover:opacity-90 disabled:opacity-40 active:transform-none"
                    >
                        {isConnecting
                            ? '연동 중...'
                            : '동의하고 계속하기'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function InfoIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-5 w-5 shrink-0 fill-none stroke-primary stroke-[1.8]"
        >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5" />
            <path d="M12 8h.01" />
        </svg>
    );
}

function CardIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-5 w-5 shrink-0 fill-none stroke-primary stroke-[1.8]"
        >
            <rect
                x="2"
                y="5"
                width="20"
                height="14"
                rx="2"
            />
            <path d="M2 10h20" />
        </svg>
    );
}

function TransferIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-5 w-5 shrink-0 fill-none stroke-primary stroke-[1.8]"
        >
            <path d="m17 2 4 4-4 4" />
            <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
            <path d="m7 22-4-4 4-4" />
            <path d="M21 13v1a4 4 0 0 1-4 4H3" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-5 w-5 shrink-0 fill-none stroke-primary stroke-[1.8]"
        >
            <circle cx="12" cy="12" r="9" />
            <path d="m8 12 3 3 5-6" />
        </svg>
    );
}
