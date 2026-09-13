import {
  useEffect,
  useRef,
  useState,
} from 'react';

import { authFetch } from '../../auth/authFetch';

type IdentityPurpose =
    | 'LOAN_CONTRACT'
    | 'SETTLEMENT';

interface PrepareIdentityResponse {
  identityVerificationId: string;
  storeId: string;
  channelKey: string;
}

interface CompleteIdentityResponse {
  status: string;
  [key: string]: unknown;
}

interface PortOneVerificationResponse {
  code?: string | null;
  message?: string;
  identityVerificationId?: string;
}

interface PortOneApi {
  requestIdentityVerification: (
      params: {
        storeId: string;
        channelKey: string;
        identityVerificationId: string;
      },
  ) => Promise<PortOneVerificationResponse>;
}

declare global {
  interface Window {
    PortOne?: PortOneApi;
  }
}

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
  return (
      typeof value === 'object' &&
      value !== null
  );
}

function isPrepareIdentityResponse(
    value: unknown,
): value is PrepareIdentityResponse {
  return (
      isRecord(value) &&
      typeof value.identityVerificationId ===
      'string' &&
      value.identityVerificationId.length > 0 &&
      typeof value.storeId === 'string' &&
      value.storeId.length > 0 &&
      typeof value.channelKey === 'string' &&
      value.channelKey.length > 0
  );
}

function isCompleteIdentityResponse(
    value: unknown,
): value is CompleteIdentityResponse {
  return (
      isRecord(value) &&
      typeof value.status === 'string'
  );
}

function getSafeReturnTo(
    returnTo: string | null,
): string | null {
  if (!returnTo) {
    return null;
  }

  try {
    const url = new URL(
        returnTo,
        window.location.origin,
    );

    if (
        url.origin !==
        window.location.origin
    ) {
      return null;
    }

    return (
        url.pathname +
        url.search +
        url.hash
    );
  } catch {
    return null;
  }
}

async function readResponse(
    response: Response,
): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      raw: text,
    };
  }
}

