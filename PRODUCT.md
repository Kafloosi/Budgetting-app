# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

Ships today as an Expo/React Native Android APK and is written to run on iOS
without a rewrite, but it is one design language on both — it does not adapt
its look per OS. Phone-first; there is no tablet or web surface.

## Users

People who share money with someone else and want to keep it straight without
turning it into admin — most often a couple or a household of flatmates, but
the app works for one person alone. They are on a phone, usually standing in a
shop or sitting down at the end of the day, entering an amount they just spent
or checking whether there is room in a category before spending more. Entry
happens in seconds and often one-handed; review happens in longer, calmer
sittings.

## Product Purpose

Record income and expenses per person, see them separately or combined, split
shared costs fairly, and settle up. Success is that at any moment a user knows
what is left this month, and that nobody in the household is quietly carrying
more than their share.

## Positioning

Multi-person money is the core, not an add-on. Each person has their own
income and entries; shared expenses split three ways — 50/50, by percentage,
or by equal payments weighted to each person's income — with the remainder
distributed by largest-remainder so the cents always reconcile. Settlement is
a first-class record, not a calculation the user redoes in their head.

Everything is local. No account, no server, no analytics, no network calls.
That is a product commitment, not an implementation detail.

## Operating Context

Four tabs, with Home dead-centre in the tab bar. Money is entered on Add,
reviewed on Home, analysed on Stats, and reconciled between people on Split.
Recurring rules add rent, salary and subscriptions on their own. The user may
never open Stats in a given month; they will open Home and Add constantly.

## Capabilities and Constraints

Entries with categories and subcategories, recurring rules, monthly budgets
with carry-over, savings goals with auto-contributions, accounts with balances
and transfers, receipt photos, tags, quick templates, search, statistics
(6-month trend, category breakdown, year view, per-person trends, spending
calendar, net worth), forecasts, insights, settlements with paid-marking and
photos, encrypted backups, CSV export, budget alerts, settle reminders, weekly
digest, biometric app lock, currency selection, dark/auto theme, a home-screen
widget, quick actions, universal undo, onboarding, delete-all-data.

Technical constraints that bind design work:

- Expo SDK 57 / React Native 0.86 / React 19.2 / TypeScript strict. Read the
  versioned Expo docs at https://docs.expo.dev/versions/v57.0.0/ before using
  any API — remembered Expo APIs are frequently wrong.
- All money is integer cents; splits round by largest remainder.
- Sizing goes through `scale()` / `ms()` from a 375 px guideline, plus
  safe-area insets. Nothing may be hard-coded to one screen size.
- Light and dark themes are both first-class, with an auto mode following the
  OS. Any colour decision must resolve in both.
- No translations. English only, by decision.

Budget Pro (€10 one-time) gates insights, forecast, net worth, the widget,
goal auto-contributions, and unlimited custom categories. Free tier caps
custom categories at 3. Pro cannot be enforced client-side and is not
presented as if it were.

## Brand Commitments

- Minimalist, and binding. Expression comes from typography, spacing,
  proportion and restrained colour — never from ornament.
- No decorative emoji anywhere in the interface.
- Home stays dead-centre in the tab bar.
- English only.

## Evidence on Hand

The working app is the evidence: `src/screens/` for the four surfaces,
`src/components/ui.tsx` for the shared primitives, `src/theme.ts` for the
incumbent tokens. There are no customers, testimonials, benchmarks, press or
usage numbers, and none may be invented. The app is not yet in a store, so
there are no ratings or install counts.

## Product Principles

- Entry speed beats completeness. A user recording a number in a shop must not
  be made to make decisions the app could defer or infer.
- Never make the user do arithmetic the app can do.
- Money is stated plainly and exactly; no approximations in figures a user
  might act on.
- Destructive actions are always undoable rather than confirmed away.
- The app knows nothing about the user beyond what is on their phone, and says
  so honestly where it matters.
