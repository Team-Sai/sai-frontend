import { authFetch } from '../../auth/authFetch';
import type { LinkedBankAccount } from '../types/account';

function isLinkedBankAccount(
    value: unknown
): value is LinkedBankAccount {
    if (
        typeof value !== 'object' ||
        value === null ||
        Array.isArray(value)
    ) {
        return false;
    }

    const account = value as Record<string, unknown>;

    return (
        typeof account.linkedAccountId === 'number' &&
        typeof account.bankCode === 'string' &&
        typeof account.bankName === 'string' &&
        typeof account.maskedAccountNumber === 'string' &&
        (
            typeof account.accountAlias === 'string' ||
            account.accountAlias === null
        ) &&
        typeof account.accountHolderName === 'string' &&
        typeof account.balance === 'number' &&
        typeof account.connectionStatus === 'string'
    );
}

function isLinkedBankAccountList(
    value: unknown
): value is LinkedBankAccount[] {
    return (
        Array.isArray(value) &&
        value.every(isLinkedBankAccount)
    );
}

export async function getLinkedAccounts():
    Promise<LinkedBankAccount[]> {
    const response = await authFetch('/api/linked-accounts', {
        method: 'GET',
        headers: {
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(
            `연결된 계좌 목록을 불러오지 못했습니다. (HTTP ${response.status})`
        );
    }

    const data: unknown = await response.json();

    if (!isLinkedBankAccountList(data)) {
        console.error(
            '연결된 계좌 응답 형식이 올바르지 않습니다.'
        );

        throw new Error(
            '계좌 정보 응답 형식이 올바르지 않습니다.'
        );
    }

    return data;
}