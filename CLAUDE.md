@AGENTS.md

# Lönetracker

Pay for hourly-paid Swedish retail workers on Detaljhandelsavtalet: OB
supplements, tax, net pay, every hour attributed to the rule that paid for it.
Entirely client-side — no backend, no account, no analytics, and the schedule
never leaves the browser. `README.md` covers the domain rules in full.

## Things that are easy to get wrong

**Pay is one month in arrears.** Hours worked in June are paid on the lönebesked
headed juli. Comparing a month in the app against the payslip with the same name
compares two different months and makes a correct app look broken. See
[docs/lonebesked.md](docs/lonebesked.md).

**Tax is not a percentage.** It is an amount per income bracket from
Skatteverket's skattetabell, chosen by kommun, and the rate it implies rises
with the month. `lib/skattetabell.ts` is generated — see
[docs/skatt.md](docs/skatt.md) before touching it or the tax year rolls over.

**OB hours sit inside the base hours.** Every hour pays the base rate; a tier
adds a supplement on top. They are not separate pools.

**A green build is not evidence.** `tsc` and `next build` have both passed on a
change that left the browser bundle broken. Open the page.

**Turbopack does not run on Windows here** — Application Control blocks the
native SWC binary. Use `npx next dev --webpack`.

## The bar for a change that touches money

This app exists so someone can hold its number against their own payslip. A
figure that is wrong in the direction of *more* is worse than one that is
wrong in the direction of *less*, and a figure that is silently incomplete is
worse than both.

So: never let an unset value quietly shrink a total. If something needed is
missing, say so on screen and say what the total excludes — the way the app now
does for an unknown tax rate. Two of the worst bugs found so far were of exactly
this kind: a break that failed to parse became no break at all, and a guessed
tax rate drove the largest figure on the page.

Verify against something outside the app's own arithmetic. Hand-checked figures
from a real lönebesked beat any number of self-consistent tests.

## Layout

```
app/         routes; one page, statically prerendered
components/  UI
lib/         rules, holidays, calc, parse, storage, i18n, skattetabell
docs/        payslip reconciliation, tax, testing
e2e/         Playwright acceptance suite (not wired into package.json)
```

Swedish payroll terms stay in Swedish throughout, in code and in copy —
lönebesked, OB, karens, semesterlön, timlön, rast.
