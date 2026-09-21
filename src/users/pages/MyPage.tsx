import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch, clearStoredAuth } from '../../auth/authFetch';
import { getLinkedAccounts } from '../../accounts/api/accountApi';
import type { LinkedBankAccount } from '../../accounts/types/account';
import AccountLinkModal from '../../link/components/AccountLinkModal';
import { useAccountLink } from '../../link/hooks/useAccountLink';
import { Button } from '../../common/components';

interface UserData {
  userToken?: string;
  name?: string;
  email?: string;
  birthDate?: string;
  phone?: string;
  userKey?: string;
  verificationStatus?: string;
  createdAt?: string;
  joinedAt?: string;
  marketingConsent?: string;
  lastLoginAt?: string;
  lastLogin?: string;
  profileImageUrl?: string;
}

async function readJson(
    response: Response
): Promise<Record<string, unknown>> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function isUserData(value: unknown): value is UserData {
  if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value)
  ) {
    return false;
  }

  const user = value as Record<string, unknown>;

  return (
      typeof user.name === 'string' &&
      user.name.trim() !== '' &&
      typeof user.email === 'string' &&
      user.email.trim() !== ''
  );
}

function formatBalance(balance: number): string {
  if (!Number.isFinite(balance)) {
    return '잔액 확인 불가';
  }

  return `${balance.toLocaleString('ko-KR')}원`;
}

