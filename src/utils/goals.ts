import { AppState, Goal } from '../types';
import { currentMonthKey, monthsBetween, monthsUntil } from './money';
import { isUnlocked } from './premium';

export interface GoalProgress {
  ratio: number;
  done: boolean;
  remainingCents: number;
  /** Round-currency amount to save per month to hit the deadline, if one is set */
  monthlySuggestionCents?: number;
}

/**
 * Apply automatic monthly contributions that are due. A goal with
 * monthlyAutoCents saves that amount once per calendar month, starting the
 * month after it was configured, never overshooting the target. Idempotent.
 *
 * Gated here rather than only in the UI so that a backup made on a premium
 * device can't keep contributing on a device without Budget Pro.
 */
export function applyGoalAutos(state: AppState, month = currentMonthKey()): AppState {
  if (!isUnlocked(state.settings, 'goalAutos')) return state;

  let changed = false;
  const goals = state.goals.map((goal) => {
    if (!goal.monthlyAutoCents || goal.monthlyAutoCents <= 0) return goal;
    // First sighting: start the clock, don't contribute retroactively
    if (!goal.lastAutoMonth) {
      changed = true;
      return { ...goal, lastAutoMonth: month };
    }
    const monthsDue = monthsBetween(goal.lastAutoMonth, month);
    if (monthsDue <= 0) return goal;
    changed = true;
    const remaining = Math.max(0, goal.targetCents - goal.savedCents);
    return {
      ...goal,
      savedCents: goal.savedCents + Math.min(monthsDue * goal.monthlyAutoCents, remaining),
      lastAutoMonth: month,
    };
  });
  return changed ? { ...state, goals } : state;
}

/** Single definition of goal progress, shared by every screen that shows goals */
export function goalProgress(goal: Goal): GoalProgress {
  const ratio = goal.targetCents > 0 ? goal.savedCents / goal.targetCents : 0;
  const done = goal.savedCents >= goal.targetCents;
  const remainingCents = goal.targetCents - goal.savedCents;
  const monthlySuggestionCents =
    !done && goal.deadline
      ? Math.ceil(remainingCents / monthsUntil(goal.deadline) / 100) * 100
      : undefined;
  return { ratio, done, remainingCents, monthlySuggestionCents };
}
