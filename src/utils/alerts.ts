import { AppState, BudgetAlertLog } from '../types';
import { categoryById } from '../categories';
import { expenseCentsByCategory } from './aggregate';
import { currentMonthKey, formatCents } from './money';
import { scheduleNotification } from './notifications';

/** Fraction of a budget at which the "almost at the limit" warning fires */
export const NEAR_THRESHOLD = 0.85;

export interface DueBudgetAlert {
  /** "yyyy-mm:categoryId" — key into the alert log */
  key: string;
  level: 'near' | 'over';
  title: string;
  body: string;
}

/**
 * Which budget notifications should fire right now, given what was already
 * sent this month (state.budgetAlertLog). Pure — no side effects.
 */
export function dueBudgetAlerts(state: AppState, month = currentMonthKey()): DueBudgetAlert[] {
  if (!state.settings.budgetAlerts) return [];

  const spentByCategory = expenseCentsByCategory(
    state.transactions,
    state.customCategories,
    'month',
    month,
  );

  const due: DueBudgetAlert[] = [];
  for (const [categoryId, limitCents] of Object.entries(state.budgets)) {
    const spent = spentByCategory.get(categoryId) ?? 0;
    const level: 'near' | 'over' | null =
      spent > limitCents ? 'over' : spent >= limitCents * NEAR_THRESHOLD ? 'near' : null;
    if (!level) continue;

    const key = `${month}:${categoryId}`;
    const alreadySent = state.budgetAlertLog[key];
    // Escalate near -> over, but never repeat the same level
    if (alreadySent === 'over' || alreadySent === level) continue;

    const over = level === 'over';
    const category = categoryById(state.customCategories, categoryId);
    const spentOfBudget = `Spent ${formatCents(spent)} of the ${formatCents(limitCents)} budget`;
    due.push({
      key,
      level,
      title: `${category.emoji} ${category.name} ${over ? 'over budget' : 'almost at its limit'}`,
      body: over
        ? `${spentOfBudget} (${formatCents(spent - limitCents)} over).`
        : `${spentOfBudget} this month.`,
    });
  }
  return due;
}

/**
 * Drop log entries for past months — dueBudgetAlerts only ever consults the
 * current month, so older keys are dead weight in storage and backups.
 */
export function pruneAlertLog(log: BudgetAlertLog, month = currentMonthKey()): BudgetAlertLog {
  const prefix = `${month}:`;
  return Object.fromEntries(
    Object.entries(log).filter(([key]) => key.startsWith(prefix)),
  );
}

export async function sendBudgetNotifications(alerts: DueBudgetAlert[]): Promise<void> {
  for (const alert of alerts) {
    await scheduleNotification({ title: alert.title, body: alert.body });
  }
}
