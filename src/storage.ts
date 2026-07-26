import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Person, SettlementRecord } from './types';

const STORAGE_KEY = 'budget-app-state-v1';

export const emptyState: AppState = {
  people: [],
  transactions: [],
  settlements: [],
  settings: { themeMode: 'auto', onboarded: false },
};

/** Fill in fields added after the first release so old saved data keeps working */
function migrate(parsed: Partial<AppState>): AppState {
  const people: Person[] = (parsed.people ?? []).map((p) => ({
    ...p,
    incomeCents: p.incomeCents ?? 0,
    incomeFrequency: p.incomeFrequency ?? 'monthly',
  }));

  const settlements: SettlementRecord[] = (parsed.settlements ?? []).map((raw) => {
    const legacy = raw as SettlementRecord & { month?: string };
    return {
      ...legacy,
      periodType: legacy.periodType ?? 'month',
      period: legacy.period ?? legacy.month ?? '',
    };
  });

  return {
    people,
    transactions: parsed.transactions ?? [],
    settlements,
    settings: {
      themeMode: parsed.settings?.themeMode ?? 'auto',
      // Existing installs that already have people skip onboarding
      onboarded: parsed.settings?.onboarded ?? people.length > 0,
    },
  };
}

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    return migrate(JSON.parse(raw) as Partial<AppState>);
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
