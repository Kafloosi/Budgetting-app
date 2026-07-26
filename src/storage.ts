import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from './types';

const STORAGE_KEY = 'budget-app-state-v1';

export const emptyState: AppState = {
  people: [],
  transactions: [],
  settlements: [],
};

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      people: parsed.people ?? [],
      transactions: parsed.transactions ?? [],
      settlements: parsed.settlements ?? [],
    };
  } catch {
    return emptyState;
  }
}

export async function saveState(state: AppState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Persisting is best-effort; the in-memory state stays authoritative.
  }
}
