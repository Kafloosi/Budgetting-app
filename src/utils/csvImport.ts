import { Category, Transaction } from '../types';
import { categoryIndex } from '../categories';
import { monthKey } from './money';

/**
 * Importing a bank statement.
 *
 * Bank CSVs agree on almost nothing: column names, date order, decimal
 * separator, whether an expense is a minus sign or a separate debit column.
 * So this parses defensively and reports what it could not read rather than
 * guessing — a wrong amount is worse than a skipped row, because a skipped
 * row is visible and a wrong one is not.
 */

/** A row parsed far enough to become a transaction, before the user confirms */
export interface ParsedRow {
  /** 1-based line number in the source file, for reporting */
  line: number;
  date: string;
  /** Always positive; `type` carries the direction */
  amountCents: number;
  type: 'income' | 'expense';
  note: string;
}

export interface RowProblem {
  line: number;
  reason: string;
}

export interface ParsedCsv {
  rows: ParsedRow[];
  problems: RowProblem[];
  /** Header cells as found, so the UI can show what was matched */
  header: string[];
}

/** Column roles we try to find, and the header names that map to each. */
const HEADERS: Record<'date' | 'amount' | 'note' | 'debit' | 'credit', string[]> = {
  date: ['date', 'transaction date', 'booking date', 'datum', 'value date', 'posted'],
  amount: ['amount', 'bedrag', 'value', 'transaction amount', 'sum'],
  note: ['description', 'note', 'omschrijving', 'details', 'memo', 'payee', 'name'],
  debit: ['debit', 'withdrawal', 'paid out', 'af'],
  credit: ['credit', 'deposit', 'paid in', 'bij'],
};

/**
 * Split one CSV line, honouring quoted fields and doubled quotes. Written by
 * hand because bank files routinely put separators inside quoted descriptions,
 * and a naive split on the delimiter mangles exactly those rows.
 */
export function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      cells.push(cell);
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  return cells.map((c) => c.trim());
}

