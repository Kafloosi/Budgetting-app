# Changelog

Versioning follows the ladder in AGENTS.md: `+0.0001` for bug fixes, `+0.001`
for a one- or two-feature drop, `+0.01` for several features moving towards
the 1.0 release. Versions up to 0.813 are reconstructed from the commit
history, and were set on the earlier ten-times-coarser ladder.

## 0.8674

The restructure pass, applied. No behaviour change: all 159 existing
assertions pass untouched, plus 19 new ones proving the newly shared paths
answer identically to the code they replaced.

**The envelope rule is stated once.** `effectiveTagBudgets` had restated
`effectiveBudgets`'s entire carry-over frame — the rollover window, the carry
reduce, the never-below-zero clamp — so the app's most load-bearing money rule
lived in two places and could drift between the meters on one screen. Both now
call one `applyCarryOver`, differing only in what they are keyed by.
`budgets.ts` drops from 191 lines to 154.

**One aggregation pass for categories and tags.** `expenseCentsByKeyPerPeriod`
takes a key extractor, so an entry mapping to one category or to many tags is
the same loop. "How an entry counts towards a tag" was stated in three places.

**One settings list row.** `SettingRow` replaces the row open-coded in eight
sections, with a `flush` variant for rows that sit inside their own container.

**One budget meter card.** Category and tag meters render identically and had
already drifted — one sorted by fullness, the other alphabetically.

**Persistence is debounced (400ms).** `saveState` serializes the whole ledger
including 30 days of trash, and `refreshWidget` re-scans a year of history and
crosses the native bridge; both ran synchronously on every state change,
including theme toggles and modal dismissals.

**Stats honours the narrowed budget type.** It memoized on the whole `state`,
defeating the `BudgetInput` type built specifically to let callers key on four
fields — a year scan on every unrelated change while the screen was mounted.

Also: Home no longer filters history twice per person, `EVERYONE`/`personScope`
replace two different sentinels for the same concept, `trashedId` splits
identity out of the display helper, `isLiability` moves out of the pure type
declarations, and every import orphaned by the above is gone.

## 0.8673

Eleven bugs found by a full audit, all fixed. Three were critical and all
three silently corrupted money in the CSV importer shipped in 0.8672.

**Direction columns were found and then discarded.** Debit/credit columns were
only consulted when the amount column failed to parse, so a statement with one
amount column plus an "Af Bij" direction column imported every expense as
income — a 40-row statement wrong by twice its total, with every budget meter
reading zero spent. Direction indicators are now told apart from debit/credit
*amount* columns and override the sign.

**One decimal digit was read as a thousands group.** A separator was only
accepted as decimal with exactly two digits after it, so "-3.5" imported as
€35.00 rather than €3.50 — a tenfold inflation, not reported as a problem row.
Three digits is the thousands convention; one or two is a decimal.

**A currency symbol in front of the minus flipped the sign.** "€-45,00" became
+€45.00 income. The sign is now read after stripping currency, not only at the
ends of the raw cell.

**Undo-then-Restore duplicated a recurring rule.** Its undo re-added the rule
without clearing its trash entry, so restoring afterwards produced two rules
with one id — `catchUp` materialized both, giving double rent every month,
while edits patched only one copy. Undo now goes through `restoreEntry` like
every other delete.

**The import confirmation made a false promise.** It said the import could be
undone from the trash; nothing was written there. A new `addTransactions` adds
the whole statement as one undoable action, which also removes the quadratic
copy of adding rows one at a time.

**Impossible dates were accepted.** "2026-13-45" passed the ISO branch
untouched and produced a month key no view can match; "31/02/2026" was filed in
February by month logic and in March by week logic, so one shared expense could
be settled twice or never. Both branches now validate against real month
lengths, leap years included.

Also fixed: trash entries with an unreadable timestamp never expired and pinned
their receipt photos; "today" and "this month" were UTC, so east of UTC the app
opened on the wrong month and new entries defaulted to yesterday; all-zero
percentages showed a total alongside "nobody owes anything"; the import's
"Importing…" state was unreachable; and deleting a person left their trashed
entries and per-person budgets behind, so a later restore returned an entry
belonging to nobody.

33 new regression assertions, 159 in total across seven suites.

## 0.8672

CSV bank statement import — the last of the five, and the largest.