export default function IdentityTestPage() {
  const [purpose, setPurpose] =
      useState<IdentityPurpose>(
          'LOAN_CONTRACT',
      );

  const [result, setResult] =
      useState('대기 중');

  const [isLoading, setIsLoading] =
      useState(false);

  const [isRedirecting, setIsRedirecting] =
      useState(false);

  const redirectTimerRef =
      useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (
          redirectTimerRef.current !== null
      ) {
        window.clearTimeout(
            redirectTimerRef.current,
        );
      }
    };
  }, []);

  async function prepareIdentityVerification(
      selectedPurpose: IdentityPurpose,
  ): Promise<PrepareIdentityResponse> {
    const response = await authFetch(
        '/api/identity-verifications',
        {
          method: 'POST',
          headers: {
            'Content-Type':
                'application/json',
          },
          body: JSON.stringify({
            purpose: selectedPurpose,
          }),
        },
    );

    const responseBody =
        await readResponse(response);

    if (!response.ok) {
      const message =
          isRecord(responseBody) &&
          typeof responseBody.message ===
          'string'
              ? responseBody.message
              : `준비 요청 실패: ${response.status}`;

      throw new Error(message);
    }

    if (
        !isPrepareIdentityResponse(
            responseBody,
        )
    ) {
      throw new Error(
          '본인인증 준비 응답이 올바르지 않습니다.',
      );
    }

    return responseBody;
  }

  function loadPortOneSdk(): Promise<void> {
    if (
        typeof window.PortOne !== 'undefined' &&
        typeof window.PortOne.requestIdentityVerification ===
        'function'
    ) {
      return Promise.resolve();
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
        'script[data-portone-sdk="true"]',
    );

    if (existingScript) {
      return new Promise((resolve, reject) => {
        existingScript.addEventListener('load', () => resolve(), {
          once: true,
        });

        existingScript.addEventListener(
            'error',
            () =>
                reject(
                    new Error(
                        '포트원 SDK를 불러오지 못했습니다.',
                    ),
                ),
            {
              once: true,
            },
        );
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');

      script.src =
          'https://cdn.portone.io/v2/browser-sdk.js';
      script.async = true;
      script.dataset.portoneSdk = 'true';

      script.addEventListener(
          'load',
          () => resolve(),
          { once: true },
      );

      script.addEventListener(
          'error',
          () =>
              reject(
                  new Error(
                      '포트원 SDK를 불러오지 못했습니다.',
                  ),
              ),
          { once: true },
      );

      document.head.appendChild(script);
    });
  }

  async function requestPortOneVerification(
      prepare: PrepareIdentityResponse,
  ) {
    await loadPortOneSdk();

    if (
        typeof window.PortOne === 'undefined' ||
        typeof window.PortOne.requestIdentityVerification !==
        'function'
    ) {
      throw new Error(
          '포트원 SDK를 불러오지 못했습니다.',
      );
    }

    const response =
        await window.PortOne.requestIdentityVerification({
          storeId: prepare.storeId,
          channelKey: prepare.channelKey,
          identityVerificationId:
          prepare.identityVerificationId,
        });

    if (response.code != null) {
      throw new Error(
          response.message ??
          '포트원 본인인증에 실패했습니다.',
      );
    }

    if (
        response.identityVerificationId &&
        response.identityVerificationId !==
        prepare.identityVerificationId
    ) {
      throw new Error(
          '본인인증 요청 식별값이 일치하지 않습니다.',
      );
    }
  }

  async function completeIdentityVerification(
      identityVerificationId: string,
  ): Promise<CompleteIdentityResponse> {
    const encodedId =
        encodeURIComponent(
            identityVerificationId,
        );

    const response = await authFetch(
        `/api/identity-verifications/${encodedId}/complete`,
        {
          method: 'POST',
        },
    );

    const responseBody =
        await readResponse(response);

    if (!response.ok) {
      const message =
          isRecord(responseBody) &&
          typeof responseBody.message ===
          'string'
              ? responseBody.message
              : `완료 요청 실패: ${response.status}`;

      throw new Error(message);
    }

    if (
        !isCompleteIdentityResponse(
            responseBody,
        )
    ) {
      throw new Error(
          '본인인증 완료 응답이 올바르지 않습니다.',
      );
    }

    return responseBody;
  }

  async function startVerification() {
    if (
        isLoading ||
        isRedirecting
    ) {
      return;
    }

    setIsLoading(true);

    try {
      setResult(
          '본인인증 요청을 준비하고 있습니다.',
      );

      const prepare =
          await prepareIdentityVerification(
              purpose,
          );

      setResult(
          '본인인증 창을 여는 중입니다.',
      );

      await requestPortOneVerification(
          prepare,
      );

      setResult(
          '인증 결과를 확인하고 있습니다.',
      );

      const completeResult =
          await completeIdentityVerification(
              prepare.identityVerificationId,
          );

      if (
          completeResult.status !==
          'VERIFIED'
      ) {
        throw new Error(
            '본인인증 완료 상태를 확인할 수 없습니다.',
        );
      }

      setResult(
          '본인인증이 완료되었습니다.',
      );

      const searchParams =
          new URLSearchParams(
              window.location.search,
          );

      const returnTo =
          getSafeReturnTo(
              searchParams.get('returnTo'),
          );

      if (returnTo) {
        sessionStorage.setItem(
            'identityVerificationId',
            prepare.identityVerificationId,
        );

        setIsRedirecting(true);

        redirectTimerRef.current =
            window.setTimeout(() => {
              window.location.href = returnTo;
            }, 1000);
      }
    } catch (error) {
      console.error(error);

      const message =
          error instanceof Error
              ? error.message
              : '본인인증 처리 중 오류가 발생했습니다.';

      setResult(
          JSON.stringify(
              {
                step: 'FAILED',
                message,
              },
              null,
              2,
          ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
      <main className="mx-auto w-full max-w-240 px-5 py-10 md:px-8">
        {/* Stepper */}
        <section className="mb-6 rounded-xl border border-outline bg-surface px-6 py-5 shadow-sm">
          <ol className="flex items-start justify-between gap-3">
            <li className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              <svg
                  viewBox="0 0 16 16"
                  width="12"
                  height="12"
                  fill="none"
                  aria-hidden="true"
              >
                <path
                    d="M3 8.5 6.2 12 13 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
              </svg>
            </span>

              <span className="text-center text-xs font-bold text-primary sm:text-sm">
              차용증 작성
            </span>
            </li>

            <li className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              2
            </span>

              <span className="text-center text-xs font-bold text-primary sm:text-sm">
              본인인증 · 서명날인
            </span>
            </li>

            <li className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-outline bg-surface text-sm font-bold text-muted">
              3
            </span>

              <span className="text-center text-xs font-medium text-muted sm:text-sm">
              상대확인
            </span>
            </li>

            <li className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-outline bg-surface text-sm font-bold text-muted">
              4
            </span>

              <span className="text-center text-xs font-medium text-muted sm:text-sm">
              저장
            </span>
            </li>
          </ol>
        </section>

        {/* Identity Card */}
        <section className="overflow-hidden rounded-2xl border border-outline bg-surface shadow-sm">
          <header className="border-b border-outline px-6 py-7 md:px-10">
          <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            PortOne Test
          </span>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-text md:text-[27px]">
              본인인증 테스트
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-muted">
              본인인증 목적을 선택한 후 인증을 진행해 주세요.
            </p>
          </header>

          <div className="space-y-5 px-6 py-7 md:px-10">
            <div>
              <label
                  htmlFor="purpose"
                  className="mb-2 block text-sm font-bold text-text"
              >
                본인인증 목적
              </label>

              <select
                  id="purpose"
                  value={purpose}
                  onChange={(event) =>
                      setPurpose(
                          event.target
                              .value as IdentityPurpose,
                      )
                  }
                  disabled={
                      isLoading ||
                      isRedirecting
                  }
                  className="h-12 w-full rounded-lg border border-outline bg-surface px-4 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-low disabled:text-muted"
              >
                <option value="LOAN_CONTRACT">
                  금전소비대차 계약
                </option>

                <option value="SETTLEMENT">
                  정산
                </option>
              </select>
            </div>

            <button
                id="verification-button"
                type="button"
                onClick={startVerification}
                disabled={
                    isLoading ||
                    isRedirecting
                }
                className="flex h-12 w-full items-center justify-center rounded-lg bg-primary px-5 text-sm font-bold text-white transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRedirecting
                  ? '이동 중...'
                  : isLoading
                      ? '본인인증 처리 중...'
                      : '본인인증 시작'}
            </button>
          </div>

          <div className="border-t border-outline bg-surface-low px-6 py-6 md:px-10">
            <strong className="block text-sm font-bold text-text">
              처리 결과
            </strong>

            <pre className="mt-3 min-h-25 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-outline bg-surface p-4 font-mono text-xs leading-relaxed text-text">
            {result}
          </pre>
          </div>
        </section>
      </main>
  );
}
