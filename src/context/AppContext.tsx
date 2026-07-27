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
  AccountKind,
  AccountTransfer,
  AppState,
  EntryTemplate,
  Goal,
  IncomeFrequency,
  Person,
  RecurringRule,
  SettlementRecord,
  Transaction,
  TrashedItem,
} from '../types';
import { emptyState, loadState, saveState, wipeAllData } from '../storage';
import {
  categoryById,
  categoryIndex,
  CategoryIndex,
  FREE_CUSTOM_CATEGORY_LIMIT,
} from '../categories';
import { currentMonthKey, makeId, setActiveCurrency } from '../utils/money';
import { catchUp } from '../utils/catchup';
import { trashedId, withTrashed } from '../utils/trash';
import { dueBudgetAlerts, pruneAlertLog, sendBudgetNotifications } from '../utils/alerts';
import { reconcileReceipts } from '../utils/receipts';
import { syncSettleReminder, syncWeeklyDigest } from '../utils/reminders';
import { weekDigest, weekDigestMessage } from '../utils/digest';
import { isUnlocked, PremiumFeature } from '../utils/premium';
import { APP_VERSION } from '../version';
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
  addTransactions: (entries: Omit<Transaction, 'id'>[]) => void;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, 'id'>>) => void;
  removeTransaction: (id: string) => void;
  addRecurring: (rule: Omit<RecurringRule, 'id' | 'lastAppliedDate'>) => void;
  removeRecurring: (id: string, deleteTransactions: boolean) => void;
  addTemplate: (template: Omit<EntryTemplate, 'id'>) => void;
  removeTemplate: (id: string) => void;
  addCategory: (name: string, parentId?: string) => boolean;
  removeCategory: (id: string) => void;
  setBudget: (categoryId: string, limitCents: number | null) => void;
  setPersonBudget: (
    personId: string,
    categoryId: string,
    limitCents: number | null,
  ) => void;
  setTagBudget: (tag: string, limitCents: number | null) => void;
  restoreFromTrash: (id: string) => void;
  emptyTrash: () => void;
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
  setBudgetRollover: (enabled: boolean) => void;
  setPremium: (unlocked: boolean) => void;
  completeOnboarding: () => void;
  /** Release notes for this version have been read */
  markVersionSeen: () => void;
  /** Replace the whole state (used by backup import) */
  replaceState: (next: AppState) => void;
  /** Erase every stored trace of the user's data */
  eraseAllData: () => Promise<void>;
  updateRecurring: (id: string, patch: Partial<Omit<RecurringRule, 'id'>>) => void;
  addAccount: (name: string, kind: AccountKind, openingCents: number) => void;
  removeAccount: (id: string) => void;
  addAccountTransfer: (t: Omit<AccountTransfer, 'id'>) => void;
  removeAccountTransfer: (id: string) => void;
  /** Most recent reversible deletion, offered by the undo snackbar */
  undoAction: UndoAction | null;
  undo: () => void;
  dismissUndo: () => void;
}

/**
 * A deletion that can still be taken back, shown by the undo snackbar.
 * `revert` patches the *current* state rather than restoring a snapshot, so
 * undoing a delete never rolls back anything that happened after it.
 */
export interface UndoAction {
  label: string;
  revert: (state: AppState) => AppState;
}

const AppContext = createContext<AppContextValue | null>(null);

/** Whether a trashed record belonged to one person, whatever kind it is. */
function trashBelongsTo(item: TrashedItem, personId: string): boolean {
  switch (item.kind) {
    case 'transaction':
      return item.transaction.personId === personId;
    case 'recurring':
      return item.rule.personId === personId;
    case 'template':
      return item.template.personId === personId;
    case 'goal':
      return false;
  }
}

/**
 * Put a trashed record back where it came from. Shared by Undo and by Restore
 * so the two can never drift apart, and switched on `kind` so every restorable
 * type goes through one path rather than one per entity.
 */
function restoreEntry(state: AppState, id: string): AppState {
  const item = state.trash.find((e) => trashedId(e) === id);
  if (!item) return state;
  const trash = state.trash.filter((e) => trashedId(e) !== id);
  switch (item.kind) {
    case 'transaction':
      return { ...state, trash, transactions: [item.transaction, ...state.transactions] };
    case 'goal':
      return { ...state, trash, goals: [...state.goals, item.goal] };
    case 'template':
      return { ...state, trash, templates: [...state.templates, item.template] };
    case 'recurring':
      return { ...state, trash, recurring: [...state.recurring, item.rule] };
  }
}

