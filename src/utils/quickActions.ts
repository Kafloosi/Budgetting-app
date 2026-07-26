import { Platform } from 'react-native';
import * as QuickActions from 'expo-quick-actions';

/**
 * Wraps expo-quick-actions the same way alerts.ts wraps expo-notifications,
 * so the app shell never touches the SDK directly.
 */
const ADD_ENTRY_ID = 'add-entry';

export function registerQuickActions(): void {
  QuickActions.isSupported()
    .then((supported) => {
      if (!supported) return;
      return QuickActions.setItems([
        {
          id: ADD_ENTRY_ID,
          title: 'Add entry',
          subtitle: 'Record an income or expense',
          icon: Platform.OS === 'ios' ? 'symbol:plus.circle' : undefined,
        },
      ]);
    })
    .catch(() => {});
}

/** True when the app was cold-started from the "Add entry" shortcut */
export function launchedFromAddEntry(): boolean {
  return QuickActions.initial?.id === ADD_ENTRY_ID;
}

/** Subscribe to the shortcut while the app is alive; returns an unsubscribe */
export function onAddEntryQuickAction(callback: () => void): () => void {
  const sub = QuickActions.addListener((action) => {
    if (action.id === ADD_ENTRY_ID) callback();
  });
  return () => sub.remove();
}
