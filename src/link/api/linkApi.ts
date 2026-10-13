import { authFetch } from '../../auth/authFetch';

interface StartAccountLinkResponse {
    redirectUrl: string;
}

function isStartAccountLinkResponse(
    value: unknown
): value is StartAccountLinkResponse {
    if (
        typeof value !== 'object' ||
        value === null ||
        Array.isArray(value)
    ) {
        return false;
    }

    const data = value as Record<string, unknown>;

    return (
        typeof data.redirectUrl === 'string' &&
        data.redirectUrl.trim() !== ''
    );
}

export async function startAccountLink():
    Promise<StartAccountLinkResponse> {
    const response = await authFetch(
        '/api/accounts/link/start',
        {
            method: 'POST',
            headers: {
                Accept: 'application/json',
            },
        }
    );

    if (!response.ok) {
        throw new Error(
            `계좌 연동을 시작할 수 없습니다. (HTTP ${response.status})`
        );
    }

    const data: unknown = await response.json();

    if (!isStartAccountLinkResponse(data)) {
        throw new Error(
            '계좌 연동 응답 형식이 올바르지 않습니다.'
        );
    }

    return data;
}