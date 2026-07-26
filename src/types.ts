export type TransactionType = 'income' | 'expense';

export type IncomeFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface Person {
  id: string;
  name: string;
  color: string;
  /** Regular income in cents, earned every `incomeFrequency` */
  incomeCents: number;
  incomeFrequency: IncomeFrequency;
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

/** Settlements can cover a calendar month or an ISO week */
export type PeriodType = 'month' | 'week';

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
  periodType: PeriodType;
  /** yyyy-mm for months, yyyy-Www for ISO weeks */
  period: string;
  method: SplitMethod;
  totalSharedCents: number;
  results: PersonResult[];
  transfers: Transfer[];
  /** ISO timestamp of when the calculation was saved */
  createdAt: string;
}

export interface AppSettings {
  themeMode: 'light' | 'dark' | 'auto';
  /** Whether the first-launch setup has been completed */
  onboarded: boolean;
}

export interface AppState {
  people: Person[];
  transactions: Transaction[];
  settlements: SettlementRecord[];
  settings: AppSettings;
}
