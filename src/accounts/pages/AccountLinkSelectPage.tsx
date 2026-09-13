import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../../auth/authFetch';

interface Account {
    accountId: string;
    bankCode?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    accountHolderName?: string;
    balance?: number | string | null;
    connectable?: boolean;
}

interface AvailableAccountsResponse {
    data?: Account[];
}

function maskAccountNumber(raw?: string) {
    if (!raw) {
        return '';
    }

    const digits = String(raw).replace(/\D/g, '');

    if (digits.length < 4) {
        return raw;
    }

    const visibleTail = digits.slice(-4);

    return `${digits.slice(0, 3)}-***-${visibleTail}`;
}

function formatBalance(balance?: number | string | null) {
    if (balance == null) {
        return '0';
    }

    const number = Number(balance);

    if (Number.isNaN(number)) {
        return '0';
    }

    return number.toLocaleString('ko-KR');
}

function getAccounts(data: unknown): Account[] {
    if (Array.isArray(data)) {
        return data;
    }

    if (
        typeof data === 'object' &&
        data !== null &&
        'data' in data &&
        Array.isArray((data as AvailableAccountsResponse).data)
    ) {
        return (data as AvailableAccountsResponse).data ?? [];
    }

    return [];
}

export default function AccountLinkSelectPage() {
    const navigate = useNavigate();

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(
        new Set(),
    );
    const [isAgreed, setIsAgreed] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [isLinking, setIsLinking] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadAccounts = async () => {
            try {
                setIsLoading(true);
                setError('');

                const response = await authFetch(
                    '/api/mock-bank/accounts/available',
                    {
                        method: 'GET',
                        headers: {
                            Accept: 'application/json',
                        },
                    },
                );

                if (!response.ok) {
                    throw new Error('계좌 목록을 불러오지 못했습니다.');
                }

                const data = await response.json();
                const availableAccounts = getAccounts(data);

                setAccounts(availableAccounts);

                if (availableAccounts.length === 0) {
                    setError('연결 가능한 계좌가 없습니다.');
                }
            } catch (loadError) {
                console.error(loadError);

                setError(
                    loadError instanceof Error
                        ? loadError.message
                        : '계좌 목록을 불러오지 못했습니다.',
                );
            } finally {
                setIsLoading(false);
            }
        };

        loadAccounts();
    }, []);

    const toggleSelect = (accountId: string) => {
        setSelectedIds((previous) => {
            const next = new Set(previous);

            if (next.has(accountId)) {
                next.delete(accountId);
            } else {
                next.add(accountId);
            }

            return next;
        });
    };

    const handleCancel = () => {
        navigate('/mypage');
    };

    const handleConfirm = async () => {
        if (selectedIds.size === 0 || !isAgreed || isLinking) {
            return;
        }

        const selectedAccounts = accounts
            .filter((account) => selectedIds.has(account.accountId))
            .map((account) => ({
                accountId: account.accountId,
                bankCode: account.bankCode ?? '',
                accountNumber: account.accountNumber,
                accountName: account.accountName,
                accountHolderName: account.accountHolderName,
                accountAlias: account.accountName,
                balance: account.balance,
            }));

        setIsLinking(true);

        try {
            const response = await authFetch('/api/linked-accounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    selectedAccounts,
                }),
            });

            if (!response.ok) {
                throw new Error('계좌 연결에 실패했습니다.');
            }

            navigate('/mypage');
        } catch (linkError) {
            console.error(linkError);

            const message =
                linkError instanceof Error
                    ? linkError.message
                    : '계좌 연결 중 오류가 발생했습니다.';

            window.alert(message);
            setIsLinking(false);
        }
    };

    const canConfirm = selectedIds.size > 0 && isAgreed && !isLinking;

    return (
        <main className="min-h-[calc(100vh-128px)] bg-[#f6f5fb]">
            <div className="mx-auto w-full max-w-[700px] px-5 py-12 sm:px-0 sm:pb-16">
                {/* 요청 안내 */}
                <div className="mb-4 inline-flex items-center rounded-full bg-[#f0ecfc] px-3 py-1.5 text-[12px] font-bold text-[#7c5cd6]">
                    사이원장에서 계좌 연결을 요청했습니다
                </div>

                {/* 제목 */}
                <h1 className="text-[26px] font-bold leading-[1.35] text-[#191b23]">
                    연결할 계좌를 선택해주세요
                </h1>

                <p className="mt-2 text-[13px] leading-[1.6] text-[#6b7280]">
                    본인 확인이 완료된 계좌만 표시됩니다.
                </p>

                {/* 오류 */}
                {error && (
                    <div
                        role="alert"
                        className="mt-5 rounded-xl border border-[#e3e1ef] bg-white px-4 py-3 text-[13px] text-[#ba1a1a]"
                    >
                        {error}
                    </div>
                )}

                {/* 계좌 목록 */}
                <section className="mt-7">
                    {isLoading ? (
                        <div className="rounded-xl border border-[#e3e1ef] bg-white px-5 py-8 text-center text-[13px] text-[#6b7280]">
                            계좌 목록을 불러오는 중입니다...
                        </div>
                    ) : accounts.length > 0 ? (
                        <div className="space-y-3">
                            {accounts.map((account) => {
                                const connectable = account.connectable !== false;
                                const isSelected = selectedIds.has(account.accountId);

                                return (
                                    <button
                                        key={account.accountId}
                                        type="button"
                                        disabled={!connectable || isLinking}
                                        onClick={() => {
                                            if (connectable) {
                                                toggleSelect(account.accountId);
                                            }
                                        }}
                                        className={`flex w-full items-center justify-between rounded-xl border p-5 text-left transition ${
                                            connectable
                                                ? isSelected
                                                    ? 'border-[#7c5cd6] bg-[#f0ecfc]'
                                                    : 'border-[#e3e1ef] bg-white hover:border-[#7c5cd6]/50'
                                                : 'cursor-not-allowed border-[#e3e1ef] bg-[#f3f4f6]'
                                        }`}
                                    >
                                        {/* 왼쪽 */}
                                        <div className="flex min-w-0 items-center gap-4">
                                            <div
                                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                                                    connectable
                                                        ? 'bg-[#f0ecfc] text-[#7c5cd6]'
                                                        : 'bg-white text-[#a3a7b3]'
                                                }`}
                                            >
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    aria-hidden="true"
                                                    className="h-6 w-6 fill-none stroke-current stroke-[1.7]"
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

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                          <span
                              className={`text-[14px] font-bold ${
                                  connectable
                                      ? 'text-[#191b23]'
                                      : 'text-[#a3a7b3]'
                              }`}
                          >
                            {account.bankName ?? '테스트은행'}
                          </span>

                                                    {!connectable && (
                                                        <span className="rounded-full bg-[#e5e7eb] px-2 py-0.5 text-[10px] font-bold text-[#a3a7b3]">
                              비활성
                            </span>
                                                    )}
                                                </div>

                                                <div
                                                    className={`mt-1 text-[13px] font-medium ${
                                                        connectable
                                                            ? 'text-[#191b23]'
                                                            : 'text-[#a3a7b3]'
                                                    }`}
                                                >
                                                    {connectable
                                                        ? account.accountName ?? ''
                                                        : '연결 불가 (사용 중지 계좌)'}
                                                </div>

                                                <div
                                                    className={`mt-1 text-[12px] ${
                                                        connectable
                                                            ? 'text-[#6b7280]'
                                                            : 'text-[#a3a7b3]'
                                                    }`}
                                                >
                                                    {maskAccountNumber(account.accountNumber)}
                                                    {' · '}
                                                    예금주: {account.accountHolderName ?? ''}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 오른쪽 */}
                                        <div className="ml-4 flex shrink-0 flex-col items-end">
                      <span className="text-[11px] text-[#6b7280]">
                        잔액
                      </span>

                                            <span
                                                className={`mt-0.5 text-[15px] font-bold ${
                                                    connectable
                                                        ? 'text-[#191b23]'
                                                        : 'text-[#a3a7b3]'
                                                }`}
                                            >
                        {connectable
                            ? formatBalance(account.balance)
                            : '0'}
                      </span>

                                            <span
                                                className={`mt-2 flex h-6 w-6 items-center justify-center rounded-full border ${
                                                    isSelected
                                                        ? 'border-[#7c5cd6] bg-[#7c5cd6] text-white'
                                                        : 'border-[#cfcde0] bg-white text-transparent'
                                                }`}
                                            >
                        <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            className="h-4 w-4 fill-none stroke-current stroke-[2.5]"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : null}
                </section>

                {/* 조회 권한 */}
                <section className="mt-7 rounded-xl border border-[#e3e1ef] bg-white p-5">
                    <h2 className="text-[14px] font-bold text-[#191b23]">
                        계좌 연결 시 조회되는 정보
                    </h2>

                    <div className="mt-4 space-y-4">
                        <div>
                            <p className="text-[13px] font-bold text-[#191b23]">
                                계좌 기본정보 조회
                            </p>
                            <p className="mt-1 text-[12px] leading-[1.6] text-[#6b7280]">
                                은행명, 계좌번호, 예금주 성명 등
                            </p>
                        </div>

                        <div className="border-t border-[#e3e1ef] pt-4">
                            <p className="text-[13px] font-bold text-[#191b23]">
                                현재 잔액 조회
                            </p>
                            <p className="mt-1 text-[12px] leading-[1.6] text-[#6b7280]">
                                실시간 출금 가능 잔액 정보
                            </p>
                        </div>

                        <div className="border-t border-[#e3e1ef] pt-4">
                            <p className="text-[13px] font-bold text-[#191b23]">
                                입출금 거래내역 조회
                            </p>
                            <p className="mt-1 text-[12px] leading-[1.6] text-[#6b7280]">
                                최근 1년간의 거래 일시 및 금액
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 border-t border-[#e3e1ef] pt-4">
                        <p className="text-[12px] font-bold text-[#191b23]">
                            이용 목적
                        </p>

                        <div className="mt-2.5 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#f0ecfc] px-3 py-1.5 text-[11px] font-medium text-[#7c5cd6]">
                정산 입금 확인
              </span>

                            <span className="rounded-full bg-[#f0ecfc] px-3 py-1.5 text-[11px] font-medium text-[#7c5cd6]">
                차용금 지급 및 상환 확인
              </span>
                        </div>
                    </div>
                </section>

                {/* 동의 */}
                <label className="mt-5 flex cursor-pointer items-start gap-3">
                    <input
                        type="checkbox"
                        checked={isAgreed}
                        onChange={(event) => setIsAgreed(event.target.checked)}
                        disabled={isLinking}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#7c5cd6]"
                    />

                    <span className="text-[13px] font-medium leading-[1.6] text-[#191b23]">
            계좌 조회 및 연결에 동의합니다.
          </span>
                </label>

                {/* 버튼 */}
                <div className="mt-6 flex gap-3">
                    <button
                        type="button"
                        onClick={handleCancel}
                        disabled={isLinking}
                        className="h-12 flex-1 rounded-lg border border-[#e3e1ef] bg-white text-[13px] font-bold text-[#191b23] transition hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        취소
                    </button>

                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                        className="h-12 flex-1 rounded-lg bg-[#7c5cd6] text-[13px] font-bold text-white transition hover:bg-[#6b4bc4] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {isLinking ? '연결 중...' : '계좌 연결'}
                    </button>
                </div>
            </div>
        </main>
    );
}