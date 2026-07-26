import { cancelNotification, scheduleNotification } from './notifications';

const REMINDER_ID = 'settle-reminder';
const DIGEST_ID = 'weekly-digest';

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
    title: 'Time to settle up',
    body: 'A new month started — open the Split tab to settle last month’s shared expenses.',
    date: nextSettleReminderDate(),
  });
}

/** The coming Sunday at 18:00 (or next Sunday if it is already past) */
export function nextDigestDate(now = new Date()): Date {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0);
  const daysUntilSunday = (7 - date.getDay()) % 7;
  date.setDate(date.getDate() + daysUntilSunday);
  if (date <= now) date.setDate(date.getDate() + 7);
  return date;
}

/**
 * Weekly spending digest, re-armed whenever state is saved so the summary it
 * carries stays in step with the data.
 */
export async function syncWeeklyDigest(enabled: boolean, body: string): Promise<void> {
  if (!enabled) {
    await cancelNotification(DIGEST_ID);
    return;
  }
  await scheduleNotification({
    identifier: DIGEST_ID,
    title: 'Your week in review',
    body,
    date: nextDigestDate(),
  });
}
