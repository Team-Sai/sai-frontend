import { useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { formatMoney, formatTransactionDate, transactionStatusLabels } from './format';
import type { Transaction } from './types';
import styles from './TransactionDetail.module.css';

export type TransactionDetailProps = ComponentPropsWithoutRef<'article'> & {
  transaction: Transaction;
  children?: ReactNode;
};

export default function TransactionDetail({
  transaction, children, className = '', ...props
}: TransactionDetailProps) {
  const headingId = useId();
  const isDeposit = transaction.transactionType === 'DEPOSIT';
  const validDate = !Number.isNaN(new Date(transaction.transactionAt).getTime());

  return (
    <article aria-labelledby={headingId} {...props} className={`${styles.card} ${className}`}>
      <div className={styles.summary}>
        <h3 id={headingId} className={`${styles.amount} ${isDeposit ? styles.deposit : styles.withdrawal}`}>
          {formatMoney(transaction.amount)} {isDeposit ? '입금' : '출금'}
        </h3>
        <dl className={styles.meta}>
          <div><dt>거래 상대</dt><dd>{transaction.counterpartyName?.trim() || '거래 상대 미상'}</dd></div>
          <div>
            <dt>거래일시</dt>
            <dd><time dateTime={validDate ? transaction.transactionAt : undefined}>
              {formatTransactionDate(transaction.transactionAt)}
            </time></dd>
          </div>
          <div><dt>메모</dt><dd className={styles.memo}>{transaction.memo?.trim() || '메모 없음'}</dd></div>
        </dl>
        <span className={`${styles.badge} ${styles[transaction.processingStatus]}`}>
          <span className={styles.srOnly}>처리 상태: </span>
          {transactionStatusLabels[transaction.processingStatus]}
        </span>
      </div>
      {children != null && <div className={styles.actions}>{children}</div>}
    </article>
  );
}
