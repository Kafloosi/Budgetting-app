# Changelog

Versioning follows the ladder in AGENTS.md: `+0.0001` for bug fixes, `+0.001`
for a one- or two-feature drop, `+0.01` for several features moving towards
the 1.0 release. Versions up to 0.813 are reconstructed from the commit
history, and were set on the earlier ten-times-coarser ladder.

## 0.8331

A new visual world, chosen with the `/impeccable` design skill and recorded in
DESIGN.md: the Rietveld Schröder house, where sliding planes make one small
room into many. The app does the same job with money — one set of it,
partitioned per person or combined — so the house is the system rather than a
decoration.

What changed everywhere at once, through `src/theme.ts` and
`src/components/ui.tsx`: cards became planes that run edge to edge and are
divided by structural rules, so nothing floats; every corner radius went to
zero and every shadow was removed, because this world separates with a drawn
line and not with blur; the palette moved to neutral grounds with red, blue
and yellow rationed to edges that carry meaning — blue in, red out, yellow
near a limit; and every figure in the app is now set in tabular numerals so
columns of digits line up down the screen.

Category colour is now a 4px edge marker against the rule rather than a filled
chip, section labels are lowercase instead of tracked uppercase, and Home's
balance is set flush left at display scale with `in` and `out` beneath it in
one ruled column.

PRODUCT.md records the product truth this rests on. The four tabs and Home's
centre position are unchanged, as are every feature, figure and behaviour —
this drop changes how the app looks, not what it does.

## 0.8231

Internal restructuring, no new features. The four pieces of UI that had been
copy-pasted between screens — the coloured dot, the progress meter, the
labelled meter row, and the full-screen receipt viewer — are now single
components in `src/components/ui.tsx`, so the app cannot drift between
surfaces again. The 1,326-line `SettingsScreen` is split into one component
per section under `src/screens/settings/`, each owning its own state and
reading the app context directly instead of taking props from one parent;
`SettingsScreen` is now just the order the sections appear in. The six
title/description/switch rows collapsed into a shared `ToggleRow`. Budget and
goal dots on the Home tab are now the same size as everywhere else. The
gstack skill symlinks are gitignored, since they point into a clone that
isn't committed.

## 0.823

Quick entry templates, tags on entries, budget carry-over between months, a
spending calendar with day drill-down on the Stats tab, and net worth tracked
month by month (Budget Pro). Release notes now appear in the app on the first
launch after an update. The increments on the version ladder each moved one
decimal place right, leaving room to reach 1.0 without inflating drops.

## 0.813

Bug fixes from a full audit: editing an entry created before accounts existed
silently moved it into the first account; enabling the app lock locked the user
out immediately after they had just authenticated to enable it; the weekly
digest rescheduled a native notification on every entry change.

## 0.812

Bug fixes from the restructure review: subcategory budgets always read zero;
undo reverted unrelated changes because it snapshotted global state; deleting a
category orphaned its children's budgets into a phantom "Other" bar; account
transfers could be created but never deleted.

## 0.811

Accounts: cash, bank, and savings accounts with opening balances, entries
assigned to an account, transfers between accounts, and live balances.

## 0.801

Recurring-rule editing, universal undo for deletions, password-encrypted
backups that can include receipt photos, and richer history filters.

## 0.701

Bug fix: an edited backup file could grant the Pro unlock on import.

## 0.7

Minimal design pass — no decorative emoji, colored dots instead — plus
subcategories, a Home-centred tab layout with savings goals and budgets moved
to Home, a three-category cap on the free plan, and the privacy pass with
"Delete all data".

## 0.6

Spending forecast, all-time search, and Pro purchase restore.

## 0.5

Budget Pro with a one-time unlock, spending insights, automatic goal
contributions, the home-screen widget, settle reminders, undo, and a new app
icon.

## 0.4

Paid settlements, budget alerts, savings goals, receipt photos, the year view,
and quick add.

## 0.3

Categories, recurring entries, budgets, the stats screen, entry editing,
backups, app lock, and currency selection.

## 0.2

Dark mode with an auto option that follows the phone, first-launch onboarding,
income-based equal splitting, weekly periods in history, and a block on
selecting future months.

## 0.1

The first working app: income and expense entry, multiple people with separate
and combined views, 50/50, percentage, and equal-payment splits, settlement
history sorted by latest month, and a layout that scales to the phone.
