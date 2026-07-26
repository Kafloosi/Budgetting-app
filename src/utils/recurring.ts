import { AppState, RecurringRule, Transaction } from '../types';
import { addDays, addMonthsClamped, makeId, todayIso } from './money';

const MAX_OCCURRENCES = 1000;

/** The k-th occurrence date of a rule (k = 0 is the anchor date) */
function occurrence(rule: RecurringRule, k: number): string {
  switch (rule.frequency) {
    case 'weekly':
      return addDays(rule.anchorDate, 7 * k);
    case 'biweekly':
      return addDays(rule.anchorDate, 14 * k);
    case 'monthly':
      return addMonthsClamped(rule.anchorDate, k);
  }
}

/**
 * Index of the first occurrence that could still be pending — derived
 * arithmetically from lastAppliedDate so catching up doesn't re-walk the
 * whole history since the anchor on every app start/foreground.
 */
function firstPendingIndex(rule: RecurringRule): number {
  if (!rule.lastAppliedDate) return 0;
  const toUtc = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return { y, m, d, ms: Date.UTC(y, m - 1, d) };
  };
  const anchor = toUtc(rule.anchorDate);
  const last = toUtc(rule.lastAppliedDate);
  if (rule.frequency === 'monthly') {
    return (last.y - anchor.y) * 12 + (last.m - anchor.m) + 1;
  }
  const step = rule.frequency === 'weekly' ? 7 : 14;
  return Math.floor((last.ms - anchor.ms) / 86400000 / step) + 1;
}

/** All occurrence dates after `lastAppliedDate` (if any) up to and including today */
function pendingOccurrences(rule: RecurringRule, today: string): string[] {
  const dates: string[] = [];
  const start = Math.max(0, firstPendingIndex(rule));
  for (let k = start; k < start + MAX_OCCURRENCES; k++) {
    const date = occurrence(rule, k);
    if (date > today) break;
    if (!rule.lastAppliedDate || date > rule.lastAppliedDate) dates.push(date);
  }
  return dates;
}

/**
 * Turn every due-but-not-yet-applied occurrence of every recurring rule into
 * a real transaction. Idempotent: rules remember the last applied date.
 * Returns the same state object when nothing was due.
 */
export function applyRecurring(state: AppState, today = todayIso()): AppState {
  let changed = false;
  const newTransactions: Transaction[] = [];

  const recurring = state.recurring.map((rule) => {
    const dates = pendingOccurrences(rule, today);
    if (dates.length === 0) return rule;
    changed = true;
    for (const date of dates) {
      newTransactions.push({
        id: makeId(),
        personId: rule.personId,
        type: rule.type,
        amountCents: rule.amountCents,
        note: rule.note,
        date,
        shared: rule.shared,
        categoryId: rule.categoryId,
        tags: rule.tags,
        recurringId: rule.id,
      });
    }
    return { ...rule, lastAppliedDate: dates[dates.length - 1] };
  });

  if (!changed) return state;
  return {
    ...state,
    recurring,
    transactions: [...newTransactions, ...state.transactions],
  };
}
