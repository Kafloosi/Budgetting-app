import React from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { BudgetWidget } from '../widget/BudgetWidget';
import { AppState } from '../types';
import { monthTotals } from './aggregate';
import { effectiveBudgets } from './budgets';
import { goalProgress } from './goals';
import { isUnlocked } from './premium';
import { categoryById } from '../categories';
import { currentMonthKey, formatCents, formatMonth, setActiveCurrency } from './money';

/** A 3x2 widget only has room for a couple of meters under the balance. */
const WIDGET_METERS = 2;

/**
 * The fullest budgets, then goals if there is room left. Budgets come first
 * because the question the widget exists to answer — "is there room?" — is a
 * budget question; a goal is progress you check, not a limit you might breach.
 *
 * Reads `effectiveBudgets` rather than recomputing, so the widget can never
 * disagree with the meters on Home.
 */
export function widgetMeters(state: AppState): {
  label: string;
  value: string;
  ratio: number;
  over: boolean;
}[] {
  const month = currentMonthKey();
  const budgets = [...effectiveBudgets(state, month)]
    .map(([categoryId, b]) => ({
      label: categoryById(state.customCategories, categoryId).name,
      value: `${formatCents(b.spentCents)} / ${formatCents(b.limitCents)}`,
      ratio: b.limitCents > 0 ? b.spentCents / b.limitCents : 1,
      over: b.spentCents > b.limitCents,
    }))
    .sort((a, b) => b.ratio - a.ratio);

  if (budgets.length >= WIDGET_METERS) return budgets.slice(0, WIDGET_METERS);

  const goals = state.goals.map((g) => {
    const { ratio, done } = goalProgress(g);
    return {
      label: g.name,
      value: `${formatCents(g.savedCents)} / ${formatCents(g.targetCents)}`,
      ratio,
      over: false,
      done,
    };
  });
  return [...budgets, ...goals].slice(0, WIDGET_METERS);
}

/** The widget's view of a state snapshot — shared by the push and the task handler. */
export function renderBudgetWidget(state: AppState): React.ReactElement {
  if (!isUnlocked(state.settings, 'widget')) {
    return React.createElement(BudgetWidget, { locked: true });
  }
  setActiveCurrency(state.settings.currencyCode);
  const month = currentMonthKey();
  const { incomeCents, expenseCents, netCents } = monthTotals(state.transactions, month);
  return React.createElement(BudgetWidget, {
    monthLabel: formatMonth(month),
    balance: formatCents(netCents),
    positive: netCents >= 0,
    income: formatCents(incomeCents),
    expense: formatCents(expenseCents),
    meters: widgetMeters(state),
  });
}

/**
 * Push a fresh render to the home-screen widget so it reflects the app
 * immediately instead of waiting for Android's update period. Android-only
 * and best-effort: no widget placed, no problem.
 */
export function refreshWidget(state: AppState): void {
  if (Platform.OS !== 'android') return;
  requestWidgetUpdate({
    widgetName: 'BudgetWidget',
    renderWidget: () => renderBudgetWidget(state),
    widgetNotFound: () => {},
  }).catch(() => {});
}
