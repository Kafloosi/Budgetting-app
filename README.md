# Budgetting App

A simple, phone-first budgeting app for one or more people. Built with **Expo / React Native + TypeScript**, so a single codebase runs natively on both **Android and iPhone**.

## Features

- **First-launch setup** — on first start the app asks who the budget is for: add the people and each person's regular income (weekly, bi-weekly or monthly).
- **Quick entry** — add any income or expense in a few taps (amount, description, who it belongs to).
- **Multiple people** — track each person's incomes and expenses separately, or view everything **combined**. With a single person the multi-person options stay hidden.
- **Shared vs personal expenses** — mark an expense as *shared* to include it when settling up.
- **Split / settle up** (only shown with 2+ people), per month **or per week**, with three methods:
  - **50/50** — shared expenses split equally, half each (shown with exactly two people).
  - **Percentage** — each person pays a custom percentage of the total (must add up to 100%).
  - **Equal payments** — based on income: each person pays in proportion to what they earn, so the burden is equal. Falls back to an even split when no incomes are set.
  - The app shows who paid what, each person's share, and the minimal set of payments to settle up.
- **History** — saved split calculations with a **Monthly / Weekly** toggle, grouped by period and sorted latest first, with a **mark-as-paid** toggle per settlement.
- **Budget alerts** — optional notifications when a category reaches 85% or exceeds its monthly budget.
- **Savings goals** — targets with optional deadline, manual contributions, progress bars, and a suggested monthly set-aside.
- **Receipt photos** — attach a camera/library photo to any entry; unreferenced photo files are cleaned up automatically.
- **Year view** — Stats can switch between month view and a full-year overview (12-month chart + yearly category breakdown).
- **Quick add** — long-press the app icon for an "Add entry" shortcut.
- **Settle-up reminder** — optional notification on the 1st of each month (shown with 2+ people).
- **Undo** — deleting an entry shows an "UNDO" bar for 5 seconds.
- **Full-screen receipts** — tap an attached photo to view it full screen.

### Budget Pro (one-time €10 unlock)

Core budgeting, splitting, history, and backups are always free. Budget Pro adds:

- **Insights** — plain-language monthly analysis (spend vs last month, top category, daily average, biggest expense, income left).
- **Home-screen widget** — this month's balance on your Android home screen, refreshed whenever the app saves.
- **Automatic goal contributions** — a goal can save a fixed amount every month by itself.

Unlocking is a single switch (`settings.premium`) resolved through `isUnlocked()` in
`src/utils/premium.ts`. Today it flips via an unlock code redeemed in Settings; a store
in-app purchase (Google Play Billing / Apple IAP, required by store policy for digital
goods) plugs into the same function without touching any call site.
- **Categories** — every expense gets a category (10 built-in + your own custom ones).
- **Recurring entries** — set an entry to repeat weekly, bi-weekly, or monthly (rent, salary, subscriptions); future occurrences are added automatically.
- **Editing** — tap any entry to edit it, pick any past date when adding.
- **Budgets** — monthly spending limits per category with progress bars and over-budget warnings.
- **Stats** — income vs expenses over the last 6 months, spending by category, budget progress.
- **Search & filters** — search entries by text or category, filter income/expenses.
- **Export / import** — JSON backup and CSV export via the share sheet; import a backup to move to a new phone.
- **App lock** — optional fingerprint/face unlock via the phone's biometrics.
- **Currency setting** — €, $, £, CHF, kr, zł and more (display symbol only).
- **No time travel** — only the current or past months/weeks can be selected, never future ones.
- **Dark mode** — Light, Dark, or Auto (follows the phone's system setting), switchable in Settings.
- **Responsive** — all sizes and fonts scale with the phone's screen width, and safe-area insets are respected (notches, home indicator).
- **Offline & private** — all data is stored locally on the device (AsyncStorage). No account, no server.

All money amounts are stored as integer cents, so totals are always exact and split shares always add up to the total (largest-remainder rounding).

## Getting started

```bash
npm install
npm start          # starts the Expo dev server
```

Then:

- **On your phone**: install the **Expo Go** app (Android/iOS) and scan the QR code shown in the terminal.
- **Android emulator**: `npm run android`
- **iOS simulator** (macOS only): `npm run ios`
- **Browser preview**: `npm run web`

## Building store-ready apps

The project is a standard Expo app, so production builds for the Play Store and App Store are done with [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npx eas build --platform android
npx eas build --platform ios
```

## Project structure

```
App.tsx                     app shell + bottom tab navigation
src/
  theme.ts                  colors, spacing, responsive scale helpers
  types.ts                  data model (Person, Transaction, SettlementRecord)
  storage.ts                AsyncStorage persistence
  context/AppContext.tsx    global state + actions
  utils/money.ts            money parsing/formatting (integer cents)
  utils/split.ts            settlement math (50/50, percentage, equal payments)
  components/ui.tsx         reusable UI building blocks
  screens/                  Home, Add, Split, History, People
```
