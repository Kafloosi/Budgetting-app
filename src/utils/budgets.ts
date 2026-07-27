import { AppSettings, AppState } from '../types';
import { expenseCentsByCategoryPerPeriod } from './aggregate';
import { monthKey as monthOf, monthsBetween, shiftMonth } from './money';

/**
 * Budgets, with optional carry-over between months.
 *
 * Without rollover a budget is a fresh allowance every month. With it, what
 * you didn't spend is added to next month and what you overspent is taken
 * off it, which is how envelope budgeting stays honest: an expensive month
 * has to be paid back rather than forgotten on the 1st.
 *
 * Two deliberate bounds. Carry only accumulates from the month the user
 * switched rollover on (`budgetRolloverFrom`), so enabling it never
 * back-dates a windfall from months they never budgeted. And it looks back
 * at most a year, so one bad month a long time ago cannot haunt a budget
 * forever.
 */
export const ROLLOVER_LOOKBACK_MONTHS = 12;

export interface EffectiveBudget {
  /** The limit as configured in Settings */
  baseCents: number;
  /** Carried in from previous months: positive saved, negative overspent */
  carryCents: number;
  /** What is actually available this month, never below zero */
  limitCents: number;
  spentCents: number;
}

/**
 * Only what the calculation reads. Narrower than AppState on purpose: it
 * lets callers memoize on these four inputs instead of the whole state,
 * which otherwise re-scans a year of history on every unrelated change.
 */
type BudgetInput = Pick<AppState, 'transactions' | 'customCategories' | 'budgets'> & {
  /** Optional so callers predating per-person limits keep working unchanged */
  personBudgets?: AppState['personBudgets'];
  settings: Pick<AppSettings, 'budgetRolloverFrom'>;
};

/** Months whose spending affects `month`, oldest first, `month` included */
function rolloverWindow(month: string, from: string | undefined): string[] {
  if (!from || from > month) return [month];
  const span = Math.min(monthsBetween(from, month), ROLLOVER_LOOKBACK_MONTHS);
  return Array.from({ length: span + 1 }, (_, i) => shiftMonth(month, i - span));
}

/**
 * Every budgeted category's state for one month. Returned as a map so the
 * meters, the alerts, and the forecast all read the same numbers — a budget
 * shown as €450 on Home must be the same €450 that triggers a notification.
 */
export function effectiveBudgets(
  { transactions, customCategories, budgets, personBudgets, settings }: BudgetInput,
  month: string,
  /**
   * Whose budget this is. Omitted means the household: every person's
   * spending counts against the shared limit. Given a person, only their
   * entries count, and any limit they set for themselves replaces the
   * household one for that category.
   */
  personId?: string,
): Map<string, EffectiveBudget> {
  const result = new Map<string, EffectiveBudget>();
  const own = personId ? personBudgets?.[personId] ?? {} : {};
  const limits = personId ? { ...budgets, ...own } : budgets;
  const ids = Object.keys(limits);
  if (ids.length === 0) return result;

  const months = rolloverWindow(month, settings.budgetRolloverFrom);
  const spend = expenseCentsByCategoryPerPeriod(
    personId ? transactions.filter((t) => t.personId === personId) : transactions,
    customCategories,
    'month',
    months,
  );
  const past = months.slice(0, -1);

  for (const id of ids) {
    // Only today's limit is stored, so past months are measured against it
    const baseCents = limits[id];
    const carryCents = past.reduce(
      (carry, m) => carry + baseCents - (spend.get(m)?.get(id) ?? 0),
      0,
    );
    result.set(id, {
      baseCents,
      carryCents,
      limitCents: Math.max(0, baseCents + carryCents),
      spentCents: spend.get(month)?.get(id) ?? 0,
    });
  }
  return result;
}


/**
 * The same calculation for tag budgets. Tags overlap — an entry counts
 * towards every tag it carries — so these are deliberately not summed with
 * category budgets anywhere; they are a second, independent view of the same
 * spending, which is why a project can be capped without disturbing the
 * category limits it spends through.
 *
 * Carry-over follows the same rule as categories so the two behave alike.
 */
export function effectiveTagBudgets(
  {
    transactions,
    tagBudgets,
    settings,
  }: Pick<AppState, 'transactions' | 'tagBudgets'> & {
    settings: Pick<AppSettings, 'budgetRolloverFrom'>;
  },
  month: string,
  personId?: string,
): Map<string, EffectiveBudget> {
  const result = new Map<string, EffectiveBudget>();
  const tags = Object.keys(tagBudgets);
  if (tags.length === 0) return result;

  const months = rolloverWindow(month, settings.budgetRolloverFrom);
  const window = new Set(months);
  const scoped = personId
    ? transactions.filter((t) => t.personId === personId)
    : transactions;

  // tag -> month -> cents, in one pass over history
  const spend = new Map<string, Map<string, number>>();
  for (const t of scoped) {
    if (t.type !== 'expense' || !t.tags?.length) continue;
    const m = monthOf(t.date);
    if (!window.has(m)) continue;
    for (const tag of t.tags) {
      if (!(tag in tagBudgets)) continue;
      let byMonth = spend.get(tag);
      if (!byMonth) spend.set(tag, (byMonth = new Map()));
      byMonth.set(m, (byMonth.get(m) ?? 0) + t.amountCents);
    }
  }

  const past = months.slice(0, -1);
  for (const tag of tags) {
    const baseCents = tagBudgets[tag];
    const byMonth = spend.get(tag);
    const carryCents = past.reduce(
      (carry, m) => carry + baseCents - (byMonth?.get(m) ?? 0),
      0,
    );
    result.set(tag, {
      baseCents,
      carryCents,
      limitCents: Math.max(0, baseCents + carryCents),
      spentCents: byMonth?.get(month) ?? 0,
    });
  }
  return result;
}
