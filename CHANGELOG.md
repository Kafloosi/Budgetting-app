# Changelog

Versioning follows the ladder in AGENTS.md: `+0.001` for bug fixes, `+0.01`
for a one- or two-feature drop, `+0.1` for several features moving towards the
1.0 release. Versions below are reconstructed from the commit history up to
the point the scheme was adopted.

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
