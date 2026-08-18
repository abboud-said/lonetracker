# Lönetracker

A web app for hourly-paid retail workers in Sweden. Upload your schedule, get
what the month actually pays — OB (*obekväm arbetstid*) supplements, tax and net
pay, with every hour attributed to the rule that paid for it.

## Who it's for

Detaljhandelsavtalet §7.3 settles the pay form: a **heltidsanställd** is always
on månadslön, while a **deltidsanställd** is on timlön by default, moving to
månadslön only if their hours are averaged over 11+ weeks or they agree to it.

Someone on a monthly salary already knows roughly what lands in their account.
Someone paid by the hour, on a schedule that shifts week to week with OB spread
unevenly across it, does not. That second group is who this is for — part-time
store staff, which is most of Swedish retail.

## What it does

- Reads a schedule from `.csv` or `.xlsx` (columns `Datum`/`Date`,
  `Start`, `Slut`/`End`, with an optional `Rast`/`Break`)
- Splits every shift across OB tiers by day type and time of day
- Handles shifts running past midnight, applying the *next* day's rules to the
  hours after 00:00
- Flags shifts over five hours with no break recorded
- Shows gross pay, tax at a configurable rate, and net pay, plus a per-shift
  breakdown you can expand
- Swedish and English, switchable
- Installable as a PWA; everything is stored in the browser's local storage

## The OB rules

Taken verbatim from §8.1 of Detaljhandelsavtalet, 1 April 2025 – 31 March 2027
(Svensk Handel / Handelsanställdas förbund):

| When | Pays |
| --- | --- |
| måndag–fredag kl. 18.15 – 20.00 | 50 % |
| måndag–fredag efter kl. 20.00 | 70 % |
| lördagar efter kl. 12.00 | 100 % |
| söndagar och helgdagar | 100 % |

> Med lördagar jämställs jul-, nyårs- och midsommarafton.

Supplements are paid **on top of** the base rate: an hour at OB 50% with a base
of 177.44 kr/h pays 177.44 + 88.72 kr.

### Rules are data, not code

A rule set is a list of **tiers** (a name and a supplement percentage) and a
list of **time windows** (day types, a start and end time, and the tier they
pay). Any hour not covered by a window pays the base rate only. The preset is
just the starting point — a different agreement, or a local addition like Coop's
extra 05.00–06.00 tier, can be entered by hand.

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

## Not covered

- **Övertid and mertid.** §8.1 notes that where overtime and OB overlap you get
  only the higher percentage, not both. Not modelled.
- **Månadslön.** §8.1 derives the hourly rate as 1/166 of monthly salary. Out of
  scope by design — see *Who it's for*.
- **Agreements other than Detaljhandelsavtalet.** Lager- och e-handel has its
  own rates and its own structure; rather than ship figures taken from a summary
  page, there is no preset for it. Build the windows by hand if you need them.

## Privacy

There is no backend, no account, and no analytics. The schedule is parsed in the
browser and the results never leave it.

## Sources

- [Detaljhandelsavtalet 2025–2027 (PDF)](https://www.handels.se/globalassets/avtalsrorelsen/ag-hang/da110.pdf) — §6.1, §6.5, §7.3, §8.1
- [Handels: OB-tillägg](https://www.handels.se/fakta-och-rad/lon-ob/ob-tillagg/)
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
  rules.ts     tiers, windows, preset, day classification, validation
  holidays.ts  svenska helgdagar, incl. Easter-derived dates
  calc.ts      shift splitting and pay totals
  parse.ts     csv + xlsx readers, schedule column detection
  storage.ts   localStorage load/save
  store.ts     useSyncExternalStore bindings
  i18n.ts      sv/en strings
  time.ts      time parsing and formatting
```

## Running it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.
