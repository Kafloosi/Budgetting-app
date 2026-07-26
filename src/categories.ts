import { Category } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'groceries', name: 'Groceries', emoji: '🛒' },
  { id: 'housing', name: 'Housing', emoji: '🏠' },
  { id: 'utilities', name: 'Utilities', emoji: '💡' },
  { id: 'transport', name: 'Transport', emoji: '🚗' },
  { id: 'dining', name: 'Dining out', emoji: '🍽️' },
  { id: 'fun', name: 'Fun', emoji: '🎉' },
  { id: 'health', name: 'Health', emoji: '💊' },
  { id: 'shopping', name: 'Shopping', emoji: '🛍️' },
  { id: 'subscriptions', name: 'Subscriptions', emoji: '📺' },
  { id: 'other', name: 'Other', emoji: '📦' },
];

export const OTHER_CATEGORY_ID = 'other';

export function allCategories(custom: Category[]): Category[] {
  return [...DEFAULT_CATEGORIES, ...custom];
}

export function categoryById(custom: Category[], id?: string): Category {
  const all = allCategories(custom);
  return (
    all.find((c) => c.id === id) ??
    all.find((c) => c.id === OTHER_CATEGORY_ID)!
  );
}
