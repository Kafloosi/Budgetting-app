export type TransactionType = 'income' | 'expense';

export interface Person {
  id: string;
  name: string;
  color: string;
}

export interface Transaction {
  id: string;
  personId: string;
  type: TransactionType;
  /** Amount in cents to avoid floating point issues */
  amountCents: number;
  note: string;
  /** ISO date string (yyyy-mm-dd) */
  date: string;
  /** Whether this expense is shared between people (only relevant for expenses) */
  shared: boolean;
}

export type SplitMethod = 'fifty-fifty' | 'percentage' | 'equal-payments';

export interface PersonResult {
  personId: string;
  personName: string;
  paidCents: number;
  shareCents: number;
  /** paid - share: positive means this person is owed money */
  netCents: number;
  /** Only set for percentage method */
  percentage?: number;
}

export interface Transfer {
  fromName: string;
  toName: string;
  amountCents: number;
}

export interface SettlementRecord {
  id: string;
  /** yyyy-mm of the period that was settled */
  month: string;
  method: SplitMethod;
  totalSharedCents: number;
  results: PersonResult[];
  transfers: Transfer[];
  /** ISO timestamp of when the calculation was saved */
  createdAt: string;
}

export interface AppState {
  people: Person[];
  transactions: Transaction[];
  settlements: SettlementRecord[];
}
