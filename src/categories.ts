import { Category } from './types';

/**
 * Categories are two levels: a small set of top-level groups, each with
 * optional subcategories for finer sorting. Entries store the most specific
 * id they were given; reporting rolls everything up to the top level.
 *
 * Categories carry a color rather than an emoji so every list in the app
 * reads the same way — a colored dot and a label, nothing decorative.
 */
export const CATEGORY_COLORS = {
  groceries: '#2AA4C9',
  housing: '#4F63F6',
  utilities: '#8557E0',
  transport: '#E58E26',
  dining: '#C245A8',
  leisure: '#1FA97C',
  health: '#D14343',
  shopping: '#5E8C31',
  other: '#6E7180',
} as const;

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'groceries', name: 'Groceries', color: CATEGORY_COLORS.groceries },
  { id: 'groceries.supermarket', name: 'Supermarket', color: CATEGORY_COLORS.groceries, parentId: 'groceries' },
  { id: 'groceries.bakery', name: 'Bakery', color: CATEGORY_COLORS.groceries, parentId: 'groceries' },
  { id: 'groceries.drinks', name: 'Drinks', color: CATEGORY_COLORS.groceries, parentId: 'groceries' },

  { id: 'housing', name: 'Housing', color: CATEGORY_COLORS.housing },
  { id: 'housing.rent', name: 'Rent or mortgage', color: CATEGORY_COLORS.housing, parentId: 'housing' },
  { id: 'housing.maintenance', name: 'Maintenance', color: CATEGORY_COLORS.housing, parentId: 'housing' },
  { id: 'housing.insurance', name: 'Insurance', color: CATEGORY_COLORS.housing, parentId: 'housing' },

  { id: 'utilities', name: 'Utilities', color: CATEGORY_COLORS.utilities },
  { id: 'utilities.energy', name: 'Gas and electricity', color: CATEGORY_COLORS.utilities, parentId: 'utilities' },
  { id: 'utilities.water', name: 'Water', color: CATEGORY_COLORS.utilities, parentId: 'utilities' },
  { id: 'utilities.internet', name: 'Internet and phone', color: CATEGORY_COLORS.utilities, parentId: 'utilities' },

  { id: 'transport', name: 'Transport', color: CATEGORY_COLORS.transport },
  { id: 'transport.fuel', name: 'Fuel', color: CATEGORY_COLORS.transport, parentId: 'transport' },
  { id: 'transport.public', name: 'Public transport', color: CATEGORY_COLORS.transport, parentId: 'transport' },
  { id: 'transport.car', name: 'Car costs', color: CATEGORY_COLORS.transport, parentId: 'transport' },

  { id: 'dining', name: 'Dining out', color: CATEGORY_COLORS.dining },
  { id: 'dining.restaurant', name: 'Restaurant', color: CATEGORY_COLORS.dining, parentId: 'dining' },
  { id: 'dining.takeaway', name: 'Takeaway', color: CATEGORY_COLORS.dining, parentId: 'dining' },
  { id: 'dining.coffee', name: 'Coffee', color: CATEGORY_COLORS.dining, parentId: 'dining' },

  { id: 'leisure', name: 'Leisure', color: CATEGORY_COLORS.leisure },
  { id: 'leisure.subscriptions', name: 'Subscriptions', color: CATEGORY_COLORS.leisure, parentId: 'leisure' },
  { id: 'leisure.hobbies', name: 'Hobbies', color: CATEGORY_COLORS.leisure, parentId: 'leisure' },
  { id: 'leisure.holidays', name: 'Holidays', color: CATEGORY_COLORS.leisure, parentId: 'leisure' },

  { id: 'health', name: 'Health', color: CATEGORY_COLORS.health },
  { id: 'health.pharmacy', name: 'Pharmacy', color: CATEGORY_COLORS.health, parentId: 'health' },
  { id: 'health.sport', name: 'Sport', color: CATEGORY_COLORS.health, parentId: 'health' },

  { id: 'shopping', name: 'Shopping', color: CATEGORY_COLORS.shopping },
  { id: 'shopping.clothing', name: 'Clothing', color: CATEGORY_COLORS.shopping, parentId: 'shopping' },
  { id: 'shopping.home', name: 'Home and furniture', color: CATEGORY_COLORS.shopping, parentId: 'shopping' },
  { id: 'shopping.tech', name: 'Tech', color: CATEGORY_COLORS.shopping, parentId: 'shopping' },

  { id: 'other', name: 'Other', color: CATEGORY_COLORS.other },
];

export const OTHER_CATEGORY_ID = 'other';

/** Free plan allowance; Budget Pro removes the cap */
export const FREE_CUSTOM_CATEGORY_LIMIT = 3;

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

/** Top-level categories only — what reports group by */
export function topLevelCategories(custom: Category[]): Category[] {
  return allCategories(custom).filter((c) => !c.parentId);
}

export function subcategoriesOf(custom: Category[], parentId: string): Category[] {
  return allCategories(custom).filter((c) => c.parentId === parentId);
}

/**
 * The top-level category an id belongs to. Subcategory spending rolls up to
 * its parent so charts and budgets stay readable.
 */
export function rootCategoryId(custom: Category[], id?: string): string {
  const category = categoryById(custom, id);
  return category.parentId ?? category.id;
}
