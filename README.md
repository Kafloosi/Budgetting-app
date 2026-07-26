# Budgetting App

A simple, phone-first budgeting app for one or more people. Built with **Expo / React Native + TypeScript**, so a single codebase runs natively on both **Android and iPhone**.

## Features

- **Quick entry** — add any income or expense in a few taps (amount, description, who it belongs to).
- **Multiple people** — track each person's incomes and expenses separately, or view everything **combined**. With a single person the multi-person options stay hidden.
- **Shared vs personal expenses** — mark an expense as *shared* to include it when settling up.
- **Split / settle up** (only shown with 2+ people) with three methods:
  - **50/50** — shared expenses split equally, half each (shown with exactly two people).
  - **Percentage** — each person pays a custom percentage of the total (must add up to 100%).
  - **Equal payments** — everyone contributes the same payment towards the total (any number of people).
  - The app shows who paid what, each person's share, and the minimal set of payments to settle up.
- **History** — saved split calculations, grouped by month and sorted latest month first.
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
