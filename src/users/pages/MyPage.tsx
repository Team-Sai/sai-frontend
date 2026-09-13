import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch, clearStoredAuth } from '../../auth/authFetch';

interface Account {
  bankName?: string;
  maskedAccountNumber?: string;
  balance?: number | string | null;
}

interface UserData {
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
  accounts?: Account[];
}

const BACKEND_ORIGIN = (() => {
  const value =
      import.meta.env.VITE_BACKEND_ORIGIN ??
      window.location.origin;

  try {
    return new URL(value).origin;
  } catch {
    return window.location.origin;
  }
})();

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

function isAccountList(
    value: unknown
): value is Account[] {
  return (
      Array.isArray(value) &&
      value.every(
          (account) =>
              typeof account === 'object' &&
              account !== null &&
              !Array.isArray(account)
      )
  );
}

function formatBalance(balance: Account['balance']): string {
  if (balance == null || balance === '') {
    return '잔액 확인 불가';
  }

  const numericBalance = Number(balance);

  if (!Number.isFinite(numericBalance)) {
    return '잔액 확인 불가';
  }

  return `${numericBalance.toLocaleString('ko-KR')}원`;
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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState('');
  const [accountError, setAccountError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const bankWindowRef = useRef<Window | null>(null);
  const linkStateRef = useRef<string | null>(null);

  const loadMyPage = useCallback(async () => {
    setError('');
    setAccountError('');

    const [meResult, accountsResult] = await Promise.allSettled([
      authFetch('/api/users/me', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      }),

      authFetch('/api/linked-accounts', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      }),
    ]);

    // =========================
    // 내 정보
    // =========================
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
      const accountsResponse =
          accountsResult.value;

      if (!accountsResponse.ok) {
        console.error(
            '연결된 계좌 조회 실패',
            accountsResponse.status
        );

        setAccounts([]);
        setAccountError(
            '계좌 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
        );
      } else {
        const accountsData =
            await readJson(accountsResponse);

        const rawAccounts =
            accountsData.data ?? accountsData ?? [];

        if (!isAccountList(rawAccounts)) {
          console.error(
              '계좌 응답 구조가 올바르지 않습니다.',
              rawAccounts
          );

          setAccounts([]);
          setAccountError(
              '계좌 정보 응답 형식이 올바르지 않습니다.'
          );
        } else {
          setAccounts(rawAccounts);
        }
      }
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadMyPage();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadMyPage]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const bankWindow = bankWindowRef.current;
      const expectedState = linkStateRef.current;

      if (!bankWindow || !expectedState) {
        return;
      }

      // 연동 서버의 origin 확인
      if (event.origin !== BACKEND_ORIGIN) {
        return;
      }

      // 방금 연동을 위해 연 팝업에서 보낸 메시지인지 확인
      if (event.source !== bankWindow) {
        return;
      }

      if (event.data?.type !== 'SAI_BANK_LINK_COMPLETE') {
        return;
      }

      if (event.data?.state !== expectedState) {
        console.warn(
            '계좌 연동 state가 일치하지 않습니다.'
        );
        return;
      }

      bankWindowRef.current = null;
      linkStateRef.current = null;

      // 연동 프로세스 종료
      setIsConnecting(false);

      if (event.data.success) {
        void loadMyPage();
      } else {
        window.alert(
            '계좌 연동에 실패했습니다.'
        );
      }
    }

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener(
          'message',
          handleMessage
      );

      bankWindowRef.current?.close();
      bankWindowRef.current = null;
      linkStateRef.current = null;
    };
  }, [loadMyPage]);

  useEffect(() => {
    if (!isConnecting) {
      return;
    }

    const pollId = window.setInterval(() => {
      const bankWindow = bankWindowRef.current;

      if (!bankWindow) {
        return;
      }

      if (bankWindow.closed) {
        bankWindowRef.current = null;
        linkStateRef.current = null;
        setIsConnecting(false);

        window.alert(
            '계좌 연동이 취소되었습니다.'
        );
      }
    }, 500);

    return () => {
      window.clearInterval(pollId);
    };
  }, [isConnecting]);

  async function handleConnectAccount() {
    if (isConnecting) {
      return;
    }

    const bankWindow = window.open(
        'about:blank',
        'sai-bank-link',
        'width=480,height=720'
    );

    // 팝업 차단 여부 확인
    if (!bankWindow) {
      window.alert(
          '계좌 연동 창을 열 수 없습니다. 브라우저의 팝업 차단을 해제한 후 다시 시도해 주세요.'
      );
      return;
    }

    setIsConnecting(true);

    try {
      const response = await authFetch(
          '/api/accounts/link/start',
          {
            method: 'POST',
            headers: {
              Accept: 'application/json',
            },
          }
      );

      const data = await readJson(response);

      if (!response.ok) {
        bankWindow.close();

        bankWindowRef.current = null;
        linkStateRef.current = null;

        window.alert(
            typeof data.message === 'string'
                ? data.message
                : '계좌 연동을 시작할 수 없습니다.'
        );

        setIsConnecting(false);
        return;
      }

      const redirectUrl = data.redirectUrl;

      if (
          typeof redirectUrl !== 'string' ||
          redirectUrl.trim() === ''
      ) {
        bankWindow.close();

        bankWindowRef.current = null;
        linkStateRef.current = null;

        window.alert(
            '계좌 연동 URL을 전달받지 못했습니다.'
        );

        setIsConnecting(false);
        return;
      }

      let linkState: string | null = null;

      try {
        linkState = new URL(
            redirectUrl,
            window.location.origin
        ).searchParams.get('state');
      } catch (err) {
        console.error(
            '계좌 연동 URL 파싱 실패',
            err
        );
      }

      if (!linkState) {
        bankWindow.close();

        bankWindowRef.current = null;
        linkStateRef.current = null;

        window.alert(
            '계좌 연동 상태값을 전달받지 못했습니다.'
        );

        setIsConnecting(false);
        return;
      }

      bankWindowRef.current = bankWindow;
      linkStateRef.current = linkState;

      bankWindow.location.href = redirectUrl;

    } catch (err) {
      console.error(
          '계좌 연동 시작 실패',
          err
      );

      bankWindow.close();

      bankWindowRef.current = null;
      linkStateRef.current = null;

      window.alert(
          '계좌 연동을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.'
      );

      setIsConnecting(false);
    }
  }

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      const response = await authFetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        console.error('로그아웃 API 실패', response.status);
      }
    }finally {
      clearStoredAuth();

      navigate('/login', {
        replace: true,
      });
    }
  }

  const memberName = user?.name ?? '';

  return (
      <>
        <main className="mx-auto w-[min(1040px,calc(100%-40px))] py-9 pb-18">
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
                      <button
                          type="button"
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                          className="h-7.5 min-w-22 rounded-lg border border-[#c9cfdb] bg-white px-3.5 text-[11px] font-semibold text-[#23262d] transition hover:border-primary hover:text-primary disabled:cursor-default disabled:opacity-50"
                      >
                        {isLoggingOut
                            ? '로그아웃 중'
                            : '로그아웃'}
                      </button>
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

                      <button
                          type="button"
                          onClick={handleConnectAccount}
                          disabled={isConnecting}
                          className="flex h-9 items-center gap-1.5 rounded-lg border-0 bg-primary px-3.5 text-xs font-semibold text-white transition hover:bg-[#0b754f] disabled:cursor-default disabled:opacity-60"
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
                      </button>
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

                            <button
                                type="button"
                                onClick={handleConnectAccount}
                                disabled={isConnecting}
                                className="mt-1.5 inline-flex h-9 items-center gap-1.5 rounded-lg border-0 bg-primary px-4.5 text-xs font-bold text-white hover:bg-[#0b754f] disabled:opacity-60"
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
                            </button>
                          </div>
                      ) : (
                          <div className="flex flex-col">
                            {accounts.map((account, index) => (
                                <div
                                    key={`${account.bankName ?? 'bank'}-${account.maskedAccountNumber ?? 'account'}-${index}`}
                                    className="flex min-h-18.5 items-center border-b border-[#d9dee8] py-3"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex min-w-0 items-center gap-2">
                                        <span className="text-xs font-bold">
                                          {account.bankName ?? '은행 정보 없음'}
                                        </span>

                                        <span className="text-xs text-muted">
                                          |
                                        </span>

                                        <span className="truncate text-[10px] tracking-[0.11em] text-muted">
                                          {account.maskedAccountNumber ?? '계좌번호 없음'}
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
        </main>
      </>
  );
}