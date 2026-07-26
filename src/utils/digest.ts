import { Transaction } from '../types';
import { currentWeekKey, formatCents, isoWeekKey, shiftWeek } from './money';

export interface WeekDigest {
  spentCents: number;
  previousSpentCents: number;
  /** Percentage change vs last week; null when last week had no spending */
  changePercent: number | null;
  entryCount: number;
}

function weekSpend(transactions: Transaction[], week: string): { cents: number; count: number } {
  let cents = 0;
  let count = 0;
  for (const t of transactions) {
    if (t.type !== 'expense' || isoWeekKey(t.date) !== week) continue;
    cents += t.amountCents;
    count += 1;
  }
  return { cents, count };
}

export function weekDigest(
  transactions: Transaction[],
  week = currentWeekKey(),
): WeekDigest {
  const current = weekSpend(transactions, week);
  const previous = weekSpend(transactions, shiftWeek(week, -1));
  return {
    spentCents: current.cents,
    previousSpentCents: previous.cents,
    changePercent:
      previous.cents > 0
        ? Math.round(((current.cents - previous.cents) / previous.cents) * 100)
        : null,
    entryCount: current.count,
  };
}

/**
 * The notification body for the weekly digest. Stored data only changes
 * while the app is open, so a summary computed at scheduling time is still
 * accurate when the notification fires.
 */
export function weekDigestMessage(digest: WeekDigest): string {
  if (digest.entryCount === 0) {
    return 'No expenses logged this week. Open Budgetting to catch up.';
  }
  const spent = `${formatCents(digest.spentCents)} across ${digest.entryCount} ${
    digest.entryCount === 1 ? 'entry' : 'entries'
  }`;
  if (digest.changePercent === null) return `You spent ${spent} this week.`;
  if (digest.changePercent === 0) return `You spent ${spent} — same as last week.`;
  const direction = digest.changePercent > 0 ? 'more' : 'less';
  return `You spent ${spent} — ${Math.abs(digest.changePercent)}% ${direction} than last week.`;
}
