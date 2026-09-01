# Reading a lönebesked against the app

Everything here is drawn from real Bestseller payslips. If a figure below stops
matching, the app changed or the avtal did — check both.

## Pay is one month in arrears

Hours worked in **June** are paid on the lönebesked headed **juli**. Work in
July is paid in August, and so on. The *Löneperiod* line on the payslip is the
period it is paid in, not the period that was worked.

This is the single most common way to conclude the app is broken when it is
not. To reconcile:

| Load in the app | Compare against |
| --- | --- |
| juni 2026 | the payslip headed *Löneperiod 2026-07-01 – 07-31* |
| juli 2026 | *Löneperiod 2026-08-01 – 08-31* |

Everything on one payslip belongs to the same worked month — hours, OB and
semesterlön alike. Nothing is split across two.

## What maps to what

A payslip row per app figure:

| Payslip row | App |
| --- | --- |
| `10 Timlön ... Tim` | Grundlön × arbetade timmar. Several rows may appear for one month; add them. |
| `411 OB 50%` | The OB 50 % tier. The *Antal* is hours **at that tier**, a subset of the Timlön hours. |
| `412 OB 70%` / `413 OB 100%` | Likewise. |
| `611 Semesterlön betald ... Dgr` | Semesterdagar × the kr/dag figure, which must be typed in — see below. |
| `912 Preliminär skatt` | Skatt. See [skatt.md](skatt.md). |
| `Bruttolön (Period)` | Bruttolön. **This is the figure to check first** — it is what the app computes from your own hours, with nothing estimated. |
| `Arbetad tid (Period)` | Arbetade timmar. |
| `Utbetalas` | Nettolön. |

Note that OB hours sit *inside* the Timlön hours rather than beside them. Every
hour pays the base rate; OB rows are the supplement on the hours that earned
one. Adding OB hours to Timlön hours double-counts.

## Two verified months

Both matched to within 1,30 kr on gross, and exactly on tax:

| Worked | Paid on | Bruttolön | Arbetad tid | OB 50 / 70 / 100 | Prel. skatt |
| --- | --- | --- | --- | --- | --- |
| juli 2026 | lönebesked juli | 28 245,81 | 87,32 h | 8,75 / 5,00 / 27,42 | 5 149,00 |
| aug 2026 | lönebesked aug | 26 167,79 | 95,74 h | 5,67 / 3,17 / 46,68 | 4 630,00 |

The 1,30 kr comes from the employer rounding each payslip row to two decimals
while the app works from minutes. It is not a defect and it does not accumulate.

## Semesterlön has to be typed in

Semesterlön is calculated from average earnings, not from an hourly rate, so it
cannot be derived from a schedule. The app counts the days and multiplies by a
**kr/dag** figure you enter, taken from the payslip row:

```
611 Semesterlön betald   2,00 Dgr   1 622,25   3 244,50
                                    ^^^^^^^^
```

Leave that field empty and the days are counted but paid nothing, which is how
a month can come out several thousand kronor short. The July payslip above is
6 489,00 kr of semesterlön — four days at 1 622,25.

## What the app does not model

- **Övertid and mertid.** Hours worked beyond the schedule and approved
  afterwards look identical to clocking out late, so they are left out rather
  than guessed at. A month containing them will not match, and the shortfall is
  the overtime.
- **Månadslön.** Out of scope by design — see *Who it's for* in the README.
- **Sjuklön has never been checked against a real payslip.** It is built from
  §15.4 and verified against hand calculation only. Treat a sick month as
  unproven until one is checked.