Bank CSVs agree on almost nothing, so `csvImport.ts` parses defensively and
reports what it could not read rather than guessing: a wrong amount is worse
than a skipped row, because a skipped row is visible and a wrong one is not.
It handles comma, semicolon and tab delimiters, quoted fields containing the
delimiter, doubled quotes, European (1.234,56) and Anglo (1,234.56) decimals,
leading, trailing and parenthesised negatives, ISO and d/m/y and m/d/y dates
with two- or four-digit years, and either a signed amount column or separate
debit/credit columns.

Date ambiguity is asked, not guessed. 03/04/2026 is a real date under both
readings, and picking silently would misfile entries by up to eleven months,
so the import screen shows how the first row reads and lets the order be
flipped without re-picking the file.

Duplicates are matched on date, amount and direction rather than the
description, because banks reword descriptions between exports. Deliberately
conservative: a genuine second identical purchase on the same day is flagged,
which the user can override, since silently doubling their spending is the
worse failure.

Import is two-step — read and review, then confirm — and imported entries are
never marked shared, because a bank cannot know that.

46 assertions on the parser alone, one of which caught a real bug: with no
decimal separator only commas were stripped, so "1.234" parsed as 1.234
rather than 1234.

## 0.8572

Per-entry custom split. The split method was global, so one dinner being 70/30
meant changing how every shared expense was split. An expense can now carry
its own per-person weights that override the household method for that entry
alone.

Weights, not percentages: they are normalized when the share is computed, so
70/30 and 7/3 mean the same thing and nothing has to add to 100. An override
with everyone at zero, or one naming only people who have since been removed,
falls back to the household method rather than assigning the amount to nobody.

The arithmetic changed shape to keep the cents exact. A single
largest-remainder pass over a mixed total would not reconcile, so entries with
their own weights are distributed individually and the rest share one pass of
the household method; summing exact distributions stays exact.

Per-entry weights are stripped at the recurring-rule and template boundaries,
the same way receipt photos already were — a spread would otherwise smuggle
them past the type, and neither a rule nor a template has one occurrence to
split.

15 assertions: override beats method, weights normalize, mixed custom and
standard entries reconcile, odd cents land exactly, stale overrides fall back,
and a zero-weight person owes nothing.

## 0.8562

Budget and goal meters on the home-screen widget. The widget showed month
totals only, so the question it exists to answer — "is there room in
groceries?" — still needed the phone unlocked. It now carries the two fullest
budget meters under the balance, falling back to goals when no budgets are
set, since a goal is progress you check rather than a limit you might breach.

`widgetMeters()` reads `effectiveBudgets` rather than recomputing, so the
widget can never disagree with Home. The widget layer has no percentage
widths, so the meter is a track and a fill at fixed dp, clamped 2-100% exactly
as `Meter` does in the app.

10 assertions: ordering by fullness, the two-meter cap, over-budget flagging,
the goal fallback and its ratio, the mixed budget-plus-goal case, and the
empty case.

## 0.8552

Settle a single tag. `sharedExpensesForPeriod` and `computeSettlement` take an
optional tag, so a holiday or a renovation can be squared up on its own
without touching the rest of the month — which is how a one-off project is
normally settled in practice. A scope picker appears on Split whenever the
period's shared expenses carry tags, and the settlement record stores the tag
so history says what it covered rather than looking like a duplicate of the
month it sits under.

The scope self-corrects: a tag that stops appearing in the period stops
filtering, rather than silently narrowing the calculation to nothing.

13 assertions: tag scoping still excludes non-shared expenses and other
periods, tag listing is sorted and deduped, and a tag-only settlement
reconciles to zero with largest-remainder rounding intact on an odd total.

## 0.8542

The trash now covers more than entries. `AppState.trash` became a
discriminated union (`TrashedItem`), so goals, quick templates and recurring
rules are recoverable for the same 30 days rather than being destroyed the
moment the undo snackbar fades. One `restoreEntry` switches on `kind`, so
there is still exactly one restore path rather than one per type.

Deliberately excluded, and the Trash screen says so: people, accounts and
categories. Their deletion cascades — removing a person deletes their entries,
removing a category drops its budgets and refiles everything under it — so
handing one back alone would restore less than was lost. A recurring rule is
trashed only when its generated entries were kept; "delete entries too" is a
cascade and stays out for the same reason.

Trash written before the union has no `kind`, so `migrate()` defaults it to
`transaction`. `withTrashed` now filters to entries, since the receipt sweep
only cares about those.

## 0.8532

