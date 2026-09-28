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
| aug 2026 | *Löneperiod 2026-09-01 – 09-30* |

Everything on one payslip belongs to the same worked month — hours, OB and
semesterlön alike. Nothing is split across two.

## What maps to what

A payslip row per app figure:

| Payslip row | App |
| --- | --- |
| `10 Timlön ... Tim` | Grundlön × arbetade timmar. Several rows may appear for one month — one per store when the person has worked in more than one, each under its own kostnadsställe number; add them. The export covers all of them. |
| `200 Karensavdrag (tim)` | Karensperiod, one per sick period. The *Antal* is 20 % of the agreed weekly hours (3,83 h = 20 % of 19,15 h). |
| `201 Sjuklön 80% dag 2-14` | Sjuklön. Hours = sick hours minus karens; A-pris = 80 % of timlön. |
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

## Three verified months

All matched to within 1,50 kr on gross, and exactly on tax where the table was
checked:

| Worked | Paid on | Bruttolön | Arbetad tid | OB 50 / 70 / 100 | Sjuklön | Prel. skatt |
| --- | --- | --- | --- | --- | --- | --- |
| juni 2026 | lönebesked juli | 28 245,81 | 87,32 h | 8,75 / 5,00 / 27,42 | – | 5 149,00 |
| juli 2026 | lönebesked aug | 26 167,79 | 95,74 h | 5,67 / 3,17 / 46,68 | – | 4 630,00 |
| aug 2026 | lönebesked sept | 35 002,17 | 126,90 h | 7,45 / 3,27 / 61,02 | 590,51 (4,16 h) | 6 756,00 |

The krona or so comes from the employer rounding each payslip row to two
decimals while the app works from minutes. It is not a defect and it does not
accumulate.

## The Godkänd column

The Bestseller export has three blocks: *Aktivt schema* (the plan), *Närvaro*
(the clock) and a single *Godkänd* column — the hours the employer signed off
for the day. Godkänd sums to *Arbetad tid* on the payslip to the minute in all
three months, so where it exists it is what the app pays. The clock times are
then only used to place those hours on the OB windows.

It settles three cases the times alone get wrong:

- **Mertid.** 12 aug: scheduled 12–17, clocked 09:57–17:01, Godkänd 6:48
  ("Mertid Kontant"). The overlap of plan and clock is 4:45; the approved
  figure is what was paid.
- **A rast not taken.** 14 aug: worked one hour then went home sick. The plan
  says a 60-minute rast; nobody took it. Godkänd 1:00.
- **Docked minutes.** 23 juli: clocked in at 16:12 for a 16:00 start, Godkänd
  4:33 instead of 4:45.

## Sick days on the payslip

August 2026 is the first month checked with sickness on it, and the employer
does two things the agreement text leaves open:

- **Karens per sick period, sized from the contract.** Two separate sick days
  twelve days apart each carry a karensavdrag of 3,83 h = 20 % of 19,15 h/week.
  The app needs those weekly hours typed in to get this right.
- **Sjuklön at the base rate only.** 141,95 kr/h = 80 % of 177,44, on the sick
  hours after the karens. Both days' paid sick hours fall after 18:15 on a
  weekday, so §15.4's "dessutom 80 procent av ifrågavarande tillägg" would add
  OB on them — the payslip has none. The app matches the payslip in the gross
  and shows the OB part apart, so the person can raise it.

A day worked in part and then left sick appears on the payslip as both: the
worked hour under Timlön, the rest of the planned shift under Sjuklön and
Karensavdrag.

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

- **Övertid and mertid without a Godkänd column.** Hours worked beyond the
  schedule and approved afterwards look identical to clocking out late, so
  without the employer's approved figure they are left out rather than guessed
  at. A month containing them will not match, and the shortfall is the
  overtime.
- **Månadslön.** Out of scope by design — see *Who it's for* in the README.
- **Sjuklön beyond what one payslip shows.** One sick month has been checked,
  with short spells only. Sick periods running past day fourteen, relapses
  within five days and the ten-karens cap are built from §15.4 and unproven.
