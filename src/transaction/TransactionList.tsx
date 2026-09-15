import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Button } from '../common/components/Button';
import TransactionDetail from './TransactionDetail';
import { formatMoney, formatTransactionDate } from './format';
import type { Transaction } from './types';
import styles from './TransactionList.module.css';

export type TransactionListProps = Omit<ComponentPropsWithoutRef<'ul'>, 'children' | 'onSelect'> & {
  items: Transaction[];
  onSelect?: (transaction: Transaction) => void;
  renderActions?: (transaction: Transaction) => ReactNode;
  renderContent?: (transaction: Transaction) => ReactNode;
};

export default function TransactionList({
  items, onSelect, renderActions, renderContent, className = '', ...props
}: TransactionListProps) {
  return (
    <ul aria-label="거래 내역" {...props} className={`${styles.list} ${className}`}>
      {items.length === 0 && <li className={styles.empty}>표시할 거래가 없습니다.</li>}
      {items.map((transaction) => {
        const actions = renderActions?.(transaction);
        const content = renderContent?.(transaction);
        return (
          <li key={`${transaction.linkedAccountId}-${transaction.bankTransactionId}`} className={styles.item}>
            <TransactionDetail transaction={transaction}>
              {content != null && <div className={styles.content}>{content}</div>}
              {(onSelect || actions != null) && <div className={styles.actions}>
                {onSelect && <Button
                  type="button"
                  variant="secondary"
                  className={styles.select}
                  onClick={() => onSelect(transaction)}
                  aria-label={`${transaction.counterpartyName?.trim() || '거래 상대 미상'}, ${formatTransactionDate(transaction.transactionAt)}, ${formatMoney(transaction.amount)} ${transaction.transactionType === 'DEPOSIT' ? '입금' : '출금'} 거래 선택`}
                >거래 선택</Button>}
                {actions}
              </div>}
            </TransactionDetail>
          </li>
        );
      })}
    </ul>
  );
}