Four features.

**A 30-day trash.** Deleting an entry now moves it to `state.trash` rather
than dropping it — the undo snackbar only ever covered the next few seconds,
and a mistake noticed at the end of the month was unrecoverable. Entries wait
30 days, are swept by `catchUp` on foreground, and never count towards a
total, budget or settlement while they wait. Undo and Restore share one
transform so they cannot drift. Emptying the trash is itself undoable, and
`reconcileReceipts` now counts trashed entries so restoring one still has its
receipt photo.

**Tag budgets.** `effectiveTagBudgets()` caps a project — a renovation, a
holiday — across every category it runs through, with the same carry-over rule
as category budgets. Tags overlap by design, so these are deliberately never
summed with category budgets; they are a second, independent view of the same
spending, and get their own meters on Home.

**Per-person budgets.** `effectiveBudgets()` takes an optional person: their
own limit replaces the household one for that category, only their entries
count against it, and categories they set nothing for fall back to the shared
limit. Home follows the person selector, so switching to one person shows
their budget rather than the household's. Combined is unchanged.

**Debt and loan accounts.** A new `debt` account kind holds what is owed as a
negative balance, which means spending on it deepens the debt, a transfer into
it is a repayment, and net worth counts it against you — all without a special
case anywhere in the arithmetic. Only the labelling differs.

32 assertions cover the new logic: per-person limits and fallback, tag spend
across categories and scoped per person, carry-over for both, trash retention
boundaries at days 29/30, and debt balances through spending, repayment and
net worth.

From the restructure pass: `restoreFromTrash` was a verbatim copy of the undo
closure and is now one shared `restoreEntry`; a stray `purgeExpired` import
and a speculative `payoffTargetCents` field with no writer were removed.

## 0.8432

The two things the finish review said the redesign had not reached.

**The plane slide**, the motion the world is named for, now exists —
`SlidingPlane` in `ui.tsx`. When the view re-partitions, the plane travels into
its new position on an exponential ease-out and the edge it moved from carries
colour for the length of the movement. Home uses it when the person changes,
Stats when the period does. One `Animated` driver runs 1 → 0 and both the
travel and the edge resolve from it, so there is a single curve. Nothing else
in the app animates.

**Vertical division.** Every plane had been a horizontal band of identical
width; Rietveld divides both axes into unequal parts. `LedgerRow` splits a row
with an off-centre rule into a label column and a figure column, so figures
bank right against a drawn line. It replaces the hand-rolled name-and-amount
rows on Home (the flow rows and the account list), Stats (the day breakdown)
and Split (the settlement results) — which removed nine dead style keys and a
second definition of `meterName` that had already started to drift.

The Add form was ten stacked planes each drawing its own structural rule; it is
now one plane of hairline-divided fields via `Card divider="hairline"`.

From the restructure pass: `SlidingPlane`'s `overflow: hidden` was clipping the
full-bleed planes inside it back to the gutter, which would have quietly undone
the plane grammar wherever the slide was used — the wrapper now bleeds to match.
Both rule variants moved to `borderTop` so a run never stacks a hairline against
the structural rule closing it.

## 0.8332

Fixes from the impeccable finish review of the 0.8331 redesign. The most
serious was that `Dot`, `Meter` and `MeterRow` still pointed at the old static
stylesheet, so the 4px edge marker DESIGN.md describes was written but never
rendered — the round dot was still live. The floating shadowed circle of the
add button became a square ink plane flush to the screen edge; the tab bar is
now closed by a structural rule rather than a hairline; and the transaction
list is one plane with hairline-divided rows instead of forty stacked planes
each drawing its own 2px rule.

Contrast: filled buttons, chips and segmented controls derived their label
colour from `colors.white`, which failed on the lighter fills — white on the
yellow person colour was 1.85:1. `onColor()` now picks ink or paper from the
fill's own luminance. The hairline rule was nearly invisible at 1.66:1 and has
been darkened, which matters in a world whose entire separation mechanism is a
drawn line.

Also removed: the last tracked-uppercase eyebrow, a nested tinted box inside a
plane on Split, coloured borders above 1px, the elevation and shadow stack on
the undo snackbar, and every remaining rounded corner. Category colours moved
off the nine-hue rainbow onto the world's own range, since they land on every
row marker and budget meter.

Since 0.8331 never shipped as an APK, the in-app release note is a single
entry covering the whole redesign rather than two describing the same change.

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
