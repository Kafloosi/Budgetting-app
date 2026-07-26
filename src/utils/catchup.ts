import { AppState } from '../types';
import { applyRecurring } from './recurring';
import { applyGoalAutos } from './goals';
import { todayIso } from './money';

/**
 * Advance state to "now": materialize due recurring entries, then apply due
 * automatic goal contributions (in that order, so a goal auto can act on a
 * month a recurring income just created).
 *
 * This is the single definition of the clock-advance pipeline — used when
 * loading from disk, importing a backup, and returning to the foreground.
 * Only call it where the result can be persisted; read-only consumers such
 * as the widget must use storage.readState instead.
 */
export function catchUp(state: AppState, today = todayIso()): AppState {
  return applyGoalAutos(applyRecurring(state, today), today.slice(0, 7));
}
