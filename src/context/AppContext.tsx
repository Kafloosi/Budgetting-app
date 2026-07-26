import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState as RNAppState, useColorScheme } from 'react-native';
import {
  AppState,
  Category,
  Goal,
  IncomeFrequency,
  Person,
  RecurringRule,
  SettlementRecord,
  Transaction,
} from '../types';
import { emptyState, loadState, saveState, wipeAllData } from '../storage';
import {
  allCategories,
  FREE_CUSTOM_CATEGORY_LIMIT,
  OTHER_CATEGORY_ID,
} from '../categories';
import { makeId, setActiveCurrency } from '../utils/money';
import { catchUp } from '../utils/catchup';
import { dueBudgetAlerts, pruneAlertLog, sendBudgetNotifications } from '../utils/alerts';
import { reconcileReceipts } from '../utils/receipts';
import { syncSettleReminder, syncWeeklyDigest } from '../utils/reminders';
import { weekDigest, weekDigestMessage } from '../utils/digest';
import { isUnlocked, PremiumFeature } from '../utils/premium';
import { refreshWidget } from '../utils/widget';
import {
  darkColors,
  lightColors,
  personColors,
  ThemeColors,
  ThemeMode,
} from '../theme';

interface NewPerson {
  name: string;
  incomeCents: number;
  incomeFrequency: IncomeFrequency;
}

