import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Owns every notification delivery concern: permission, the Android channel,
 * scheduling, and cancelling. Feature modules (alerts.ts, reminders.ts) stay
 * pure policy on top of this and never touch the SDK directly.
 */
const CHANNEL_ID = 'budget';

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

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android' || channelReady) return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Budget alerts',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  channelReady = true;
}

export interface NotificationRequest {
  title: string;
  body: string;
  /** Stable id, so re-scheduling replaces instead of duplicating */
  identifier?: string;
  /** Omit to deliver immediately */
  date?: Date;
}

/** Schedule (or immediately deliver) a notification. Best-effort. */
export async function scheduleNotification(request: NotificationRequest): Promise<void> {
  try {
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      identifier: request.identifier,
      content: { title: request.title, body: request.body },
      trigger: request.date
        ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: request.date }
        : null,
    });
  } catch {
    // Notifications are best-effort; never block the app on them.
  }
}

export async function cancelNotification(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // Nothing scheduled under that id — fine.
  }
}
