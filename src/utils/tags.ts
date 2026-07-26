import { NavPeriodType, Transaction } from '../types';
import { periodOfDate } from './money';

/**
 * Tags are free-form labels that cut across categories — "spain trip",
 * "car repair" — so a project can be totalled without inventing a category
 * for it.
 *
 * They are stored lowercased and trimmed. Normalizing on the way in is what
 * keeps "Spain" and "spain" from becoming two different tags, which would
 * quietly split a project's total in half.
 */
const MAX_TAG_LENGTH = 24;

export function normalizeTag(raw: string): string | null {
  const tag = raw.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, MAX_TAG_LENGTH);
  return tag.length > 0 ? tag : null;
}

/** Parse a comma- or space-separated input into unique, normalized tags */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  for (const part of input.split(',')) {
    const tag = normalizeTag(part);
    if (tag) seen.add(tag);
  }
  return [...seen];
}

/** Every tag in use, most-used first — the suggestion list */
export function knownTags(transactions: Transaction[], limit?: number): string[] {
  const counts = new Map<string, number>();
  for (const t of transactions) {
    for (const tag of t.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
  return limit ? sorted.slice(0, limit) : sorted;
}

export interface TagTotal {
  tag: string;
  cents: number;
  count: number;
}

/**
 * Expense totals per tag for one period, biggest first. An entry with two
 * tags counts in full towards both — tags overlap by design, so these
 * deliberately do not sum to the period total.
 */
export function tagTotals(
  transactions: Transaction[],
  periodType: NavPeriodType,
  period: string,
): TagTotal[] {
  const totals = new Map<string, TagTotal>();
  for (const t of transactions) {
    if (t.type !== 'expense' || !t.tags?.length) continue;
    if (periodOfDate(periodType, t.date) !== period) continue;
    for (const tag of t.tags) {
      const current = totals.get(tag) ?? { tag, cents: 0, count: 0 };
      current.cents += t.amountCents;
      current.count += 1;
      totals.set(tag, current);
    }
  }
  return [...totals.values()].sort((a, b) => b.cents - a.cents);
}
