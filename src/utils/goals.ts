import { Goal } from '../types';
import { monthsUntil } from './money';

export interface GoalProgress {
  ratio: number;
  done: boolean;
  remainingCents: number;
  /** Round-currency amount to save per month to hit the deadline, if one is set */
  monthlySuggestionCents?: number;
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
