import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/settlement/utils/settlementList.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { buildSettlementGroups } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const defaults = { keyword: '', type: 'ALL', status: 'ALL', sort: 'LATEST' };
const cycle = (id, no, extra = {}) => ({ settlementId: id, recurringSettlementId: 10,
  settlementType: 'RECURRING', title: 'Membership', role: 'OWNER', settlementStatus: 'IN_PROGRESS',
  cycleNo: no, cycleDate: `2026-11-${String(10 + no).padStart(2, '0')}`, totalAmount: 100, ...extra });
const shared = (id, extra = {}) => ({ ...cycle(id, 1), settlementType: 'SHARED', recurringSettlementId: null, ...extra });
const build = (items, options = {}) => buildSettlementGroups(items, { ...defaults, ...options });

test('status filter keeps the actual latest header and only matching children', () => {
  const old = cycle(1, 1);
  const latest = cycle(2, 2, { settlementStatus: 'CLOSED' });
  const [group] = build([latest, old], { status: 'IN_PROGRESS' });
  assert.equal(group.latest, latest);
  assert.deepEqual(group.items, [old]);
  assert.equal(group.totalCount, 2);
});

test('keyword matching an old title does not replace the latest header', () => {
  const old = cycle(1, 1, { title: 'Old title' });
  const latest = cycle(2, 2, { title: 'New title' });
  const [group] = build([old, latest], { keyword: 'OLD' });
  assert.equal(group.latest, latest);
  assert.deepEqual(group.items, [old]);
});

test('a new batch cycle moves its group above a newer shared row and appends at the bottom', () => {
  const before = [cycle(1, 1), shared(2)];
  assert.equal(build(before)[0].key, 'settlement-2');
  const after = build([...before, cycle(3, 2)]);
  assert.equal(after[0].key, 'recurring-10');
  assert.deepEqual(after[0].items.map(item => item.cycleNo), [1, 2]);
});

test('amount sort uses latest group amount, while children remain ascending', () => {
  const items = [cycle(1, 1, { totalAmount: 900 }), cycle(2, 2, { totalAmount: 100 }), shared(3, { totalAmount: 200 })];
  const result = build(items, { sort: 'AMOUNT_DESC' });
  assert.deepEqual(result.map(g => g.key), ['settlement-3', 'recurring-10']);
  assert.deepEqual(result[1].items.map(item => item.cycleNo), [1, 2]);
});

test('deadline sort uses latest cycle date rather than earliest matching child', () => {
  const result = build([cycle(1, 1), cycle(2, 2), shared(3, { dueDate: '2026-11-11' })], { sort: 'DEADLINE' });
  assert.deepEqual(result.map(g => g.key), ['settlement-3', 'recurring-10']);
});

test('missing cycle numbers use chronological cycle dates, not zero', () => {
  const older = cycle(90, 1, { cycleNo: null });
  const latest = cycle(2, 2);
  const [group] = build([latest, older]);
  assert.equal(group.latest, latest);
  assert.deepEqual(group.items, [older, latest]);
});

test('missing dates and numbers fall back to settlement ID', () => {
  const [group] = build([cycle(9, 1, { cycleNo: null, cycleDate: null }), cycle(3, 1, { cycleNo: null, cycleDate: null })]);
  assert.deepEqual(group.items.map(item => item.settlementId), [3, 9]);
  assert.equal(group.latest.settlementId, 9);
});

test('same-title groups remain distinct; shared and empty filters work', () => {
  const items = [cycle(1, 1), cycle(2, 1, { recurringSettlementId: 20 }), shared(3)];
  assert.equal(build(items).length, 3);
  assert.deepEqual(build(items, { type: 'SHARED' }).map(g => g.key), ['settlement-3']);
  assert.equal(build(items, { keyword: 'missing' }).length, 0);
  assert.equal(build([], {}).length, 0);
});

test('grouping does not mutate the API array or its objects', () => {
  const items = Object.freeze([Object.freeze(cycle(2, 2)), Object.freeze(cycle(1, 1))]);
  build(items);
  assert.deepEqual(items.map(item => item.settlementId), [2, 1]);
});
