import React from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { BudgetWidget } from '../widget/BudgetWidget';
import { AppState } from '../types';
import { monthTotals } from './aggregate';
import { isUnlocked } from './premium';
import { currentMonthKey, formatCents, formatMonth, setActiveCurrency } from './money';

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