function formatDateTime(value?: string): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export default function MyPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState<UserData | null>(null);
  const [accounts, setAccounts] = useState<LinkedBankAccount[]>([]);

  const [error, setError] = useState('');
  const [accountError, setAccountError] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  const loadMyPage = useCallback(async () => {
    setError('');
    setAccountError('');

    const [meResult, accountsResult] =
        await Promise.allSettled([
          authFetch('/api/users/me', {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          }),

          getLinkedAccounts(),
        ]);

    if (meResult.status === 'rejected') {
      console.error(
          '내 정보 조회 실패',
          meResult.reason
      );

      setError(
          '내 정보를 불러오지 못했습니다.'
      );
    } else {
      const meResponse = meResult.value;
      const meData = await readJson(meResponse);

      if (!meResponse.ok) {
        setError(
            typeof meData.message === 'string'
                ? meData.message
                : '내 정보를 불러오지 못했습니다.'
        );
      } else {
        const rawUser =
            meData.data !== undefined
                ? meData.data
                : meData;

        if (!isUserData(rawUser)) {
          console.error(
              '내 정보 응답 구조가 올바르지 않습니다.',
              rawUser
          );

          setError(
              '내 정보 응답 형식이 올바르지 않습니다.'
          );
        } else {
          setUser(rawUser);
        }
      }
    }

    // =========================
    // 연결 계좌
    // =========================
    if (accountsResult.status === 'rejected') {
      console.error(
          '연결된 계좌 조회 실패',
          accountsResult.reason
      );

      setAccounts([]);

      setAccountError(
          '계좌 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
      );
    } else {
      setAccounts(accountsResult.value);
    }

    setIsLoading(false);
  }, []);

  const {
    isConnecting,
    connectAccount,
  } = useAccountLink({
    onSuccess: loadMyPage,
  });

  const handleCloseAccountLinkModal = useCallback(() => {
    setIsLinkModalOpen(false);
  }, []);

  const handleConfirmAccountLink = useCallback(async () => {
    const started = await connectAccount();

    if (started) {
      setIsLinkModalOpen(false);
    }
  }, [connectAccount]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadMyPage();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadMyPage]);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      const response = await authFetch(
          '/api/auth/logout',
          {
            method: 'POST',
          }
      );

      if (!response.ok) {
        console.error(
            '로그아웃 API 실패',
            response.status
        );
      }
    } catch (error) {
      console.error(
          '로그아웃 요청 실패',
          error
      );
    } finally {
      clearStoredAuth();

      navigate('/login', {
        replace: true,
      });
    }
  }

  const memberName = user?.name ?? '';

  return (
      <>
        <div className="mx-auto w-[min(1040px,calc(100%-40px))] py-9 pb-18">
          <section className="mb-6">
            <h1 className="m-0 text-[36px] leading-none font-extrabold">
              내 정보
            </h1>

            <p className="mt-3 text-base text-muted">
              회원 정보와 연결 계좌를 관리할 수 있습니다.
            </p>
          </section>

          {error && (
              <div
                  className="mb-4 rounded-lg border border-[#f0beb9] bg-[#fff2f1] px-3.5 py-3 text-xs text-error"
                  role="alert"
              >
                {error}
              </div>
          )}

          {isLoading ? (
              <section className="rounded-lg border border-outline bg-surface p-8 text-center text-sm text-muted">
                내 정보를 불러오는 중입니다.
              </section>
          ) : (
              <>
                <section className="mb-2 flex min-h-33 items-center gap-6 rounded-lg border border-[#d9dee8] bg-surface px-8 py-6 shadow-[0_10px_30px_rgba(28,39,60,0.08)]">
                  <div className="relative shrink-0">
                    <div className="flex h-19 w-19 items-center justify-center overflow-hidden rounded-xl border-[3px] border-soft bg-[#f4f5f8]">
                      {user?.profileImageUrl ? (
                          <img
                              src={user.profileImageUrl}
                              alt="프로필 이미지"
                              className="h-full w-full object-cover"
                          />
                      ) : (
                          <svg
                              viewBox="0 0 24 24"
                              className="h-8.5 w-8.5 text-[#a0a7b4]"
                              aria-hidden="true"
                          >
                            <circle
                                cx="12"
                                cy="8"
                                r="4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.9"
                            />

                            <path
                                d="M4 21a8 8 0 0 1 16 0"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.9"
                                strokeLinecap="round"
                            />
                          </svg>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-h-7 items-center gap-3">
                      <strong className="min-w-25 text-[21px] tracking-[-0.03em]">
                        {memberName}
                      </strong>

                      {user?.verificationStatus && (
                          <span className="inline-flex items-center rounded-xl bg-[#ffdad6] px-3 py-1 text-[11px] font-semibold tracking-[0.05em] whitespace-nowrap text-[#93000a]">
                            {user.verificationStatus}
                          </span>
                      )}
                    </div>

                    <div className="mt-1.5 min-h-4.5 text-xs text-[#4f5665]">
                      {user?.email ?? ''}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                          variant="secondary"
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                          isLoading={isLoggingOut}
                          className="h-7.5 min-w-22 rounded-lg border border-[#c9cfdb] px-3.5 py-0 text-[11px] font-semibold text-[#23262d] transition hover:border-primary hover:text-primary disabled:cursor-default disabled:opacity-50 active:transform-none"
                      >
                        {isLoggingOut
                            ? '로그아웃 중'
                            : '로그아웃'}
                      </Button>
                    </div>
                  </div>
                </section>

                <section className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <article className="min-h-62.5 rounded-lg border border-[#d9dee8] bg-surface px-6 py-5.5 shadow-[0_10px_30px_rgba(28,39,60,0.08)]">
                    <div className="flex items-center justify-between border-b border-outline pb-3">
                      <h2 className="m-0 text-[17px] tracking-[-0.025em] font-bold">
                        상세 정보
                      </h2>

                      <span
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#414756]"
                          aria-label="상세 정보"
                      >
                        <svg
                            viewBox="0 0 24 24"
                            className="h-4.5 w-4.5"
                            aria-hidden="true"
                        >
                          <circle
                              cx="12"
                              cy="12"
                              r="9"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.9"
                          />

                          <path
                              d="M12 11v5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.9"
                              strokeLinecap="round"
                          />

                          <path
                              d="M12 8h.01"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                          />
                        </svg>
                      </span>
                    </div>

                    <div className="mt-5">
                      <div className="flex min-h-13 items-center justify-between gap-3 border-b border-outline py-3">
                        <span className="shrink-0 text-xs text-muted">회원 토큰</span>
                        <strong className="min-w-0 break-all text-right text-[11px] select-all">
                          {user?.userToken?.trim() || '회원 토큰을 확인할 수 없습니다.'}
                        </strong>
                      </div>
                      <div className="flex h-13 items-center justify-between border-b border-outline">
                        <span className="text-xs text-muted">
                          이메일
                        </span>

                        <strong className="min-w-27.5 text-right text-[11px]">
                          {user?.email ?? ''}
                        </strong>
                      </div>

                      <div className="flex h-13 items-center justify-between border-b border-outline">
                        <span className="text-xs text-muted">
                          가입일
                        </span>

                        <strong className="min-w-27.5 text-right text-[11px]">
                          {formatDateTime(
                              user?.createdAt ??
                              user?.joinedAt
                          )}
                        </strong>
                      </div>
                    </div>
                  </article>

                  <article className="min-h-62.5 rounded-lg border border-[#d9dee8] bg-surface px-6 py-5.5 shadow-[0_10px_30px_rgba(28,39,60,0.08)]">
                    <div className="flex items-center justify-between border-b border-outline pb-3">
                      <h2 className="m-0 text-[17px] tracking-[-0.025em] font-bold">
                        연결된 계좌
                      </h2>

                      <div className="flex items-center gap-2">
                      <Button
                          variant="secondary"
                          onClick={() => navigate('/mypage/transactions')}
                          className="h-9 rounded-lg px-3.5 py-0 text-xs font-semibold"
                      >내역</Button>
                      <Button
                          onClick={() => setIsLinkModalOpen(true)}
                          disabled={isConnecting}
                          isLoading={isConnecting}
                          className="flex h-9 rounded-lg border-0 px-3.5 py-0 text-xs font-semibold transition hover:bg-[#0b754f] enabled:hover:opacity-100 disabled:cursor-default active:transform-none"
                      >
                        <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            aria-hidden="true"
                        >
                          <circle
                              cx="12"
                              cy="12"
                              r="9"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.9"
                          />

                          <path
                              d="M12 8v8M8 12h8"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.9"
                              strokeLinecap="round"
                          />
                        </svg>

                        {isConnecting
                            ? '연결 중'
                            : '계좌 추가'}
                      </Button>
                      </div>
                    </div>

                    <div className="mt-2 max-h-65 overflow-y-auto">
                      {accountError ? (
                          <div
                              className="flex min-h-50 items-center justify-center rounded-[10px] border-[1.5px] border-dashed border-outline bg-[#f7f8fc] px-5 py-8 text-center text-[11px] leading-[1.5] text-muted"
                              role="alert"
                          >
                            {accountError}
                          </div>
                      ) : accounts.length === 0 ? (
                          <div className="flex min-h-50 flex-col items-center justify-center gap-2.5 rounded-[10px] border-[1.5px] border-dashed border-outline bg-[#f7f8fc] px-5 py-8 text-center">
                            <strong className="text-sm font-bold">
                              연결된 계좌가 없습니다
                            </strong>

                            <p className="m-0 text-[11px] leading-[1.5] text-muted">
                              계좌를 연결하면 정산 및 차용금
                              관리가
                              <br />
                              자동화되어 더욱 편리해집니다.
                            </p>

                            <Button
                                onClick={() => setIsLinkModalOpen(true)}
                                disabled={isConnecting}
                                isLoading={isConnecting}
                                className="mt-1.5 h-9 rounded-lg border-0 px-4.5 py-0 text-xs hover:bg-[#0b754f] enabled:hover:opacity-100 active:transform-none"
                            >
                              <svg
                                  viewBox="0 0 24 24"
                                  className="h-4 w-4"
                                  aria-hidden="true"
                              >
                                <circle
                                    cx="12"
                                    cy="12"
                                    r="9"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.9"
                                />

                                <path
                                    d="M12 8v8M8 12h8"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.9"
                                    strokeLinecap="round"
                                />
                              </svg>

                              지금 바로 연결하기
                            </Button>
                          </div>
                      ) : (
                          <div className="flex flex-col">
                            {accounts.map((account) => (
                                <div
                                    key={account.linkedAccountId}
                                    className="flex min-h-18.5 items-center border-b border-[#d9dee8] py-3"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex min-w-0 items-center gap-2">
                                        <span className="text-xs font-bold">
                                          {account.bankName}
                                        </span>

                                        <span className="text-xs text-muted">
                                          |
                                        </span>

                                        <span className="truncate text-[10px] tracking-[0.11em] text-muted">
                                          {account.maskedAccountNumber}
                                        </span>
                                      </div>

                                      <strong className="whitespace-nowrap text-xs">
                                        {formatBalance(account.balance)}
                                      </strong>
                                    </div>
                                  </div>
                                </div>
                            ))}
                          </div>
                      )}
                    </div>
                  </article>
                </section>

                <section className="mx-auto mt-2 flex min-h-13.5 w-fit max-w-full items-center justify-center gap-3 rounded-lg border border-[#d9dee8] bg-surface px-6 py-3.5 text-center text-[11px] text-muted shadow-[0_10px_30px_rgba(28,39,60,0.08)]">
                  <svg
                      viewBox="0 0 24 24"
                      className="h-4.5 w-4.5 shrink-0 text-[#232830]"
                      aria-hidden="true"
                  >
                    <path
                        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    <path
                        d="m9 12 2 2 4-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                  </svg>

                  <span>
                    사용자의 금융 정보는 암호화되어 안전하게
                    보호됩니다.
                  </span>
                </section>
              </>
          )}
        </div>
        {isLinkModalOpen && (
          <AccountLinkModal
              isOpen={isLinkModalOpen}
              isConnecting={isConnecting}
              onClose={handleCloseAccountLinkModal}
              onConfirm={handleConfirmAccountLink}
          />
        )}
      </>
  );
}
