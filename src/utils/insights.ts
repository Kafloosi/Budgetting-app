import { Category, Transaction } from '../types';
import { categoryById } from '../categories';
import { expenseCentsByCategory } from './aggregate';
import { formatCents, formatMonth, monthKey, shiftMonth } from './money';

export interface Insight {
  text: string;
}

/** Premium: plain-language observations about the selected month's spending */
export function computeInsights(
  transactions: Transaction[],
  customCategories: Category[],
  month: string,
): Insight[] {
  const prevMonth = shiftMonth(month, -1);
  const byCategory = expenseCentsByCategory(transactions, customCategories, 'month', month);
  const prevByCategory = expenseCentsByCategory(
    transactions,
    customCategories,
    'month',
    prevMonth,
  );

  let spent = 0;
  for (const cents of byCategory.values()) spent += cents;
  if (spent === 0) return [];

  let prevSpent = 0;
  for (const cents of prevByCategory.values()) prevSpent += cents;

  let income = 0;
  let biggest: { note: string; cents: number } | null = null;
  for (const t of transactions) {
    if (monthKey(t.date) !== month) continue;
    if (t.type === 'income') {
      income += t.amountCents;
    } else if (!biggest || t.amountCents > biggest.cents) {
      biggest = { note: t.note, cents: t.amountCents };
    }
  }

  const insights: Insight[] = [];

  if (prevSpent > 0) {
    const change = Math.round(((spent - prevSpent) / prevSpent) * 100);
    insights.push({
      text:
        change === 0
          ? `You spent about the same as in ${formatMonth(prevMonth)}.`
          : `You spent ${Math.abs(change)}% ${change > 0 ? 'more' : 'less'} than in ${formatMonth(prevMonth)}.`,
    });
  }

  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top) {
    const category = categoryById(customCategories, top[0]);
    const prev = prevByCategory.get(top[0]) ?? 0;
    insights.push({
      text: `Top category: ${category.name} at ${formatCents(top[1])}${
        prev > 0 ? ` (${formatCents(prev)} last month)` : ''
      }.`,
    });
  }

  // Daily pace deliberately lives in the Forecast card, not here

  if (biggest) {
    insights.push({
      text: `Biggest expense: ${biggest.note || 'unnamed'} at ${formatCents(biggest.cents)}.`,
    });
  }

  if (income > 0) {
    const left = income - spent;
    insights.push(
      left >= 0
        ? { text: `${formatCents(left)} of this month's income is still unspent.` }
        : { text: `Spending exceeds income by ${formatCents(-left)} this month.` },
    );
  }

  return insights;
}
