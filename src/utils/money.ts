import { IncomeFrequency, PeriodType } from '../types';

export interface Currency {
  code: string;
  symbol: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'EUR', symbol: '€' },
  { code: 'USD', symbol: '$' },
  { code: 'GBP', symbol: '£' },
  { code: 'CHF', symbol: 'CHF' },
  { code: 'SEK', symbol: 'kr' },
  { code: 'NOK', symbol: 'kr' },
  { code: 'DKK', symbol: 'kr' },
  { code: 'PLN', symbol: 'zł' },
];

// The active currency symbol, set from settings by the app provider so the
// many formatCents call sites don't all need the settings threaded through.
// Trade-off: formatted strings must not be cached across renders (e.g. in
// React.memo'd rows), or they would go stale when the user switches currency.
let activeSymbol = '€';

export function setActiveCurrency(code: string): void {
  activeSymbol = CURRENCIES.find((c) => c.code === code)?.symbol ?? '€';
}

export function currencySymbol(): string {
  return activeSymbol;
}

export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, '0');
  // Thousands separator (dot, European style)
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const symbol = activeSymbol.length > 1 ? `${activeSymbol} ` : activeSymbol;
  return `${sign}${symbol}${wholeStr},${rest}`;
}

/** Parse user input like "12,50", "12.50" or "12" into cents. Returns null when invalid. */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, '').replace(',', '.');
  if (!cleaned || !/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const value = Math.round(parseFloat(cleaned) * 100);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

/** Inverse of parseAmountToCents: cents as an editable input string ("12,50") */
export function centsToInput(cents: number): string {
  return cents > 0 ? String(cents / 100).replace('.', ',') : '';
}

export const FREQUENCY_LABEL: Record<IncomeFrequency, string> = {
  weekly: 'week',
  biweekly: '2 weeks',
  monthly: 'month',
};

export const FREQUENCY_OPTIONS: { value: IncomeFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

/** Normalize an income to a monthly amount so different frequencies compare fairly */
export function monthlyIncomeCents(
  incomeCents: number,
  frequency: IncomeFrequency,
): number {
  switch (frequency) {
    case 'weekly':
      return Math.round((incomeCents * 52) / 12);
    case 'biweekly':
      return Math.round((incomeCents * 26) / 12);
    case 'monthly':
      return incomeCents;
  }
}

export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatMonth(key: string): string {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

// ---- ISO weeks (keys look like 2026-W30 and sort correctly as strings) ----

export function isoWeekKey(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNum = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // Thursday decides the ISO year
  const isoYear = date.getUTCFullYear();
  const jan1 = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((date.getTime() - jan1.getTime()) / 86400000 + 1) / 7);
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

export function currentWeekKey(): string {
  return isoWeekKey(todayIso());
}

/** Monday of the given ISO week */
function mondayOfWeek(key: string): Date {
  const [yearStr, weekStr] = key.split('-W');
  const year = Number(yearStr);
  const week = Number(weekStr);
  // January 4th is always in ISO week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
  mondayWeek1.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
  return mondayWeek1;
}

export function shiftWeek(key: string, delta: number): string {
  const monday = mondayOfWeek(key);
  monday.setUTCDate(monday.getUTCDate() + delta * 7);
  return isoWeekKey(monday.toISOString().slice(0, 10));
}

export function formatWeek(key: string): string {
  const [yearStr, weekStr] = key.split('-W');
  if (!yearStr || !weekStr) return key;
  const monday = mondayOfWeek(key);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const range = `${monday.getUTCDate()} ${MONTH_NAMES[monday.getUTCMonth()].slice(0, 3)} – ${sunday.getUTCDate()} ${MONTH_NAMES[sunday.getUTCMonth()].slice(0, 3)}`;
  return `Week ${Number(weekStr)} · ${range} ${yearStr}`;
}

// ---- Generic period helpers (month or week) ----

export function currentPeriodKey(type: PeriodType): string {
  return type === 'month' ? currentMonthKey() : currentWeekKey();
}

export function shiftPeriod(type: PeriodType, key: string, delta: number): string {
  return type === 'month' ? shiftMonth(key, delta) : shiftWeek(key, delta);
}

export function formatPeriod(type: PeriodType, key: string): string {
  return type === 'month' ? formatMonth(key) : formatWeek(key);
}

export function periodOfDate(type: PeriodType, isoDate: string): string {
  return type === 'month' ? monthKey(isoDate) : isoWeekKey(isoDate);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** Add months keeping the day of month, clamped to the target month's length */
export function addMonthsClamped(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const firstOfTarget = new Date(Date.UTC(y, m - 1 + months, 1));
  const daysInTarget = new Date(
    Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, 0),
  ).getUTCDate();
  firstOfTarget.setUTCDate(Math.min(d, daysInTarget));
  return firstOfTarget.toISOString().slice(0, 10);
}

export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return `${d} ${MONTH_NAMES[m - 1].slice(0, 3)}`;
}

export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
