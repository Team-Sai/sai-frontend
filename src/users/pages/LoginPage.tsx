import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setAccessToken, clearStoredAuth } from '../../auth/authFetch';
import { useAuth } from '../../auth/useAuth';
import { usePasswordVisibility } from '../../common/hooks/usePasswordVisibility';
import { Link } from 'react-router-dom';

const SAVED_EMAIL_KEY = 'saiwonjangSavedEmail';
const DASHBOARD_PATH = '/integration/dashboard';

interface LoginResponse {
  accessToken?: string;
  data?: { accessToken?: string };
  message?: string;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function normalizeToken(token: string): string {
  return token.startsWith('Bearer ') ? token.substring(7) : token;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const password = usePasswordVisibility();

  const emailInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState(
    () => localStorage.getItem(SAVED_EMAIL_KEY) ?? ''
  );
  const [passwordValue, setPasswordValue] = useState('');
  const [rememberEmail, setRememberEmail] = useState(
    () => localStorage.getItem(SAVED_EMAIL_KEY) !== null
  );

  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pageMessage =
    searchParams.get('signup') === 'success'
      ? '회원가입이 완료되었습니다. 로그인해 주세요.'
      : searchParams.get('required') === 'true'
        ? '로그인이 필요한 페이지입니다.'
        : '';

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
    setEmailError(false);
    setLoginError('');
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPasswordValue(e.target.value);
    setPasswordError(false);
    setLoginError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const emailValid = emailInputRef.current?.validity.valid ?? false;
    const passwordValid = passwordValue.trim().length > 0;

    setEmailError(!emailValid);
    setPasswordError(!passwordValid);
    setLoginError('');

    if (!emailValid || !passwordValid) {
      return;
    }

    if (rememberEmail) {
      localStorage.setItem(SAVED_EMAIL_KEY, email.trim());
    } else {
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          password: passwordValue,
        }),
      });

      const responseData = (await readJson(response)) as LoginResponse;

      if (!response.ok) {
        throw new Error(
          responseData.message || '이메일 또는 비밀번호를 확인해 주세요.'
        );
      }

      const token = responseData.accessToken ?? responseData.data?.accessToken;

      if (!token) {
        console.error('로그인 API 응답:', responseData);
        throw new Error('로그인 토큰을 전달받지 못했습니다.');
      }

      const normalizedToken = normalizeToken(token);
      setAccessToken(normalizedToken);

      try {
        const meRes = await fetch('/api/users/me', {
          headers: { Authorization: `Bearer ${normalizedToken}` },
        });

        if (!meRes.ok) {
          throw new Error('사용자 정보를 불러오지 못했습니다. 다시 시도해 주세요.');
        }

        const userData = await meRes.json();
        login(userData);
      } catch (meError) {
        clearStoredAuth();
        throw meError instanceof Error
            ? meError
            : new Error('사용자 정보를 불러오지 못했습니다. 다시 시도해 주세요.');
      }

      navigate(DASHBOARD_PATH, { replace: true });
    } catch (error) {
      console.error(error);
      setLoginError(
        error instanceof Error
          ? error.message
          : '로그인 중 오류가 발생했습니다.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
      <main className="flex w-full flex-1 justify-center px-5 pt-9 pb-18">
        <section className="w-full max-w-105">
          <div className="mb-5.5">
            <h1 className="m-0 text-heading tracking-tight font-bold">로그인</h1>
            <p className="mt-1.75 text-body text-muted">
              개인 간 거래와 정산 내역을 안전하게 관리하세요.
            </p>
          </div>

          {pageMessage && (
            <div className="mb-3.5 rounded-md border border-[#b9dfc2] bg-[#edf9f0] px-3.5 py-2.5 text-tiny text-primary">
              {pageMessage}
            </div>
          )}

          <div className="rounded-lg border border-outline bg-surface p-6">
            <form noValidate onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.75 block text-body font-bold"
                >
                  이메일 주소
                </label>
                <input
                  ref={emailInputRef}
                  id="email"
                  name="email"
                  type="email"
                  placeholder="example@email.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={handleEmailChange}
                  className={`h-11 w-full rounded-md border bg-background px-3.5 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 ${
                    emailError ? 'border-error' : 'border-outline'
                  }`}
                />
                {emailError && (
                  <p className="mt-1.5 text-tiny text-error">
                    이메일 주소를 확인해 주세요.
                  </p>
                )}
              </div>

              <div className="mt-5.5">
                <label
                  htmlFor="password"
                  className="mb-1.75 block text-body font-bold"
                >
                  비밀번호
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={password.inputType}
                    placeholder="비밀번호 입력"
                    autoComplete="current-password"
                    required
                    value={passwordValue}
                    onChange={handlePasswordChange}
                    className={`h-11 w-full rounded-md border bg-background px-3.5 pr-12 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 ${
                      passwordError ? 'border-error' : 'border-outline'
                    }`}
                  />

                  <button
                    type="button"
                    aria-label={password.ariaLabel}
                    onClick={password.toggle}
                    className="absolute top-1/2 right-2.5 h-8 w-8 -translate-y-1/2 cursor-pointer border-0 bg-transparent text-[#6f777c]"
                  >
                    {password.isVisible ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m2 2 20 20" />
                        <path d="M6.71 6.71C4.93 7.9 3.57 9.62 2.81 11.65a1 1 0 0 0 0 .7C4.32 16.12 7.89 18.5 12 18.5c1.18 0 2.29-.2 3.31-.56" />
                        <path d="M10.73 10.73a2 2 0 0 0 2.54 2.54" />
                        <path d="M14.12 5.68A9.95 9.95 0 0 0 12 5.5c-4.11 0-7.68 2.38-9.19 6.15" />
                        <path d="M16.61 7.39c2.05 1.15 3.63 3 4.58 5.26a1 1 0 0 1 0 .7 10.1 10.1 0 0 1-1.46 2.4" />
                      </svg>
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M2.062 12.348a1 1 0 0 1 0-.696C3.574 7.884 7.269 5.5 12 5.5s8.426 2.384 9.938 6.152a1 1 0 0 1 0 .696C20.426 16.116 16.731 18.5 12 18.5S3.574 16.116 2.062 12.348Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>

                {passwordError && (
                  <p className="mt-1.5 text-tiny text-error">
                    비밀번호를 입력해 주세요.
                  </p>
                )}
              </div>

              <div className="mt-4.5 flex items-center justify-between gap-3.5 text-xs font-semibold">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={rememberEmail}
                    onChange={(e) => setRememberEmail(e.target.checked)}
                    className="accent-primary"
                  />
                  <span>이메일 저장</span>
                </label>

                <a href="/find-password" className="text-primary">
                  비밀번호 찾기
                </a>
              </div>

              {loginError && (
                <p className="mt-4.25 text-center text-tiny text-error">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-7 h-12 w-full rounded-md bg-primary text-sm font-bold text-white transition hover:opacity-90 active:scale-99 disabled:cursor-default disabled:opacity-60"
              >
                {isSubmitting ? '로그인 중' : '로그인'}
              </button>

              <div className="mt-5 border-t border-outline pt-5 text-center text-xs text-muted">
                아직 사이원장 회원이 아니신가요?
                <Link to="/signup" className="ml-1 font-bold text-primary">
                  회원가입
                </Link>
              </div>
            </form>
          </div>
        </section>
      </main>
  );
}