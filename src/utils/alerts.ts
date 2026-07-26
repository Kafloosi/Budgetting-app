import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AppState, BudgetAlertLog } from '../types';
import { allCategories, categoryById, OTHER_CATEGORY_ID } from '../categories';
import { currentMonthKey, formatCents, monthKey } from './money';

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

  // Only the id is needed while scanning; resolve full categories lazily below
  const validIds = new Set(allCategories(state.customCategories).map((c) => c.id));
  const spentByCategory = new Map<string, number>();
  for (const t of state.transactions) {
    if (t.type !== 'expense' || monthKey(t.date) !== month) continue;
    const id =
      t.categoryId && validIds.has(t.categoryId) ? t.categoryId : OTHER_CATEGORY_ID;
    spentByCategory.set(id, (spentByCategory.get(id) ?? 0) + t.amountCents);
  }

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

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

let channelReady = false;

export async function sendBudgetNotifications(alerts: DueBudgetAlert[]): Promise<void> {
  try {
    if (Platform.OS === 'android' && !channelReady) {
      await Notifications.setNotificationChannelAsync('budget', {
        name: 'Budget alerts',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
      channelReady = true;
    }
    for (const alert of alerts) {
      await Notifications.scheduleNotificationAsync({
        content: { title: alert.title, body: alert.body },
        trigger: null, // deliver immediately
      });
    }
  } catch {
    // Notifications are best-effort; never block the app on them.
  }
}
