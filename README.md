# Lönetracker

A web app for turning a work schedule into actual pay, including Swedish OB
(*obekväm arbetstid*) supplements. Upload a schedule, get gross pay, tax and net
pay — with every hour attributed to the rule that paid for it.

This is a generalized rebuild of an earlier version that hardcoded one store's
OB windows. Here the rules are data you edit, so the app fits any schedule.

## Why this exists

Swedish retail and service schedules come with OB surcharges that depend on the
day and the time of day. Working them out by hand for every shift, every pay
period, gets old fast — and it is easy to be quietly underpaid without a way to
check. This app does the arithmetic and shows its work.

## What it does

- Reads a schedule from `.csv` or `.xlsx` (columns `Datum`/`Date`,
  `Start`, `Slut`/`End`, with an optional `Rast`/`Break`)
- Splits every shift across configurable OB tiers by weekday and time of day
- Handles shifts that run past midnight, applying the *next* day's rules to the
  hours after 00:00
- Spreads unpaid breaks proportionally across tiers, so a break never silently
  eats the best-paid hours
- Shows gross pay, tax at a configurable rate, and net pay, plus a per-shift
  breakdown you can expand
- Swedish and English, switchable
- Installable as a PWA; everything is stored in the browser's local storage

## OB rules are configurable

The core idea. A rule set is a list of **tiers** (a name and a supplement
percentage) and a list of **time windows** (weekdays, a start and end time, and
the tier they pay). Any hour not covered by a window pays the base rate only.

The bundled **Handels – detaljhandel** preset mirrors a typical retail schedule:

| When | Pays |
| --- | --- |
| Mon–Fri 18:00–20:00 | OB 50% |
| Mon–Fri 20:00–24:00 | OB 70% |
| Sat 12:00–24:00 | OB 100% |
| Sun 00:00–24:00 | OB 100% |

It is a starting point, not legal advice — check it against your own
kollektivavtal before trusting the numbers.

Supplements are paid **on top of** the base rate: an hour at OB 50% with a base
of 177.44 kr/h pays 177.44 + 88.72 kr.

## Privacy

There is no backend, no account, and no analytics. The schedule is parsed in the
browser and the results never leave it.

## Tech

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4. Every route is
statically prerendered — the app is entirely client-side.

The `.xlsx` reader is hand-rolled: it walks the zip's central directory and
inflates the entries with the browser's built-in `DecompressionStream`, so the
app ships no spreadsheet dependency. Persisted state is exposed to React through
`useSyncExternalStore`, which also picks up changes from other open tabs.

```
lib/
  rules.ts    tiers, windows, presets, validation
  calc.ts     shift splitting and pay totals
  parse.ts    csv + xlsx readers, schedule column detection
  storage.ts  localStorage load/save
  store.ts    useSyncExternalStore bindings
  i18n.ts     sv/en strings
  time.ts     time parsing and formatting
```

## Running it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.
