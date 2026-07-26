import { Transaction } from '../types';
import { daysInMonth, monthKey, todayIso } from './money';

export interface CalendarDay {
  /** yyyy-mm-dd */
  date: string;
  dayOfMonth: number;
  expenseCents: number;
  isToday: boolean;
  /** Later than today — nothing can have been spent yet */
  isFuture: boolean;
}

export interface MonthCalendar {
  days: CalendarDay[];
  /** Empty cells before the 1st, so the grid lines up under Mon–Sun */
  leadingBlanks: number;
  /** Heaviest day of the month, the shading reference */
  maxCents: number;
}

export const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * A month's spending laid out as a calendar grid. Daily totals make patterns
 * obvious — weekend spikes, the day the rent leaves — that a chronological
 * list flattens out.
 */
export function monthCalendar(transactions: Transaction[], month: string): MonthCalendar {
  const spend = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== 'expense' || monthKey(t.date) !== month) continue;
    spend.set(t.date, (spend.get(t.date) ?? 0) + t.amountCents);
  }

  const today = todayIso();
  const total = daysInMonth(month);
  const days: CalendarDay[] = Array.from({ length: total }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, '0')}`;
    return {
      date,
      dayOfMonth: i + 1,
      expenseCents: spend.get(date) ?? 0,
      isToday: date === today,
      isFuture: date > today,
    };
  });

  const [year, monthNumber] = month.split('-').map(Number);
  const firstWeekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  return {
    days,
    leadingBlanks: (firstWeekday + 6) % 7, // shift Sunday-first to Monday-first
    maxCents: Math.max(0, ...days.map((d) => d.expenseCents)),
  };
}
