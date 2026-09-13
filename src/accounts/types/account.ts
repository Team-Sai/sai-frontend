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