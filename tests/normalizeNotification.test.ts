import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeNotification } from '../src/notification/normalizeNotification.ts';
import type { NotificationResponse } from '../src/notification/types.ts';

function notification(content: string | null, notificationType = 'BANK_TRANSACTION_MATCHING_REVIEW'): NotificationResponse {
  return {
    notificationId: 1,
    notificationType,
    title: null,
    content,
    referenceId: null,
    secondaryReferenceId: null,
    referenceTitle: null,
    referenceType: null,
    settlementType: null,
    relatedTransactionStatus: null,
    resolved: false,
    createdAt: null,
  };
}

test('review amounts round to whole won and preserve spacing', () => {
  const cases = [
    ['10000.00원', '10,000원'],
    ['1000.49원', '1,000원'],
    ['1000.50원', '1,001원'],
    ['1234.56원', '1,235원'],
    ['1,000.5원', '1,001원'],
    ['1,234.50원', '1,235원'],
    ['10,000.00 원', '10,000 원'],
    ['1234.99  원', '1,235  원'],
    ['10000원', '10,000원'],
    ['1,234원', '1,234원'],
    ['0.99원', '1원'],
    ['999999.99원', '1,000,000원'],
    ['입금 1234.56원, 출금 10000.00 원', '입금 1,235원, 출금 10,000 원'],
    ['거래 1234.56건', '거래 1234.56건'],
  ];
  for (const [content, expected] of cases) {
    assert.equal(normalizeNotification(notification(content), 0).description, expected, content);
  }
});

test('other notification amounts remain unchanged', () => {
  const content = '입금 1234.56원';
  assert.equal(normalizeNotification(notification(content, 'CONTRACT_REQUESTED'), 0).description, content);
});

test('null review content becomes empty text', () => {
  assert.equal(normalizeNotification(notification(null), 0).description, '');
});
