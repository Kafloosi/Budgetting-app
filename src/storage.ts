import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Person, SettlementRecord, Transaction, TrashedItem } from './types';
import { catchUp } from './utils/catchup';
import { todayIso } from './utils/money';
import { categoryById } from './categories';
import {
  readReceiptPayload,
  reconcileReceipts,
  restoreReceiptPayload,
} from './utils/receipts';
import { personColors } from './theme';

const STORAGE_KEY = 'budget-app-state-v1';
const BACKUP_APP_TAG = 'budgetting-app';
const BACKUP_VERSION = 2;

export const emptyState: AppState = {
  people: [],
  accounts: [],
  accountTransfers: [],
  transactions: [],
  settlements: [],
  recurring: [],
  templates: [],
  customCategories: [],
  budgets: {},
  personBudgets: {},
  tagBudgets: {},
  goals: [],
  budgetAlertLog: {},
  trash: [],
  settings: {
    themeMode: 'auto',
    onboarded: false,
    currencyCode: 'EUR',
    appLock: false,
    budgetAlerts: false,
    settleReminder: false,
    weeklyDigest: false,
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
    accounts: parsed.accounts ?? [],
    accountTransfers: parsed.accountTransfers ?? [],
    transactions: parsed.transactions ?? [],
    settlements,
    recurring: parsed.recurring ?? [],
    templates: parsed.templates ?? [],
    budgets: parsed.budgets ?? {},
    // Added after launch: old installs simply have no per-person or tag
    // limits and nothing in the trash, which is exactly the right default.
    personBudgets: parsed.personBudgets ?? {},
    tagBudgets: parsed.tagBudgets ?? {},
    // Trash predates the discriminated union, when it only held entries.
    trash: (parsed.trash ?? []).map((e) => {
      const legacy = e as Partial<TrashedItem> & { transaction?: Transaction };
      return (
        legacy.kind
          ? legacy
          : { kind: 'transaction', deletedAt: legacy.deletedAt ?? '', transaction: legacy.transaction }
      ) as TrashedItem;
    }),
    // Categories gained colors and subcategories; old emoji-based custom
    // ones keep working by taking a color from the shared palette.
    customCategories: (parsed.customCategories ?? []).map((c, i) => ({
      ...c,
      color: c.color ?? personColors[i % personColors.length],
    })),
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
      weeklyDigest: parsed.settings?.weeklyDigest ?? false,
      budgetRolloverFrom: parsed.settings?.budgetRolloverFrom,
      lastSeenVersion: parsed.settings?.lastSeenVersion,
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

/**
 * Erase everything this app stored: the state blob and every receipt file.
 * Nothing is kept elsewhere — there is no account, no server copy, and no
 * analytics — so after this the app holds nothing about the user.
 */
export async function wipeAllData(): Promise<void> {
  // An empty reference list means every stored receipt is unreferenced
  await reconcileReceipts([]).catch(() => {});
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored yet.
  }
}

export async function saveState(state: AppState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Persisting is best-effort; the in-memory state stays authoritative.
  }
}

// ---- Backups (owned here so the persistence schema has a single owner) ----

/**
 * Serialize a backup. With `includePhotos` the receipt images travel with it
 * (base64), so restoring on a new phone is complete rather than leaving
 * entries pointing at photos that no longer exist.
 */
export async function serializeBackup(
  state: AppState,
  includePhotos: boolean,
): Promise<string> {
  const receipts = includePhotos ? await readReceiptPayload(state.transactions) : undefined;
  // Not pretty-printed: a photo-bearing backup is mostly base64, where
  // indentation costs real memory for no readability gain.
  return JSON.stringify({
    app: BACKUP_APP_TAG,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    state,
    receipts,
  });
}

/** Roughly how large a photo-bearing backup will be, in bytes */
export function estimateBackupBytes(state: AppState, includePhotos: boolean): number {
  const base = JSON.stringify(state).length;
  if (!includePhotos) return base;
  // base64 inflates by ~4/3; photos dominate everything else
  const photos = state.transactions.filter((t) => t.photoUri).length;
  return base + photos * 500_000 * 1.37;
}

/**
 * Parse backup text into a caught-up AppState. Returns null when invalid.
 *
 * The Pro unlock is deliberately NOT taken from the file: a backup is a
 * plain JSON document, so honouring its `premium` flag would let anyone
 * hand out Pro by sharing an edited export. Restoring on a new phone goes
 * through the purchase or an unlock code instead.
 */
export async function parseBackup(
  text: string,
  currentPremium: boolean,
): Promise<AppState | null> {
  try {
    const parsed = JSON.parse(text);
    // Accept both the export envelope and a raw state object
    const raw: Partial<AppState> = parsed?.state ?? parsed;
    if (!Array.isArray(raw?.people) || !Array.isArray(raw?.transactions)) {
      return null;
    }
    const migrated = migrate(raw);

    // Restore bundled photos and re-point entries at their new locations
    let transactions = migrated.transactions;
    const receipts: Record<string, string> | undefined = parsed?.receipts;
    if (receipts && Object.keys(receipts).length > 0) {
      const restored = await restoreReceiptPayload(receipts);
      transactions = transactions.map((t) => {
        const name = t.photoUri?.split('/').pop();
        const uri = name ? restored[name] : undefined;
        return uri ? { ...t, photoUri: uri } : { ...t, photoUri: undefined };
      });
    }

    return catchUp({
      ...migrated,
      transactions,
      settings: { ...migrated.settings, premium: currentPremium },
    });
  } catch {
    return null;
  }
}

export function transactionsToCsv(state: AppState): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const personName = new Map(state.people.map((p) => [p.id, p.name]));
  const lines = ['date,type,person,category,tags,note,amount,shared'];
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
        esc((t.tags ?? []).join(' ')),
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
