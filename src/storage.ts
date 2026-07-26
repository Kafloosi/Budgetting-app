import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Person, SettlementRecord } from './types';
import { catchUp } from './utils/catchup';
import { todayIso } from './utils/money';
import { categoryById } from './categories';

const STORAGE_KEY = 'budget-app-state-v1';
const BACKUP_APP_TAG = 'budgetting-app';
const BACKUP_VERSION = 2;

export const emptyState: AppState = {
  people: [],
  transactions: [],
  settlements: [],
  recurring: [],
  customCategories: [],
  budgets: {},
  goals: [],
  budgetAlertLog: {},
  settings: {
    themeMode: 'auto',
    onboarded: false,
    currencyCode: 'EUR',
    appLock: false,
    budgetAlerts: false,
    settleReminder: false,
    premium: false,
  },
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
    recurring: parsed.recurring ?? [],
    customCategories: parsed.customCategories ?? [],
    budgets: parsed.budgets ?? {},
    goals: parsed.goals ?? [],
    budgetAlertLog: parsed.budgetAlertLog ?? {},
    settings: {
      themeMode: parsed.settings?.themeMode ?? 'auto',
      // Existing installs that already have people skip onboarding
      onboarded: parsed.settings?.onboarded ?? people.length > 0,
      currencyCode: parsed.settings?.currencyCode ?? 'EUR',
      appLock: parsed.settings?.appLock ?? false,
      budgetAlerts: parsed.settings?.budgetAlerts ?? false,
      settleReminder: parsed.settings?.settleReminder ?? false,
      premium: parsed.settings?.premium ?? false,
    },
  };
}

async function readStoredState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    return migrate(JSON.parse(raw) as Partial<AppState>);
  } catch {
    return emptyState;
  }
}

/**
 * Read state exactly as stored (schema-migrated only). For consumers that
 * cannot write back — notably the headless widget task — since advancing the
 * clock without persisting it would make surfaces disagree.
 */
export async function readState(): Promise<AppState> {
  return readStoredState();
}

/** Read state and advance it to now. Used by the app, which persists it. */
export async function loadState(): Promise<AppState> {
  return catchUp(await readStoredState());
}

export async function saveState(state: AppState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Persisting is best-effort; the in-memory state stays authoritative.
  }
}

// ---- Backups (owned here so the persistence schema has a single owner) ----

export function serializeBackup(state: AppState): string {
  return JSON.stringify(
    {
      app: BACKUP_APP_TAG,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      state,
    },
    null,
    2,
  );
}

/** Parse backup text into a caught-up AppState. Returns null when invalid. */
export function parseBackup(text: string): AppState | null {
  try {
    const parsed = JSON.parse(text);
    // Accept both the export envelope and a raw state object
    const raw: Partial<AppState> = parsed?.state ?? parsed;
    if (!Array.isArray(raw?.people) || !Array.isArray(raw?.transactions)) {
      return null;
    }
    return catchUp(migrate(raw));
  } catch {
    return null;
  }
}

export function transactionsToCsv(state: AppState): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const personName = new Map(state.people.map((p) => [p.id, p.name]));
  const lines = ['date,type,person,category,note,amount,shared'];
  const sorted = [...state.transactions].sort((a, b) => a.date.localeCompare(b.date));
  for (const t of sorted) {
    const category =
      t.type === 'expense'
        ? categoryById(state.customCategories, t.categoryId).name
        : '';
    lines.push(
      [
        t.date,
        t.type,
        esc(personName.get(t.personId) ?? ''),
        esc(category),
        esc(t.note),
        (t.amountCents / 100).toFixed(2),
        t.shared ? 'yes' : 'no',
      ].join(','),
    );
  }
  return lines.join('\n');
}

export function backupFilename(): string {
  return `budget-backup-${todayIso()}.json`;
}

export function csvFilename(): string {
  return `budget-entries-${todayIso()}.csv`;
}
