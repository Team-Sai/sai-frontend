import type { SettlementListItem } from '../types/settlement';

export interface SettlementListGroup {
  key: string;
  recurringId?: number;
  latest: SettlementListItem;
  items: SettlementListItem[];
  totalCount: number;
}

interface ListOptions {
  keyword: string;
  type: string;
  status: string;
  sort: string;
}

// Pick one ordering basis for the whole group so mixed legacy data stays consistent.
function orderCycles(items: SettlementListItem[]): SettlementListItem[] {
  const byId = (a: SettlementListItem, b: SettlementListItem) => a.settlementId - b.settlementId;
  if (items.every(item => item.cycleDate)) {
    return items.sort((a, b) => a.cycleDate!.localeCompare(b.cycleDate!) || byId(a, b));
  }
  if (items.every(item => item.cycleNo != null)) {
    return items.sort((a, b) => a.cycleNo! - b.cycleNo! || byId(a, b));
  }
  return items.sort(byId);
}

export function buildSettlementGroups(items: SettlementListItem[], options: ListOptions): SettlementListGroup[] {
  const groups = new Map<string, SettlementListGroup>();
  for (const item of items) {
    const recurringId = item.settlementType === 'RECURRING' ? item.recurringSettlementId : null;
    const key = recurringId == null ? `settlement-${item.settlementId}` : `recurring-${recurringId}`;
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
      existing.totalCount++;
    } else {
      groups.set(key, { key, recurringId: recurringId ?? undefined, latest: item, items: [item], totalCount: 1 });
    }
  }

  const keyword = options.keyword.toLowerCase();
  const result: SettlementListGroup[] = [];
  for (const group of groups.values()) {
    orderCycles(group.items);
    group.latest = group.items[group.items.length - 1];
    const visible = group.items.filter(item =>
      (!keyword || (item.title || '').toLowerCase().includes(keyword))
      && (options.type === 'ALL' || item.settlementType === options.type)
      && (options.status === 'ALL' || item.settlementStatus === options.status));
    if (visible.length) {
      result.push({ ...group, items: visible });
    }
  }

  const deadline = (item: SettlementListItem) => item.settlementType === 'RECURRING'
    ? item.cycleDate || item.startDate || item.endDate || '' : item.dueDate || '';
  return result.sort((a, b) => {
    if (options.sort === 'AMOUNT_DESC') {
      const byAmount = Number(b.latest.totalAmount || 0) - Number(a.latest.totalAmount || 0);
      if (byAmount) return byAmount;
    }
    if (options.sort === 'DEADLINE') {
      const aDate = deadline(a.latest);
      const bDate = deadline(b.latest);
      if (!aDate && bDate) return 1;
      if (aDate && !bDate) return -1;
      const byDate = aDate.localeCompare(bDate);
      if (byDate) return byDate;
    }
    // Group position changes when the batch appends a newly created cycle.
    return b.latest.settlementId - a.latest.settlementId;
  });
}