/** Whichever of , ; or tab appears most often outside quotes in the header. */
export function detectDelimiter(headerLine: string): string {
  const candidates = [',', ';', '\t'];
  let best = ',';
  let bestCount = -1;
  for (const d of candidates) {
    const count = splitCsvLine(headerLine, d).length;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

/**
 * Parse an amount that may be European (1.234,56), Anglo (1,234.56), or
 * either with a currency symbol or a trailing/leading minus.
 *
 * Returns null rather than a guess when the text is not a number, so the row
 * is reported instead of silently importing a zero.
 */
export function parseAmountCents(raw: string): number | null {
  let text = raw.trim();
  if (!text) return null;
  const negative = /^-|-$|^\(.*\)$/.test(text);
  text = text.replace(/[()]/g, '').replace(/[^0-9.,-]/g, '').replace(/-/g, '');
  if (!text) return null;

  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  let decimalSep = '';
  if (lastComma >= 0 && lastDot >= 0) {
    // Whichever comes last is the decimal separator; the other groups digits.
    decimalSep = lastComma > lastDot ? ',' : '.';
  } else if (lastComma >= 0) {
    // A lone comma is decimal only when it looks like one: exactly two digits
    // after it. "1,234" is a thousands group, "12,34" is twelve euros thirty-four.
    decimalSep = text.length - lastComma === 3 ? ',' : '';
  } else if (lastDot >= 0) {
    decimalSep = text.length - lastDot === 3 ? '.' : '';
  }

  // With no decimal separator every . and , is grouping, so both go. Stripping
  // only one of them turns "1.234" into 1.234 rather than 1234.
  const cleaned =
    decimalSep === ''
      ? text.replace(/[.,]/g, '')
      : text.split(decimalSep === ',' ? '.' : ',').join('');
  const normalized = decimalSep === ',' ? cleaned.replace(',', '.') : cleaned;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  const cents = Math.round(Math.abs(value) * 100);
  return negative ? -cents : cents;
}

/**
 * Normalize a date cell to yyyy-mm-dd. Handles ISO, and d/m/y or m/d/y with
 * any of / - or . as separator.
 *
 * Ambiguity is resolved by `dayFirst` rather than guessed: 03/04/2026 is a
 * real date under both readings, and picking silently would misfile entries
 * by up to eleven months.
 */
export function parseDate(raw: string, dayFirst: boolean): string | null {
  const text = raw.trim();
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const parts = text.match(/^(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (!parts) return null;
  let [, a, b, c] = parts;
  let year: string;
  let month: string;
  let day: string;
  if (a.length === 4) {
    year = a;
    month = b;
    day = c;
  } else {
    year = c.length === 2 ? `20${c}` : c;
    day = dayFirst ? a : b;
    month = dayFirst ? b : a;
  }
  const m = Number(month);
  const d = Number(day);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function findColumn(header: string[], names: string[]): number {
  const lower = header.map((h) => h.toLowerCase());
  for (const name of names) {
    const exact = lower.indexOf(name);
    if (exact >= 0) return exact;
  }
  for (let i = 0; i < lower.length; i++) {
    if (names.some((n) => lower[i].includes(n))) return i;
  }
  return -1;
}

/**
 * Parse a bank CSV into rows ready to become transactions.
 *
 * Every row that cannot be read is reported with its line number and a reason
 * rather than dropped, so the import screen can say exactly what it skipped.
 */
export function parseBankCsv(text: string, dayFirst = true): ParsedCsv {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) {
    return { rows: [], problems: [{ line: 1, reason: 'No data rows found' }], header: [] };
  }
  const delimiter = detectDelimiter(lines[0]);
  const header = splitCsvLine(lines[0], delimiter);

  const dateCol = findColumn(header, HEADERS.date);
  const amountCol = findColumn(header, HEADERS.amount);
  const noteCol = findColumn(header, HEADERS.note);
  const debitCol = findColumn(header, HEADERS.debit);
  const creditCol = findColumn(header, HEADERS.credit);

  const problems: RowProblem[] = [];
  if (dateCol < 0) problems.push({ line: 1, reason: 'No date column found' });
  if (amountCol < 0 && debitCol < 0 && creditCol < 0) {
    problems.push({ line: 1, reason: 'No amount, debit or credit column found' });
  }
  if (problems.length > 0) return { rows: [], problems, header };

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = i + 1;
    const cells = splitCsvLine(lines[i], delimiter);
    const date = parseDate(cells[dateCol] ?? '', dayFirst);
    if (!date) {
      problems.push({ line, reason: `Could not read the date "${cells[dateCol] ?? ''}"` });
      continue;
    }

    // A single signed amount column, or separate debit/credit columns.
    let signed: number | null = null;
    if (amountCol >= 0) {
      signed = parseAmountCents(cells[amountCol] ?? '');
    }
    if (signed === null && debitCol >= 0) {
      const debit = parseAmountCents(cells[debitCol] ?? '');
      if (debit !== null && debit !== 0) signed = -Math.abs(debit);
    }
    if (signed === null && creditCol >= 0) {
      const credit = parseAmountCents(cells[creditCol] ?? '');
      if (credit !== null && credit !== 0) signed = Math.abs(credit);
    }
    if (signed === null) {
      problems.push({ line, reason: 'Could not read the amount' });
      continue;
    }
    if (signed === 0) {
      problems.push({ line, reason: 'Amount is zero' });
      continue;
    }

    rows.push({
      line,
      date,
      amountCents: Math.abs(signed),
      type: signed < 0 ? 'expense' : 'income',
      note: (noteCol >= 0 ? cells[noteCol] ?? '' : '').slice(0, 120),
    });
  }
  return { rows, problems, header };
}

/**
 * Rows that already exist in the ledger.
 *
 * Matching on date, amount and direction rather than the note, because banks
 * reword descriptions between exports and the same statement is very often
 * imported twice. Deliberately conservative: a genuine second identical
 * purchase on the same day is flagged as a duplicate, which the user can
 * override, since silently doubling their spending is the worse failure.
 */
export function findDuplicates(
  rows: ParsedRow[],
  existing: Transaction[],
): Set<number> {
  const seen = new Set<string>();
  for (const t of existing) {
    seen.add(`${t.date}|${t.amountCents}|${t.type}`);
  }
  const duplicates = new Set<number>();
  for (const row of rows) {
    const key = `${row.date}|${row.amountCents}|${row.type}`;
    if (seen.has(key)) duplicates.add(row.line);
  }
  return duplicates;
}

/**
 * Guess a category from the description by matching category names and
 * subcategory names against the words in the note. Returns undefined when
 * nothing matches, which files the entry under the fallback category rather
 * than inventing one.
 */
export function guessCategory(
  note: string,
  customCategories: Category[],
): string | undefined {
  const text = note.toLowerCase();
  if (!text) return undefined;
  const { all } = categoryIndex(customCategories);
  // Longest name first, so "Public transport" wins over "Transport".
  const ordered = [...all].sort((a, b) => b.name.length - a.name.length);
  for (const category of ordered) {
    if (text.includes(category.name.toLowerCase())) return category.id;
  }
  return undefined;
}

/** Months covered by a parsed file, for the import summary. */
export function monthsCovered(rows: ParsedRow[]): string[] {
  return [...new Set(rows.map((r) => monthKey(r.date)))].sort();
}
