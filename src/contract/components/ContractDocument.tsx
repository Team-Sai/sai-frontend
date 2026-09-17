import { Input, Select, Textarea } from '../../common/components';
import { useEffect, useState } from 'react';
import './ContractDocument.css';
import type { LinkedBankAccount } from '../../accounts/types/account';
import { getSelectableAccounts } from '../api/contractApi';
import { REPAYMENT_METHOD_LABELS, type ContractFormData, type CreditorInfo, type RepaymentMethod } from '../types/contract';

interface ContractDocumentProps {
  formData: ContractFormData;
  onFieldChange: <K extends keyof ContractFormData>(field: K, value: ContractFormData[K]) => void;
  creditorInfo: CreditorInfo | null;
  disabled?: boolean;
}

export default function ContractDocument({
  formData,
  onFieldChange,
  creditorInfo,
  disabled = false,
}: ContractDocumentProps) {
  const [accounts, setAccounts] = useState<LinkedBankAccount[]>([]);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [isPrincipalFocused, setIsPrincipalFocused] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getSelectableAccounts()
      .then((data) => {
        if (!cancelled) setAccounts(data);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setAccountsError(error instanceof Error ? error.message : '계좌 목록을 불러오지 못했습니다.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedAccount = accounts.find(
    (account) => String(account.linkedAccountId) === formData.selectedLinkedAccountId,
  );

  const principalDisplayValue =
    !isPrincipalFocused && formData.principalAmount
      ? Number(formData.principalAmount).toLocaleString('ko-KR')
      : formData.principalAmount;

  return (
    <>
      <h1 className="doc__title">금 전 차 용 계 약 서</h1>

      <div className="doc__article">
        <span className="doc__clause">제1조(당사자)</span>
        <div className="doc__body">
          <span className="doc__text">
            채권자 <strong className="doc__readonly">{creditorInfo?.name ?? '-'}</strong>(이하 "갑"이라고 함)는
          </span>
          <span className="doc__text doc__text--indent">
            금{' '}
            <Input variant="document" aria-label="대출원금"
              className="doc__inline-input--amount"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={principalDisplayValue}
              onFocus={() => setIsPrincipalFocused(true)}
              onBlur={() => setIsPrincipalFocused(false)}
              onChange={(event) => onFieldChange('principalAmount', event.target.value.replace(/[^\d]/g, ''))}
              disabled={disabled}
            />
            원을 채무자(이하 "을"이라고 함)에게 대여하고 을은 이를 차용한다.
          </span>

          <div className="loan-account">
            <label htmlFor="selectedLinkedAccountId" className="loan-account__title">대출금 지급 계좌</label>
            <Select variant="document"
              id="selectedLinkedAccountId"
              value={formData.selectedLinkedAccountId}
              onChange={(event) => onFieldChange('selectedLinkedAccountId', event.target.value)}
              disabled={disabled}
            >
              <option value="">계좌를 선택해 주세요</option>
              {accounts.map((account) => (
                <option key={account.linkedAccountId} value={account.linkedAccountId}>
                  {account.bankName} · {account.accountHolderName} · {account.maskedAccountNumber}
                </option>
              ))}
            </Select>

            {accountsError && (
              <p className="doc__hint" style={{ color: 'var(--error)' }}>
                {accountsError}
              </p>
            )}

            <table className="loan-account__summary" hidden={!selectedAccount}>
              <tbody>
                <tr>
                  <th>은 행</th>
                  <td>{selectedAccount?.bankName ?? '-'}</td>
                </tr>
                <tr>
                  <th>계좌번호</th>
                  <td>{selectedAccount?.maskedAccountNumber ?? '-'}</td>
                </tr>
                <tr>
                  <th>예금주</th>
                  <td>{selectedAccount?.accountHolderName ?? '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="doc__article">
        <span className="doc__clause">제2조(대출기간)</span>
        <div className="doc__body">
          <span className="doc__text">
            대출 시작일은{' '}
            <Input variant="document" aria-label="대출 시작일"
              className="doc__inline-input--date"
              type="date"
              value={formData.startDate}
              onChange={(event) => onFieldChange('startDate', event.target.value)}
              disabled={disabled}
            />
            로 한다.
          </span>
          <span className="doc__text doc__text--indent">
            차용금의 변제기한(만기일)은{' '}
            <Input variant="document" aria-label="대출 만기일"
              className="doc__inline-input--date"
              type="date"
              value={formData.maturityDate}
              onChange={(event) => onFieldChange('maturityDate', event.target.value)}
              disabled={disabled}
            />
            로 한다.
          </span>
        </div>
      </div>

      <div className="doc__article">
        <span className="doc__clause">제3조(이자)</span>
        <span className="doc__text">
          이자는 연{' '}
          <Input variant="document" aria-label="연이자율"
            className="doc__inline-input--rate"
            type="number"
            step={0.5}
            min={0.5}
            max={20}
            placeholder="0.5"
            value={formData.interestRate}
            onChange={(event) => onFieldChange('interestRate', event.target.value)}
            disabled={disabled}
          />
          %의 비율로 하며, 20%를 초과할 수 없다.
        </span>
      </div>

      <div className="doc__article">
        <span className="doc__clause">제4조(변제방법)</span>
        <div className="doc__body">
          <span className="doc__text">채무의 변제는 갑의 주소 또는 갑이 지정하는 장소에 지참 또는 송금해서 지불하며,</span>
          <span className="doc__text doc__text--indent">
            매월{' '}
            <Input variant="document" aria-label="상환일"
              className="doc__inline-input--day"
              type="number"
              min={1}
              max={31}
              placeholder="1"
              value={formData.repaymentDay}
              onChange={(event) => onFieldChange('repaymentDay', event.target.value)}
              disabled={disabled}
            />
            일에 지급하기로 한다.
          </span>
        </div>
      </div>

      <div className="doc__article">
        <span className="doc__clause">제5조(상환방식)</span>
        <div className="doc__radio-group">
          {(Object.keys(REPAYMENT_METHOD_LABELS) as RepaymentMethod[]).map((value) => (
            <label key={value} className="doc__radio">
              <input
                type="radio"
                name="repaymentType"
                value={value}
                checked={formData.repaymentType === value}
                onChange={() => onFieldChange('repaymentType', value)}
                disabled={disabled}
              />
              <span>{REPAYMENT_METHOD_LABELS[value]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="doc__article">
        <span className="doc__clause">제6조(계약의 목적)</span>
        <span className="doc__text">
          <Input variant="document" aria-label="계약의 목적"
            className="doc__inline-input--alias"
            type="text"
            placeholder="예: 생활비 차용"
            value={formData.contractAlias}
            onChange={(event) => onFieldChange('contractAlias', event.target.value)}
            disabled={disabled}
          />
        </span>
      </div>

      <div className="doc__article">
        <span className="doc__clause">제7조(특약사항)</span>
        <span className="doc__text">
          <Textarea variant="document" aria-label="특약사항"
            rows={3}
            placeholder="추가로 약정할 내용이 있다면 입력하세요 (선택)"
            value={formData.terms}
            onChange={(event) => onFieldChange('terms', event.target.value)}
            disabled={disabled}
          />
        </span>
      </div>
    </>
  );
}
