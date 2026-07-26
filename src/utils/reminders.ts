import { cancelNotification, scheduleNotification } from './notifications';

const REMINDER_ID = 'settle-reminder';

/** When the next settle-up reminder should fire: the 1st of next month, 18:00 */
export function nextSettleReminderDate(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 18, 0, 0);
}

/**
 * Keep the monthly settle-up reminder in sync with the setting. Scheduled as
 * a one-shot and re-armed on every app launch, which is more reliable across
 * platforms than repeating calendar triggers. Pass the fully resolved
 * condition — the caller decides whether reminders make sense at all.
 */
export async function syncSettleReminder(enabled: boolean): Promise<void> {
  if (!enabled) {
    await cancelNotification(REMINDER_ID);
    return;
  }
  // Re-scheduling with the same identifier replaces the pending one
  await scheduleNotification({
    identifier: REMINDER_ID,
    title: 'Time to settle up 💸',
    body: 'A new month started — open the Split tab to settle last month’s shared expenses.',
    date: nextSettleReminderDate(),
  });
}
