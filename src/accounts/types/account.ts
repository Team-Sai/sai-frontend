export interface LinkedBankAccount {
    linkedAccountId: number;
    bankCode: string;
    bankName: string;
    maskedAccountNumber: string;
    accountAlias: string | null;
    accountHolderName: string;
    balance: number;
    connectionStatus: string;
}

/** 계약의 수취 계좌. 채무자도 조회하므로 입금에 필요한 정보만 사용한다. */
export type ContractRepaymentAccount = Pick<
    LinkedBankAccount,
    'bankName' | 'maskedAccountNumber' | 'accountHolderName'
>;
