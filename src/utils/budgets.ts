import { AppSettings, AppState } from '../types';
import { expenseCentsByCategoryPerPeriod } from './aggregate';
import { monthsBetween, shiftMonth } from './money';
import { tagCentsPerPeriod } from './tags';

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
 * The envelope rule itself, stated once: for each budgeted key, what was
 * unspent in earlier months carries in, what was overspent comes off, and the
 * result never drops below zero.
 *
 * Category budgets and tag budgets differ only in what they are keyed by and
 * how spending is looked up, so they pass those in rather than restating the
 * arithmetic — the single most load-bearing money rule in the app is not one
 * to keep in two places.
 */
function applyCarryOver(
  limits: Record<string, number>,
  months: string[],
  spentIn: (key: string, month: string) => number,
): Map<string, EffectiveBudget> {
  const result = new Map<string, EffectiveBudget>();
  const past = months.slice(0, -1);
  const current = months[months.length - 1];
  for (const key of Object.keys(limits)) {
    // Only today's limit is stored, so past months are measured against it
    const baseCents = limits[key];
    const carryCents = past.reduce(
      (carry, m) => carry + baseCents - spentIn(key, m),
      0,
    );
    result.set(key, {
      baseCents,
      carryCents,
      limitCents: Math.max(0, baseCents + carryCents),
      spentCents: spentIn(key, current),
    });
  }
  return result;
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
  /**
   * Set when `transactions` has already been narrowed to that person, so the
   * same filter is not applied twice — `personId` then only selects which
   * limits apply.
   */
  preFiltered = false,
): Map<string, EffectiveBudget> {
  const own = personId ? personBudgets?.[personId] ?? {} : {};
  const limits = personId ? { ...budgets, ...own } : budgets;
  if (Object.keys(limits).length === 0) return new Map();

  const months = rolloverWindow(month, settings.budgetRolloverFrom);
  const spend = expenseCentsByCategoryPerPeriod(
    personId && !preFiltered
      ? transactions.filter((t) => t.personId === personId)
      : transactions,
    customCategories,
    'month',
    months,
  );
  return applyCarryOver(limits, months, (id, m) => spend.get(m)?.get(id) ?? 0);
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
  if (Object.keys(tagBudgets).length === 0) return new Map();

  const months = rolloverWindow(month, settings.budgetRolloverFrom);
  const spend = tagCentsPerPeriod(
    personId ? transactions.filter((t) => t.personId === personId) : transactions,
    'month',
    months,
    Object.keys(tagBudgets),
  );
  return applyCarryOver(tagBudgets, months, (tag, m) => spend.get(m)?.get(tag) ?? 0);
}
