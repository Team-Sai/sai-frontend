import { useEffect, useState } from "react";

import { Input, Select } from "../../common/components";

import type { LinkedBankAccount } from "../../accounts/types/account";

import { getSelectableAccounts } from "../api/contractApi";

import {
  REPAYMENT_METHOD_LABELS,
  type ContractFormData,
  type RepaymentMethod,
} from "../types/contract";

interface ContractConditionsTableProps {
  formData: ContractFormData;

  onFieldChange: <K extends keyof ContractFormData>(
    field: K,
    value: ContractFormData[K],
  ) => void;

  disabled?: boolean;
}

function formatMoney(value: string): string {
  if (!value) {
    return "";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return value;
  }

  return number.toLocaleString("ko-KR");
}

export default function ContractConditionsTable({
  formData,
  onFieldChange,
  disabled = false,
}: ContractConditionsTableProps) {
  const [accounts, setAccounts] = useState<LinkedBankAccount[]>([]);

  const [accountsError, setAccountsError] = useState<string | null>(null);

  const [isPrincipalFocused, setIsPrincipalFocused] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getSelectableAccounts()
      .then((data) => {
        if (!cancelled) {
          setAccounts(data);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setAccountsError(
            error instanceof Error
              ? error.message
              : "계좌 목록을 불러오지 못했습니다.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedAccount = accounts.find(
    (account) =>
      String(account.linkedAccountId) === formData.selectedLinkedAccountId,
  );

  const principalValue =
    !isPrincipalFocused && formData.principalAmount
      ? formatMoney(formData.principalAmount)
      : formData.principalAmount;

  return (
    <section className="contract-conditions">
      <div className="contract-conditions__heading">
        <div>
          <span>CONTRACT TERMS</span>

          <h2>계약 핵심조건</h2>
        </div>

        <p>본 조건표는 아래 계약 조항의 일부를 구성합니다.</p>
      </div>

      <div className="contract-conditions__grid">
        <div className="contract-condition">
          <label>대여원금</label>

          <div className="contract-condition__money">
            <span>금</span>

            <Input
              variant="borderless"
              type="text"
              inputMode="numeric"
              value={principalValue}
              placeholder="0"
              disabled={disabled}
              onFocus={() => setIsPrincipalFocused(true)}
              onBlur={() => setIsPrincipalFocused(false)}
              onChange={(event) =>
                onFieldChange(
                  "principalAmount",
                  event.target.value.replace(/[^\d]/g, ""),
                )
              }
            />

            <span>원정</span>
          </div>
        </div>

        <div className="contract-condition">
          <label>약정이율</label>

          <div className="contract-condition__unit">
            <Input
              variant="borderless"
              type="number"
              min={0.5}
              max={20}
              step={0.5}
              value={formData.interestRate}
              disabled={disabled}
              onChange={(event) =>
                onFieldChange("interestRate", event.target.value)
              }
            />

            <span>연 %</span>
          </div>
        </div>

        <div className="contract-condition">
          <label>대여일</label>

          <Input
            variant="borderless"
            type="date"
            value={formData.startDate}
            disabled={disabled}
            onChange={(event) => onFieldChange("startDate", event.target.value)}
          />
        </div>

        <div className="contract-condition">
          <label>최종 변제일</label>

          <Input
            variant="borderless"
            type="date"
            value={formData.maturityDate}
            disabled={disabled}
            onChange={(event) =>
              onFieldChange("maturityDate", event.target.value)
            }
          />
        </div>

        <div className="contract-condition">
          <label>상환방식</label>

          <Select
            variant="document"
            value={formData.repaymentType}
            disabled={disabled}
            onChange={(event) =>
              onFieldChange(
                "repaymentType",
                event.target.value as RepaymentMethod,
              )
            }
          >
            {(Object.keys(REPAYMENT_METHOD_LABELS) as RepaymentMethod[]).map(
              (value) => (
                <option value={value} key={value}>
                  {REPAYMENT_METHOD_LABELS[value]}
                </option>
              ),
            )}
          </Select>
        </div>

        <div className="contract-condition">
          <label>정기 상환일</label>

          <div className="contract-condition__unit">
            <span>매월</span>

            <Input
              variant="borderless"
              type="number"
              min={1}
              max={31}
              value={formData.repaymentDay}
              disabled={disabled}
              onChange={(event) =>
                onFieldChange("repaymentDay", event.target.value)
              }
            />

            <span>일</span>
          </div>
        </div>

        <div className="contract-condition contract-condition--wide">
          <label>차용 목적</label>

          <Input
            variant="borderless"
            type="text"
            placeholder="예: 생활비 차용, 사업 운영자금"
            value={formData.contractAlias}
            disabled={disabled}
            onChange={(event) =>
              onFieldChange("contractAlias", event.target.value)
            }
          />
        </div>

        <div className="contract-condition contract-condition--wide">
          <label>대여금 지급계좌</label>

          <Select
            variant="document"
            value={formData.selectedLinkedAccountId}
            disabled={disabled}
            onChange={(event) =>
              onFieldChange("selectedLinkedAccountId", event.target.value)
            }
          >
            <option value="">계좌를 선택해 주세요</option>

            {accounts.map((account) => (
              <option
                key={account.linkedAccountId}
                value={account.linkedAccountId}
              >
                {account.bankName}
                {" · "}
                {account.accountHolderName}
                {" · "}
                {account.maskedAccountNumber}
              </option>
            ))}
          </Select>

          {selectedAccount && (
            <div className="contract-condition__account">
              <span>{selectedAccount.bankName}</span>

              <span>{selectedAccount.maskedAccountNumber}</span>

              <span>예금주 {selectedAccount.accountHolderName}</span>
            </div>
          )}

          {accountsError && (
            <p className="contract-condition__error">{accountsError}</p>
          )}
        </div>
      </div>
    </section>
  );
}
