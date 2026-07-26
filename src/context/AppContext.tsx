import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import {
  AppState,
  IncomeFrequency,
  Person,
  SettlementRecord,
  Transaction,
} from '../types';
import { emptyState, loadState, saveState } from '../storage';
import { makeId } from '../utils/money';
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
  removeTransaction: (id: string) => void;
  addSettlement: (s: Omit<SettlementRecord, 'id' | 'createdAt'>) => void;
  removeSettlement: (id: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  completeOnboarding: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    loadState().then((persisted) => {
      setState(persisted);
      loadedRef.current = true;
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loadedRef.current) saveState(state);
  }, [state]);

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
    }));
  }, []);

  const addTransaction = useCallback((t: Omit<Transaction, 'id'>) => {
    setState((s) => ({
      ...s,
      transactions: [{ ...t, id: makeId() }, ...s.transactions],
    }));
  }, []);

  const removeTransaction = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      transactions: s.transactions.filter((t) => t.id !== id),
    }));
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

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setState((s) => ({ ...s, settings: { ...s.settings, themeMode: mode } }));
  }, []);

  const completeOnboarding = useCallback(() => {
    setState((s) => ({ ...s, settings: { ...s.settings, onboarded: true } }));
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
        removeTransaction,
        addSettlement,
        removeSettlement,
        setThemeMode,
        completeOnboarding,
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