interface AppContextValue {
  state: AppState;
  loaded: boolean;
  addPerson: (person: NewPerson) => void;
  updatePerson: (id: string, patch: Partial<Omit<Person, 'id'>>) => void;
  removePerson: (id: string) => void;
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, 'id'>>) => void;
  removeTransaction: (id: string) => void;
  addRecurring: (rule: Omit<RecurringRule, 'id' | 'lastAppliedDate'>) => void;
  removeRecurring: (id: string, deleteTransactions: boolean) => void;
  addCategory: (name: string, parentId?: string) => boolean;
  removeCategory: (id: string) => void;
  setBudget: (categoryId: string, limitCents: number | null) => void;
  addSettlement: (s: Omit<SettlementRecord, 'id' | 'createdAt'>) => void;
  removeSettlement: (id: string) => void;
  toggleSettlementPaid: (id: string) => void;
  addGoal: (goal: Omit<Goal, 'id' | 'savedCents'>) => void;
  removeGoal: (id: string) => void;
  addToGoal: (id: string, cents: number) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setCurrencyCode: (code: string) => void;
  setAppLock: (enabled: boolean) => void;
  setBudgetAlerts: (enabled: boolean) => void;
  setSettleReminder: (enabled: boolean) => void;
  setWeeklyDigest: (enabled: boolean) => void;
  setPremium: (unlocked: boolean) => void;
  completeOnboarding: () => void;
  /** Replace the whole state (used by backup import) */
  replaceState: (next: AppState) => void;
  /** Erase every stored trace of the user's data */
  eraseAllData: () => Promise<void>;
  /** Last deleted entry, offered for undo by the snackbar */
  undoableTransaction: Transaction | null;
  undoRemoveTransaction: () => void;
  dismissUndo: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [undoableTransaction, setUndoableTransaction] = useState<Transaction | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    // loadState returns normalized state (migrated + recurring applied)
    loadState().then((persisted) => {
      setState(persisted);
      loadedRef.current = true;
      setLoaded(true);
      // Sweep receipt photos that no transaction references anymore
      reconcileReceipts(persisted.transactions);
    });
  }, []);

  // Advance recurring entries and goal auto-contributions when the app
  // returns to the foreground
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (status) => {
      if (status === 'active' && loadedRef.current) setState(catchUp);
    });
    return () => sub.remove();
  }, []);

  // Keep the monthly settle-up reminder scheduled (re-armed on every launch).
  // Reminders only make sense with people to settle with, and the toggle is
  // hidden below that threshold — so the scheduler reads the same predicate.
  const wantsSettleReminder =
    state.settings.settleReminder && state.people.length > 1;
  useEffect(() => {
    if (loaded) syncSettleReminder(wantsSettleReminder);
  }, [loaded, wantsSettleReminder]);

  // The weekly digest carries real numbers, so re-arm it whenever spending
  // changes. Stored data only moves while the app is open, so the summary
  // scheduled here is still accurate when it fires on Sunday.
  const digestEnabled = state.settings.weeklyDigest;
  const transactions = state.transactions;
  useEffect(() => {
    if (!loaded) return;
    syncWeeklyDigest(digestEnabled, weekDigestMessage(weekDigest(transactions)));
  }, [loaded, digestEnabled, transactions]);

  useEffect(() => {
    if (!loadedRef.current) return;
    saveState(state);
    // The home-screen widget reads stored state, so refresh it whenever the
    // app writes — otherwise it lags behind by up to Android's update period.
    refreshWidget(state);
  }, [state]);

  // Fire budget notifications when a category crosses 85% / 100% of its
  // budget this month, remembering what was sent so alerts never repeat.
  // Keyed on the inputs that can change budget status — not the whole state —
  // so theme toggles etc. don't trigger a scan, and the log write (which
  // also prunes past months) doesn't re-arm the effect.
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    if (!loadedRef.current) return;
    const due = dueBudgetAlerts(stateRef.current);
    if (due.length === 0) return;
    sendBudgetNotifications(due);
    setState((s) => ({
      ...s,
      budgetAlertLog: pruneAlertLog({
        ...s.budgetAlertLog,
        ...Object.fromEntries(due.map((a) => [a.key, a.level])),
      }),
    }));
  }, [
    state.transactions,
    state.budgets,
    state.customCategories,
    state.settings.budgetAlerts,
  ]);

  // Keep the money formatter in sync with the chosen currency
  setActiveCurrency(state.settings.currencyCode);

  const addPerson = useCallback((person: NewPerson) => {
    setState((s) => ({
      ...s,
      people: [
        ...s.people,
        {
          id: makeId(),
          name: person.name.trim(),
          color: personColors[s.people.length % personColors.length],
          incomeCents: person.incomeCents,
          incomeFrequency: person.incomeFrequency,
        },
      ],
    }));
  }, []);

  const updatePerson = useCallback(
    (id: string, patch: Partial<Omit<Person, 'id'>>) => {
      setState((s) => ({
        ...s,
        people: s.people.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
    },
    [],
  );

  const removePerson = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      people: s.people.filter((p) => p.id !== id),
      transactions: s.transactions.filter((t) => t.personId !== id),
      recurring: s.recurring.filter((r) => r.personId !== id),
    }));
  }, []);

  const addTransaction = useCallback((t: Omit<Transaction, 'id'>) => {
    setState((s) => ({
      ...s,
      transactions: [{ ...t, id: makeId() }, ...s.transactions],
    }));
  }, []);

  const updateTransaction = useCallback(
    (id: string, patch: Partial<Omit<Transaction, 'id'>>) => {
      setState((s) => ({
        ...s,
        transactions: s.transactions.map((t) =>
          t.id === id ? { ...t, ...patch } : t,
        ),
      }));
    },
    [],
  );

  // Any photo file the removed entry referenced is cleaned up by the
  // reconcileReceipts sweep on next launch. The removed entry is kept
  // around briefly so the undo snackbar can restore it.
  const removeTransaction = useCallback((id: string) => {
    const removed = stateRef.current.transactions.find((t) => t.id === id) ?? null;
    setUndoableTransaction(removed);
    setState((s) => ({
      ...s,
      transactions: s.transactions.filter((t) => t.id !== id),
    }));
  }, []);

  const undoRemoveTransaction = useCallback(() => {
    const removed = undoableTransaction;
    if (!removed) return;
    setUndoableTransaction(null);
    setState((s) => ({ ...s, transactions: [removed, ...s.transactions] }));
  }, [undoableTransaction]);

  const dismissUndo = useCallback(() => setUndoableTransaction(null), []);

  const addRecurring = useCallback(
    (rule: Omit<RecurringRule, 'id' | 'lastAppliedDate'>) => {
      // Photos belong to individual entries, never to rules — strip here at
      // the boundary since a spread would smuggle the field past the type.
      const { photoUri: _photo, ...clean } = rule as typeof rule & {
        photoUri?: string;
      };
      setState((s) =>
        catchUp({
          ...s,
          recurring: [...s.recurring, { ...clean, id: makeId() }],
        }),
      );
    },
    [],
  );

  const removeRecurring = useCallback((id: string, deleteTransactions: boolean) => {
    setState((s) => ({
      ...s,
      recurring: s.recurring.filter((r) => r.id !== id),
      transactions: deleteTransactions
        ? s.transactions.filter((t) => t.recurringId !== id)
        : s.transactions,
    }));
  }, []);

  /** Returns false when the free custom-category allowance is used up */
  const addCategory = useCallback((name: string, parentId?: string): boolean => {
    const current = stateRef.current;
    if (
      !isUnlocked(current.settings, 'categories') &&
      current.customCategories.length >= FREE_CUSTOM_CATEGORY_LIMIT
    ) {
      return false;
    }
    setState((s) => ({
      ...s,
      customCategories: [
        ...s.customCategories,
        {
          id: makeId(),
          name: name.trim(),
          color: personColors[s.customCategories.length % personColors.length],
          parentId,
        },
      ],
    }));
    return true;
  }, []);

  const removeCategory = useCallback((id: string) => {
    setState((s) => {
      const { [id]: _removed, ...budgets } = s.budgets;
      return {
        ...s,
        customCategories: s.customCategories.filter(
          (c) => c.id !== id && c.parentId !== id,
        ),
        budgets,
        // Entries in the removed category fall back to "Other"
        transactions: s.transactions.map((t) =>
          t.categoryId === id ? { ...t, categoryId: undefined } : t,
        ),
      };
    });
  }, []);

  const setBudget = useCallback((categoryId: string, limitCents: number | null) => {
    setState((s) => {
      const budgets = { ...s.budgets };
      if (limitCents && limitCents > 0) budgets[categoryId] = limitCents;
      else delete budgets[categoryId];
      return { ...s, budgets };
    });
  }, []);

  const addSettlement = useCallback(
    (record: Omit<SettlementRecord, 'id' | 'createdAt'>) => {
      setState((s) => ({
        ...s,
        settlements: [
          { ...record, id: makeId(), createdAt: new Date().toISOString() },
          ...s.settlements,
        ],
      }));
    },
    [],
  );

  const removeSettlement = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      settlements: s.settlements.filter((r) => r.id !== id),
    }));
  }, []);

  const toggleSettlementPaid = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      settlements: s.settlements.map((r) =>
        r.id === id
          ? { ...r, settledAt: r.settledAt ? undefined : new Date().toISOString() }
          : r,
      ),
    }));
  }, []);

  // applyGoalAutos stamps lastAutoMonth on first sight, so auto
  // contributions start the month after the goal is created.
  const addGoal = useCallback((goal: Omit<Goal, 'id' | 'savedCents'>) => {
    setState((s) =>
      catchUp({
        ...s,
        goals: [...s.goals, { ...goal, id: makeId(), savedCents: 0 }],
      }),
    );
  }, []);

  const removeGoal = useCallback((id: string) => {
    setState((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }));
  }, []);

  const addToGoal = useCallback((id: string, cents: number) => {
    setState((s) => ({
      ...s,
      goals: s.goals.map((g) =>
        g.id === id ? { ...g, savedCents: g.savedCents + cents } : g,
      ),
    }));
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setState((s) => ({ ...s, settings: { ...s.settings, themeMode: mode } }));
  }, []);

  const setCurrencyCode = useCallback((code: string) => {
    setState((s) => ({ ...s, settings: { ...s.settings, currencyCode: code } }));
  }, []);

  const setAppLock = useCallback((enabled: boolean) => {
    setState((s) => ({ ...s, settings: { ...s.settings, appLock: enabled } }));
  }, []);

  const setBudgetAlerts = useCallback((enabled: boolean) => {
    setState((s) => ({ ...s, settings: { ...s.settings, budgetAlerts: enabled } }));
  }, []);

  const setSettleReminder = useCallback((enabled: boolean) => {
    setState((s) => ({ ...s, settings: { ...s.settings, settleReminder: enabled } }));
  }, []);

  const setWeeklyDigest = useCallback((enabled: boolean) => {
    setState((s) => ({ ...s, settings: { ...s.settings, weeklyDigest: enabled } }));
  }, []);

  const setPremium = useCallback((unlocked: boolean) => {
    setState((s) => ({ ...s, settings: { ...s.settings, premium: unlocked } }));
  }, []);

  const completeOnboarding = useCallback(() => {
    setState((s) => ({ ...s, settings: { ...s.settings, onboarded: true } }));
  }, []);

  const eraseAllData = useCallback(async () => {
    await wipeAllData();
    setState(emptyState);
  }, []);

  // Expects normalized state (from storage.parseBackup)
  const replaceState = useCallback((next: AppState) => {
    setState(next);
    reconcileReceipts(next.transactions);
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        loaded,
        addPerson,
        updatePerson,
        removePerson,
        addTransaction,
        updateTransaction,
        removeTransaction,
        addRecurring,
        removeRecurring,
        addCategory,
        removeCategory,
        setBudget,
        addSettlement,
        removeSettlement,
        toggleSettlementPaid,
        addGoal,
        removeGoal,
        addToGoal,
        setThemeMode,
        setCurrencyCode,
        setAppLock,
        setBudgetAlerts,
        setSettleReminder,
        setWeeklyDigest,
        setPremium,
        completeOnboarding,
        replaceState,
        eraseAllData,
        undoableTransaction,
        undoRemoveTransaction,
        dismissUndo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export interface Theme {
  colors: ThemeColors;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

/** Resolves the active theme from the setting + the phone's system scheme */
export function useTheme(): Theme {
  const { state, setThemeMode } = useApp();
  const systemScheme = useColorScheme();
  const mode = state.settings.themeMode;
  const isDark =
    mode === 'dark' || (mode === 'auto' && systemScheme === 'dark');
  return {
    colors: isDark ? darkColors : lightColors,
    isDark,
    mode,
    setMode: setThemeMode,
  };
}

/** Categories (defaults + custom) bound to app state, with a fast id lookup */
export function useCategories(): { all: Category[]; byId: (id?: string) => Category } {
  const { state } = useApp();
  return useMemo(() => {
    const all = allCategories(state.customCategories);
    const map = new Map(all.map((c) => [c.id, c]));
    const other = map.get(OTHER_CATEGORY_ID)!;
    return { all, byId: (id?: string) => (id && map.get(id)) || other };
  }, [state.customCategories]);
}

/** Whether a Budget Pro feature is available to this user */
export function usePremium(feature: PremiumFeature): boolean {
  const { state } = useApp();
  return isUnlocked(state.settings, feature);
}

/** Memoized person lookup by id */
export function usePeopleById(): Map<string, Person> {
  const { state } = useApp();
  return useMemo(
    () => new Map(state.people.map((p) => [p.id, p])),
    [state.people],
  );
}
