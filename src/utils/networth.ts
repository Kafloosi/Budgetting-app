import { Account, Transaction } from '../types';
import { monthKey } from './money';

export interface NetWorthPoint {
  month: string;
  /** Combined balance of every account at the end of that month */
  cents: number;
}

/**
 * Premium: total account balance at the end of each month, so the direction
 * of travel is visible rather than just today's number.
 *
 * Transfers are ignored on purpose — moving money between two of your own
 * accounts cancels out in the total, so including them would only risk
 * double-counting. Entries with no account don't touch any balance, exactly
 * as they don't on the Home tab.
 */
export function netWorthSeries(
  accounts: Account[],
  transactions: Transaction[],
  months: string[],
): NetWorthPoint[] {
  if (accounts.length === 0 || months.length === 0) return [];

  const known = new Set(accounts.map((a) => a.id));
  const opening = accounts.reduce((sum, a) => sum + a.openingCents, 0);

  // Net movement per month, then a running total — one pass over history
  // rather than re-scanning every entry once per month shown.
  const delta = new Map<string, number>();
  for (const t of transactions) {
    if (!t.accountId || !known.has(t.accountId)) continue;
    const m = monthKey(t.date);
    delta.set(m, (delta.get(m) ?? 0) + (t.type === 'income' ? t.amountCents : -t.amountCents));
  }

  // Everything before the window still counts towards the opening balance
  const first = months[0];
  let running = opening;
  for (const [m, cents] of delta) {
    if (m < first) running += cents;
  }

  return months.map((month) => {
    running += delta.get(month) ?? 0;
    return { month, cents: running };
  });
}
