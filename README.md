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

A rule set is a list of **tiers** (a name and a supplement percentage) and a
list of **time windows** (which day types, a start and end time, and the tier
they pay). Any hour not covered by a window pays the base rate only.

Supplements are paid **on top of** the base rate: an hour at OB 50% with a base
of 177.44 kr/h pays 177.44 + 88.72 kr.

### Detaljhandel (butik)

Taken verbatim from §8.1 of Detaljhandelsavtalet, 1 April 2025 – 31 March 2027:

| When | Pays |
| --- | --- |
| måndag–fredag kl. 18.15 – 20.00 | 50 % |
| måndag–fredag efter kl. 20.00 | 70 % |
| lördagar efter kl. 12.00 | 100 % |
| söndagar och helgdagar | 100 % |

> Med lördagar jämställs jul-, nyårs- och midsommarafton.

### Lager & e-handel

| When | Pays |
| --- | --- |
| måndag–fredag 00.00 – 06.00 | 70 % |
| måndag–fredag 06.00 – 07.00 | 40 % |
| måndag–fredag 18.00 – 23.00 | 40 % |
| måndag–fredag 23.00 – 24.00 | 70 % |
| lördag 00.00 – 06.00 | 70 % |
| lördag 06.00 – 23.00 | 40 % |
| lördag 23.00 – 24.00 | 70 % |
| söndagar och helgdagar | 100 % |

This one comes from Handels' published summary rather than the agreement text,
so check it against your own avtal.

### Day types, not just weekdays

A window targets **day types**, which is what makes "söndagar och helgdagar"
work. Beyond the seven weekdays there are two more:

- **Helgdag** — Swedish public holidays, computed per year including the
  Easter-derived ones, midsommardagen and alla helgons dag. A Thursday that is
  Kristi himmelsfärdsdag pays holiday rates all day.
- **Afton** — julafton, nyårsafton and midsommarafton, which §8.1 equates with
  Saturdays. A Sunday stays a Sunday even when it is also an eve, since the
  Sunday rate is the higher of the two.

## Breaks

Detaljhandelsavtalet sets **no** minimum or maximum length for a rast — the
schedule decides. What it does settle is whether the time is paid:

- **Rast** is unpaid and not counted as working time (§6.1), so it is deducted
  by default. Because a schedule rarely says *when* the break fell, it is spread
  proportionally across the tiers rather than taken off the end — otherwise it
  would silently eat the best-paid hours.
- **Måltidsuppehåll** (§6.5, allowed only in exceptional situations) and shorter
  **pauser** under arbetstidslagen do count as working time. Tick *"Rasten är
  betald"* and nothing is deducted.

Arbetstidslagen §15 entitles you to a rast after at most five hours of work, so
any shift longer than that with no break in the file is flagged — usually it
means the export left the break out.

## Privacy

There is no backend, no account, and no analytics. The schedule is parsed in the
browser and the results never leave it.

## Sources

- [Detaljhandelsavtalet 2025–2027 (PDF)](https://www.handels.se/globalassets/avtalsrorelsen/ag-hang/da110.pdf) — §6.1, §6.5, §8.1
- [Handels: OB-tillägg](https://www.handels.se/fakta-och-rad/lon-ob/ob-tillagg/) — lager & e-handel rates
- [Handels: När har jag rätt till rast och paus?](https://www.handels.se/fakta-och-rad/faq/g154-naer-har-jag-raett-till-rast-och-paus)

Agreement periods change. If you are reading this after April 2027, re-check the
figures against the current avtal.

## Tech

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4. Every route is
statically prerendered — the app is entirely client-side.

The `.xlsx` reader is hand-rolled: it walks the zip's central directory and
inflates the entries with the browser's built-in `DecompressionStream`, so the
app ships no spreadsheet dependency. Persisted state is exposed to React through
`useSyncExternalStore`, which also picks up changes from other open tabs.

```
lib/
  rules.ts    tiers, windows, presets, day classification, validation
  holidays.ts svenska helgdagar, incl. Easter-derived dates
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
