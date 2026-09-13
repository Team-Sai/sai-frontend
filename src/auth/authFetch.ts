interface ReissueResponse {  accessToken: string;
}

const ACCESS_TOKEN_KEY = 'accessToken';

let reissuePromise: Promise<string | null> | null = null;

function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

function setAccessToken(accessToken: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearStoredAuth(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

async function reissueAccessToken(): Promise<string | null> {
  if (reissuePromise) {
    return reissuePromise;
  }

  reissuePromise = (async () => {
    try {
      const response = await fetch('/api/auth/reissue', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        clearStoredAuth();
        return null;
      }

      const body: ReissueResponse = await response.json();

      if (
          typeof body.accessToken !== 'string' ||
          body.accessToken.length === 0
      ) {
        console.error('reissue 응답 형식이 올바르지 않습니다:', body);
        clearStoredAuth();
        return null;
      }

      setAccessToken(body.accessToken);
      return body.accessToken;
    } catch (error) {
      console.error('reissue 요청 실패:', error);
      clearStoredAuth();
      return null;
    } finally {
      reissuePromise = null;
    }
  })();

  return reissuePromise;
}

function redirectToLogin(): void {
  clearStoredAuth();
  window.location.href = '/login?required=true';
}

export async function authFetch(
  url: RequestInfo,
  options: RequestInit = {}
): Promise<Response> {
  let accessToken = getAccessToken();

  if (!accessToken) {
    accessToken = await reissueAccessToken();

    if (!accessToken) {
      redirectToLogin();
      throw new Error('로그인이 필요합니다.');
    }
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status !== 401) {
    return response;
  }

  const newAccessToken = await reissueAccessToken();

  if (!newAccessToken) {
    redirectToLogin();
    throw new Error('로그인이 만료되었습니다.');
  }

  headers.set('Authorization', `Bearer ${newAccessToken}`);

  const retryResponse = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (retryResponse.status === 401) {
    redirectToLogin();
    throw new Error('로그인이 만료되었습니다.');
  }

  return retryResponse;
}

export { setAccessToken, getAccessToken };