/**
 * Long enough to collapse a burst of edits into one write, short enough that
 * the app is never more than a blink from durable if it is killed.
 */
const PERSIST_DEBOUNCE_MS = 400;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    // loadState returns normalized state (migrated + recurring applied)
    loadState().then((persisted) => {
      setState(persisted);
      loadedRef.current = true;
      setLoaded(true);
      // Sweep receipt photos that no transaction references anymore
      reconcileReceipts(withTrashed(persisted));
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
  const digestMessage = useMemo(
    () => weekDigestMessage(weekDigest(state.transactions)),
    [state.transactions],
  );
  useEffect(() => {
    if (!loaded) return;
    // Keyed on the message, not the entry list: editing an old month leaves
    // this week's summary unchanged and shouldn't hit the native scheduler.
    syncWeeklyDigest(digestEnabled, digestMessage);
  }, [loaded, digestEnabled, digestMessage]);

  /**
   * Persist, and push the widget, on a trailing debounce.
   *
   * Both are expensive: `saveState` serializes the whole ledger — including
   * the 30 days of trash — and `refreshWidget` re-scans a year of history for
   * the budget meters and then crosses the native bridge. Running them
   * synchronously on every state change meant a theme toggle, a modal
   * dismissal or each keystroke-driven re-render paid for both. A short
   * trailing delay collapses a burst of changes into one write without any
   * risk of losing the last one, since the final state is what gets written.
   */
  useEffect(() => {
    if (!loadedRef.current) return;
    const timer = setTimeout(() => {
      saveState(state);
      // The widget reads stored state, so it refreshes whenever the app
      // writes — otherwise it lags by up to Android's update period.
      refreshWidget(state);
    }, PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
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
    state.settings.budgetRolloverFrom,
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

  /**
   * Run a deletion and remember the state that preceded it, so a single
   * snackbar can take back any destructive action — not just entries.
   */
  const deleteWithUndo = useCallback(
    (label: string, apply: (s: AppState) => AppState, revert: (s: AppState) => AppState) => {
      setUndoAction({ label, revert });
      setState(apply);
    },
    [],
  );

  const removePerson = useCallback(
    (id: string) => {
      const prior = stateRef.current;
      const person = prior.people.find((p) => p.id === id);
      if (!person) return;
      const theirTransactions = prior.transactions.filter((t) => t.personId === id);
      const theirRules = prior.recurring.filter((r) => r.personId === id);
      // Their trashed records and their own budget limits go too. Left
      // behind, restoring one of those entries later handed back a
      // transaction belonging to nobody: counted in every total, filterable
      // under no person, rendered as "?".
      const theirTrash = prior.trash.filter((e) => trashBelongsTo(e, id));
      const theirBudgets = prior.personBudgets[id];
      deleteWithUndo(
        `Removed ${person.name}`,
        (s) => {
          const personBudgets = { ...s.personBudgets };
          delete personBudgets[id];
          return {
            ...s,
            people: s.people.filter((p) => p.id !== id),
            transactions: s.transactions.filter((t) => t.personId !== id),
            recurring: s.recurring.filter((r) => r.personId !== id),
            trash: s.trash.filter((e) => !trashBelongsTo(e, id)),
            personBudgets,
          };
        },
        (s) => ({
          ...s,
          people: [...s.people, person],
          transactions: [...theirTransactions, ...s.transactions],
          recurring: [...s.recurring, ...theirRules],
          trash: [...theirTrash, ...s.trash],
          personBudgets: theirBudgets
            ? { ...s.personBudgets, [id]: theirBudgets }
            : s.personBudgets,
        }),
      );
    },
    [deleteWithUndo],
  );

  const addTransaction = useCallback((t: Omit<Transaction, 'id'>) => {
    setState((s) => ({
      ...s,
      transactions: [{ ...t, id: makeId() }, ...s.transactions],
    }));
  }, []);

  /**
   * Add many entries as one undoable action — the shape a statement import
   * needs. Adding them one at a time copied the whole list per row, and left
   * no way back: reversing a 500-row import meant 500 manual deletes, despite
   * the confirmation promising otherwise.
   */
  const addTransactions = useCallback(
    (entries: Omit<Transaction, 'id'>[]) => {
      if (entries.length === 0) return;
      const created = entries.map((t) => ({ ...t, id: makeId() }));
      const ids = new Set(created.map((t) => t.id));
      deleteWithUndo(
        `Imported ${created.length} ${created.length === 1 ? 'entry' : 'entries'}`,
        (s) => ({ ...s, transactions: [...created, ...s.transactions] }),
        // The revert drops exactly what was added, by id, so entries made
        // between the import and the undo are untouched. Nothing goes to the
        // trash: these were never the user's records to lose.
        (s) => ({ ...s, transactions: s.transactions.filter((t) => !ids.has(t.id)) }),
      );
    },
    [deleteWithUndo],
  );

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

  /**
   * Deleting moves the entry to the trash rather than dropping it: the undo
   * snackbar only covers the next few seconds, and a mistake noticed next
   * week is still a mistake. The trash keeps entries for
   * TRASH_RETENTION_DAYS and is swept on launch.
   *
   * Undo takes the entry straight back out of the trash, so an undone delete
   * leaves no trace there.
   */
  const removeTransaction = useCallback(
    (id: string) => {
      const removed = stateRef.current.transactions.find((t) => t.id === id);
      if (!removed) return;
      const deletedAt = new Date().toISOString();
      deleteWithUndo(
        `Deleted ${removed.note || 'entry'}`,
        (s) => ({
          ...s,
          transactions: s.transactions.filter((t) => t.id !== id),
          trash: [{ kind: 'transaction', transaction: removed, deletedAt }, ...s.trash],
        }),
        // Undo and Restore are the same transform, so they stay one function:
        // anything the restore path learns later applies to both.
        (s) => restoreEntry(s, id),
      );
    },
    [deleteWithUndo],
  );

  const restoreFromTrash = useCallback((id: string) => {
    setState((s) => restoreEntry(s, id));
  }, []);

  const emptyTrash = useCallback(() => {
    const emptied = stateRef.current.trash;
    if (emptied.length === 0) return;
    deleteWithUndo(
      `Emptied trash · ${emptied.length} ${emptied.length === 1 ? 'entry' : 'entries'}`,
      (s) => ({ ...s, trash: [] }),
      (s) => ({ ...s, trash: emptied }),
    );
  }, [deleteWithUndo]);

  const undo = useCallback(() => {
    if (!undoAction) return;
    const { revert } = undoAction;
    setUndoAction(null);
    setState(revert);
  }, [undoAction]);

  const dismissUndo = useCallback(() => setUndoAction(null), []);

  const addRecurring = useCallback(
    (rule: Omit<RecurringRule, 'id' | 'lastAppliedDate'>) => {
      // Photos and per-entry split weights belong to individual entries,
      // never to rules — strip here at the boundary, since a spread would
      // smuggle the fields past the type without TypeScript objecting.
      const {
        photoUri: _photo,
        splitShares: _shares,
        ...clean
      } = rule as typeof rule & {
        photoUri?: string;
        splitShares?: Record<string, number>;
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

  const removeRecurring = useCallback(
    (id: string, deleteTransactions: boolean) => {
      const prior = stateRef.current;
      const rule = prior.recurring.find((r) => r.id === id);
      if (!rule) return;
      const generated = deleteTransactions
        ? prior.transactions.filter((t) => t.recurringId === id)
        : [];
      const deletedAt = new Date().toISOString();
      deleteWithUndo(
        `Stopped ${rule.note || 'repeat'}`,
        (s) => ({
          ...s,
          // Only a non-cascading stop is recoverable from the trash; deleting
          // the generated entries too is a cascade that cannot be half-undone.
          trash: deleteTransactions
            ? s.trash
            : [{ kind: 'recurring', rule, deletedAt }, ...s.trash],
          recurring: s.recurring.filter((r) => r.id !== id),
          transactions: deleteTransactions
            ? s.transactions.filter((t) => t.recurringId !== id)
            : s.transactions,
        }),
        // Undo has to take the rule back OUT of the trash as well as
        // reinstate it. Leaving it there let Undo-then-Restore create two
        // rules with the same id, which catchUp then materialized twice —
        // double rent, every month, with edits only patching one copy.
        (s) => ({
          ...restoreEntry(s, id),
          recurring: s.recurring.some((r) => r.id === id)
            ? s.recurring
            : [...s.recurring, rule],
          transactions: [...generated, ...s.transactions],
        }),
      );
    },
    [deleteWithUndo],
  );

  const updateRecurring = useCallback(
    (id: string, patch: Partial<Omit<RecurringRule, 'id'>>) => {
      setState((s) => ({
        ...s,
        recurring: s.recurring.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      }));
    },
    [],
  );

  const addTemplate = useCallback((template: Omit<EntryTemplate, 'id'>) => {
    // A template is the shape of a purchase, not one occurrence, so a
    // per-entry split override has no meaning on it. Same boundary strip as
    // addRecurring.
    const { splitShares: _shares, ...shape } = template as typeof template & {
      splitShares?: Record<string, number>;
    };
    setState((s) => {
      // Re-saving the same entry shape replaces the old template rather than
      // stacking near-identical chips the user then has to tell apart.
      const kept = s.templates.filter(
        (t) => t.name.toLowerCase() !== shape.name.toLowerCase(),
      );
      return { ...s, templates: [...kept, { ...shape, id: makeId() }] };
    });
  }, []);

  const removeTemplate = useCallback(
    (id: string) => {
      const template = stateRef.current.templates.find((t) => t.id === id);
      if (!template) return;
      const deletedAt = new Date().toISOString();
      deleteWithUndo(
        `Removed ${template.name}`,
        (s) => ({
          ...s,
          templates: s.templates.filter((t) => t.id !== id),
          trash: [{ kind: 'template', template, deletedAt }, ...s.trash],
        }),
        (s) => restoreEntry(s, id),
      );
    },
    [deleteWithUndo],
  );

  const addAccount = useCallback(
    (name: string, kind: AccountKind, openingCents: number) => {
      setState((s) => ({
        ...s,
        accounts: [
          ...s.accounts,
          {
            id: makeId(),
            name: name.trim(),
            kind,
            color: personColors[(s.accounts.length + 2) % personColors.length],
            openingCents,
          },
        ],
      }));
    },
    [],
  );

  // Entries keep their history; they just stop being tied to an account
  const removeAccount = useCallback(
    (id: string) => {
      const prior = stateRef.current;
      const account = prior.accounts.find((a) => a.id === id);
      if (!account) return;
      const itsTransfers = prior.accountTransfers.filter(
        (t) => t.fromAccountId === id || t.toAccountId === id,
      );
      const linkedIds = new Set(
        prior.transactions.filter((t) => t.accountId === id).map((t) => t.id),
      );
      deleteWithUndo(
        `Removed ${account.name}`,
        (s) => ({
          ...s,
          accounts: s.accounts.filter((a) => a.id !== id),
          accountTransfers: s.accountTransfers.filter(
            (t) => t.fromAccountId !== id && t.toAccountId !== id,
          ),
          transactions: s.transactions.map((t) =>
            t.accountId === id ? { ...t, accountId: undefined } : t,
          ),
        }),
        (s) => ({
          ...s,
          accounts: [...s.accounts, account],
          accountTransfers: [...itsTransfers, ...s.accountTransfers],
          transactions: s.transactions.map((t) =>
            linkedIds.has(t.id) ? { ...t, accountId: id } : t,
          ),
        }),
      );
    },
    [deleteWithUndo],
  );

  const addAccountTransfer = useCallback((transfer: Omit<AccountTransfer, 'id'>) => {
    setState((s) => ({
      ...s,
      accountTransfers: [{ ...transfer, id: makeId() }, ...s.accountTransfers],
    }));
  }, []);

  const removeAccountTransfer = useCallback(
    (id: string) => {
      const transfer = stateRef.current.accountTransfers.find((t) => t.id === id);
      if (!transfer) return;
      deleteWithUndo(
        'Removed transfer',
        (s) => ({
          ...s,
          accountTransfers: s.accountTransfers.filter((t) => t.id !== id),
        }),
        (s) => ({ ...s, accountTransfers: [transfer, ...s.accountTransfers] }),
      );
    },
    [deleteWithUndo],
  );

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

  const removeCategory = useCallback(
    (id: string) => {
      const prior = stateRef.current;
      // Removing a parent takes its subcategories with it, so budgets and
      // entries filed under any of them have to be cleaned up together.
      const doomed = new Set([
        id,
        ...prior.customCategories.filter((c) => c.parentId === id).map((c) => c.id),
      ]);
      const removedCategories = prior.customCategories.filter((c) => doomed.has(c.id));
      if (removedCategories.length === 0) return;
      const removedBudgets = Object.fromEntries(
        Object.entries(prior.budgets).filter(([key]) => doomed.has(key)),
      );
      const refiledIds = new Set(
        prior.transactions
          .filter((t) => t.categoryId && doomed.has(t.categoryId))
          .map((t) => t.id),
      );
      const priorCategoryOf = new Map(
        prior.transactions.map((t) => [t.id, t.categoryId]),
      );
      deleteWithUndo(
        `Removed ${categoryById(prior.customCategories, id).name}`,
        (s) => ({
          ...s,
          customCategories: s.customCategories.filter((c) => !doomed.has(c.id)),
          budgets: Object.fromEntries(
            Object.entries(s.budgets).filter(([key]) => !doomed.has(key)),
          ),
          transactions: s.transactions.map((t) =>
            refiledIds.has(t.id) ? { ...t, categoryId: undefined } : t,
          ),
        }),
        (s) => ({
          ...s,
          customCategories: [...s.customCategories, ...removedCategories],
          budgets: { ...s.budgets, ...removedBudgets },
          transactions: s.transactions.map((t) =>
            refiledIds.has(t.id)
              ? { ...t, categoryId: priorCategoryOf.get(t.id) }
              : t,
          ),
        }),
      );
    },
    [deleteWithUndo],
  );

  const setPersonBudget = useCallback(
    (personId: string, categoryId: string, limitCents: number | null) => {
      setState((s) => {
        const own = { ...(s.personBudgets[personId] ?? {}) };
        if (limitCents && limitCents > 0) own[categoryId] = limitCents;
        else delete own[categoryId];
        const personBudgets = { ...s.personBudgets };
        // Drop the person's entry entirely once they have no own limits, so
        // the map never accumulates empty objects.
        if (Object.keys(own).length === 0) delete personBudgets[personId];
        else personBudgets[personId] = own;
        return { ...s, personBudgets };
      });
    },
    [],
  );

  const setTagBudget = useCallback((tag: string, limitCents: number | null) => {
    setState((s) => {
      const tagBudgets = { ...s.tagBudgets };
      if (limitCents && limitCents > 0) tagBudgets[tag] = limitCents;
      else delete tagBudgets[tag];
      return { ...s, tagBudgets };
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

  const removeGoal = useCallback(
    (id: string) => {
      const goal = stateRef.current.goals.find((g) => g.id === id);
      if (!goal) return;
      const deletedAt = new Date().toISOString();
      deleteWithUndo(
        `Removed ${goal.name}`,
        (s) => ({
          ...s,
          goals: s.goals.filter((g) => g.id !== id),
          trash: [{ kind: 'goal', goal, deletedAt }, ...s.trash],
        }),
        (s) => restoreEntry(s, id),
      );
    },
    [deleteWithUndo],
  );

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

  // Stamped with the current month so carry-over only ever counts months the
  // user opted into; switching it off forgets the start month entirely.
  const setBudgetRollover = useCallback((enabled: boolean) => {
    setState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        budgetRolloverFrom: enabled ? currentMonthKey() : undefined,
      },
    }));
  }, []);

  const setPremium = useCallback((unlocked: boolean) => {
    setState((s) => ({ ...s, settings: { ...s.settings, premium: unlocked } }));
  }, []);

  // Stamping the version here is what stops a fresh install from being met
  // with release notes for the build it just arrived on.
  const completeOnboarding = useCallback(() => {
    setState((s) => ({
      ...s,
      settings: { ...s.settings, onboarded: true, lastSeenVersion: APP_VERSION },
    }));
  }, []);

  const markVersionSeen = useCallback(() => {
    setState((s) => ({ ...s, settings: { ...s.settings, lastSeenVersion: APP_VERSION } }));
  }, []);

  const eraseAllData = useCallback(async () => {
    await wipeAllData();
    setState(emptyState);
  }, []);

  // Expects normalized state (from storage.parseBackup)
  const replaceState = useCallback((next: AppState) => {
    setState(next);
    reconcileReceipts(withTrashed(next));
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
        addTransactions,
        updateTransaction,
        removeTransaction,
        addRecurring,
        removeRecurring,
        updateRecurring,
        addTemplate,
        removeTemplate,
        addAccount,
        removeAccount,
        addAccountTransfer,
        removeAccountTransfer,
        addCategory,
        removeCategory,
        setBudget,
        setPersonBudget,
        setTagBudget,
        restoreFromTrash,
        emptyTrash,
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
        setBudgetRollover,
        setPremium,
        completeOnboarding,
        markVersionSeen,
        replaceState,
        eraseAllData,
        undoAction,
        undo,
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
export function useCategories(): CategoryIndex {
  const { state } = useApp();
  return useMemo(() => categoryIndex(state.customCategories), [state.customCategories]);
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
