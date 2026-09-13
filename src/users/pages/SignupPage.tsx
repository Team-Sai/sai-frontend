import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePasswordVisibility } from '../../common/hooks/usePasswordVisibility';

const SIGNUP_API = '/api/auth/signup';
const LOGIN_PATH = '/login';

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const DOB_PATTERN = /^\d{8}$/;

interface SignupPayload {
  email: string;
  password: string;
  name: string;
  birthDate: string;
}

interface SignupResponse {
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

function formatBirthDate(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function isValidBirthDate(digits: string): boolean {
  if (!DOB_PATTERN.test(digits)) return false;

  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900) return false;

  const date = new Date(year, month - 1, day);
  const isRealDate =
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day;

  if (!isRealDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) return false;

  return true;
}

export default function SignupPage() {
  const navigate = useNavigate();
  const password = usePasswordVisibility();

  const emailInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');

  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [dobError, setDobError] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function clearFieldError(field: 'email' | 'password' | 'name' | 'dob') {
    setSignupError('');
    if (field === 'email') setEmailError(false);
    if (field === 'password') setPasswordError(false);
    if (field === 'name') setNameError(false);
    if (field === 'dob') setDobError(false);
  }

  function handleDobChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 8);
    setDob(digitsOnly);
    clearFieldError('dob');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isSubmitting) return;

    const emailValid = emailInputRef.current?.validity.valid ?? false;
    const passwordValid = PASSWORD_PATTERN.test(passwordValue);
    const nameValid = name.trim().length > 0;
    const dobValid = isValidBirthDate(dob);

    setEmailError(!emailValid);
    setPasswordError(!passwordValid);
    setNameError(!nameValid);
    setDobError(!dobValid);
    setSignupError('');

    if (!emailValid || !passwordValid || !nameValid || !dobValid) {
      return;
    }

    const payload: SignupPayload = {
      email: email.trim(),
      password: passwordValue,
      name: name.trim(),
      birthDate: formatBirthDate(dob),
    };

    setIsSubmitting(true);

    try {
      const response = await fetch(SIGNUP_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const responseData = (await readJson(response)) as SignupResponse;

      if (!response.ok) {
        const message =
            typeof responseData.message === 'string'
                ? responseData.message
                : '회원가입에 실패했습니다.';
        throw new Error(message);
      }

      navigate(`${LOGIN_PATH}?signup=success`, { replace: true });
    } catch (error) {
      setSignupError(
          error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
      <main className="flex w-full flex-1 justify-center px-5 pt-9 pb-18">
        <section className="w-full max-w-105">
          <div className="mb-5.5">
            <h1 className="m-0 text-heading tracking-tight">회원가입</h1>
            <p className="mt-1.75 text-body text-muted">
              사이원장과 함께 거래 관리를 시작하세요.
            </p>
          </div>

          <div className="rounded-lg border border-outline bg-surface p-6">
            <form noValidate onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="mb-1.75 block text-body font-bold">
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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError('email');
                    }}
                    aria-invalid={emailError}
                    aria-describedby={emailError ? 'email-error' : undefined}
                    className={`h-11 w-full rounded-md border bg-background px-3.5 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 ${
                        emailError ? 'border-error' : 'border-outline'
                    }`}
                />
                <p className="mt-1.5 text-[10px] leading-relaxed text-[#7a8288]">
                  본인 확인 및 알림 수신을 위해 정확한 이메일을 입력해 주세요.
                </p>
                {emailError && (
                    <p id="email-error" className="mt-1.5 text-tiny text-error" role="alert">
                      이메일 주소를 확인해 주세요.
                    </p>
                )}
              </div>

              <div className="mt-5.5">
                <label htmlFor="password" className="mb-1.75 block text-body font-bold">
                  비밀번호 설정
                </label>
                <div className="relative">
                  <input
                      id="password"
                      name="password"
                      type={password.inputType}
                      placeholder="비밀번호 입력"
                      autoComplete="new-password"
                      required
                      value={passwordValue}
                      onChange={(e) => {
                        setPasswordValue(e.target.value);
                        clearFieldError('password');
                      }}
                      aria-invalid={passwordError}
                      aria-describedby={passwordError ? 'password-error' : undefined}
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
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="m2 2 20 20" />
                          <path d="M6.71 6.71C4.93 7.9 3.57 9.62 2.81 11.65a1 1 0 0 0 0 .7C4.32 16.12 7.89 18.5 12 18.5c1.18 0 2.29-.2 3.31-.56" />
                          <path d="M10.73 10.73a2 2 0 0 0 2.54 2.54" />
                          <path d="M14.12 5.68A9.95 9.95 0 0 0 12 5.5c-4.11 0-7.68 2.38-9.19 6.15" />
                          <path d="M16.61 7.39c2.05 1.15 3.63 3 4.58 5.26a1 1 0 0 1 0 .7 10.1 10.1 0 0 1-1.46 2.4" />
                        </svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M2.062 12.348a1 1 0 0 1 0-.696C3.574 7.884 7.269 5.5 12 5.5s8.426 2.384 9.938 6.152a1 1 0 0 1 0 .696C20.426 16.116 16.731 18.5 12 18.5S3.574 16.116 2.062 12.348Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                    )}
                  </button>
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-[#7a8288]">
                  영문, 숫자, 특수문자를 포함해 8자 이상 입력해 주세요.
                </p>
                {passwordError && (
                    <p id="password-error" className="mt-1.5 text-tiny text-error" role="alert">
                      비밀번호 형식을 확인해 주세요.
                    </p>
                )}
              </div>

              <div className="mt-5.5">
                <label htmlFor="full-name" className="mb-1.75 block text-body font-bold">
                  이름
                </label>
                <input
                    id="full-name"
                    name="name"
                    type="text"
                    placeholder="실명을 입력하세요"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearFieldError('name');
                    }}
                    aria-invalid={nameError}
                    aria-describedby={nameError ? 'name-error' : undefined}
                    className={`h-11 w-full rounded-md border bg-background px-3.5 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 ${
                        nameError ? 'border-error' : 'border-outline'
                    }`}
                />
                {nameError && (
                    <p id="name-error" className="mt-1.5 text-tiny text-error" role="alert">
                      이름을 입력해 주세요.
                    </p>
                )}
              </div>

              <div className="mt-5.5">
                <label htmlFor="dob" className="mb-1.75 block text-body font-bold">
                  생년월일
                </label>
                <input
                    id="dob"
                    name="birthDate"
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="예: 19900101"
                    required
                    value={dob}
                    onChange={handleDobChange}
                    aria-invalid={dobError}
                    aria-describedby={dobError ? 'dob-error' : undefined}
                    className={`h-11 w-full rounded-md border bg-background px-3.5 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 ${
                        dobError ? 'border-error' : 'border-outline'
                    }`}
                />
                <p className="mt-1.5 text-[10px] leading-relaxed text-[#7a8288]">
                  숫자 8자리를 입력해 주세요.
                </p>
                {dobError && (
                    <p id="dob-error" className="mt-1.5 text-tiny text-error" role="alert">
                      생년월일 8자리를 확인해 주세요.
                    </p>
                )}
              </div>

              {signupError && (
                  <p className="mt-4.25 text-center text-tiny text-error" role="alert">
                    {signupError}
                  </p>
              )}

              <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-7 h-12 w-full rounded-md bg-primary text-sm font-bold text-white transition hover:opacity-90 active:scale-99 disabled:cursor-default disabled:opacity-60"
              >
                {isSubmitting ? '가입 처리 중' : '가입하기'}
              </button>

              <div className="mt-5 border-t border-outline pt-5 text-center text-xs text-muted">
                이미 계정이 있으신가요?
                <Link to="/login" className="ml-1 font-bold text-primary">
                  로그인
                </Link>
              </div>
            </form>
          </div>
        </section>
      </main>
  );
}