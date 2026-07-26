import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, Person, SettlementRecord, Transaction } from '../types';
import { emptyState, loadState, saveState } from '../storage';
import { makeId } from '../utils/money';
import { personColors } from '../theme';

interface AppContextValue {
  state: AppState;
  loaded: boolean;
  addPerson: (name: string) => void;
  renamePerson: (id: string, name: string) => void;
  removePerson: (id: string) => void;
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  removeTransaction: (id: string) => void;
  addSettlement: (s: Omit<SettlementRecord, 'id' | 'createdAt'>) => void;
  removeSettlement: (id: string) => void;
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

  const addPerson = useCallback((name: string) => {
    setState((s) => ({
      ...s,
      people: [
        ...s.people,
        {
          id: makeId(),
          name: name.trim(),
          color: personColors[s.people.length % personColors.length],
        },
      ],
    }));
  }, []);

  const renamePerson = useCallback((id: string, name: string) => {
    setState((s) => ({
      ...s,
      people: s.people.map((p) => (p.id === id ? { ...p, name: name.trim() } : p)),
    }));
  }, []);

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

  return (
    <AppContext.Provider
      value={{
        state,
        loaded,
        addPerson,
        renamePerson,
        removePerson,
        addTransaction,
        removeTransaction,
        addSettlement,
        removeSettlement,
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

export function usePerson(id: string): Person | undefined {
  const { state } = useApp();
  return state.people.find((p) => p.id === id);
}
