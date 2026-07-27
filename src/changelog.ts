/**
 * Release notes in the user's words, shown once on the first launch after an
 * update. CHANGELOG.md is the developer's record of every drop; this is the
 * short version worth interrupting someone for, so it only carries releases
 * that changed something they can see.
 */
export interface ReleaseNote {
  version: string;
  highlights: string[];
}

/** Newest first */
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '0.8532',
    highlights: [
      'Deleted entries now wait in a trash for 30 days, so a mistake you spot later can still be put right — Settings → Trash.',
      'Tag budgets: cap a whole project, like a renovation or a holiday, across every category it touches.',
      'Budgets can now belong to one person instead of the household, and the Home tab follows whoever you have selected.',
      'Debt accounts for a card or a loan: spending adds to what you owe, paying in reduces it, and your net worth finally counts it.',
    ],
  },
  {
    version: '0.8432',
    highlights: [
      'A completely new look. Panels now run edge to edge and are separated by clean lines instead of floating boxes with rounded corners and shadows.',
      'Amounts are set in aligned figures, so columns of numbers line up and are far easier to scan.',
      'Colour now means something: blue for money in, red for money out, yellow when you are close to a limit.',
      'Category and person colours are now a clean edge marker beside each row instead of a round dot.',
      'Switching between people, or between month and year, now slides the panel into place and marks the edge it came from.',
      'Amounts across Stats, Split and your account list are lined up in a proper column against a divider, so they are easy to compare at a glance.',
      'Nothing moved and nothing was removed — same tabs, same features, same numbers.',
    ],
  },
  {
    version: '0.8231',
    highlights: [
      'Tidied up the app’s insides so future updates arrive faster and screens stay consistent with each other.',
      'Nothing has moved: the only visible change is that the dots next to budgets and goals on the Home tab now match the ones everywhere else.',
    ],
  },
  {
    version: '0.823',
    highlights: [
      'Quick templates — save an entry you make often and put it back in with one tap.',
      'Tags on entries, so a holiday or a renovation can be totalled across categories.',
      'Budgets can carry over: what you don’t spend moves to next month, what you overspend comes off it.',
      'A spending calendar on the Stats tab — tap any day to see what went out.',
      'Net worth tracked month by month (Budget Pro).',
      'What’s new appears here after every update.',
    ],
  },
  {
    version: '0.813',
    highlights: [
      'Version numbers, visible under Settings → About.',
      'Fixed: editing an older entry could silently move it into another account.',
      'Fixed: switching on the app lock locked you straight back out.',
    ],
  },
];

/**
 * Releases newer than the one last seen, newest first. Versions are plain
 * decimals, so comparing them numerically is the whole ordering rule.
 *
 * No last-seen version means an install from before these notes existed;
 * that gets the current release only, rather than the entire history.
 */
export function notesSince(lastSeenVersion: string | undefined): ReleaseNote[] {
  const seen = Number(lastSeenVersion);
  if (!Number.isFinite(seen)) return RELEASE_NOTES.slice(0, 1);
  return RELEASE_NOTES.filter((note) => Number(note.version) > seen);
}
