# Tax

## Why there is no such thing as "your tax percentage"

Preliminärskatt is not a rate. Skatteverket publishes a **skattetabell** giving
an *amount withheld per income bracket*, and the rate that implies climbs with
the month. On tabell 31 the same person pays:

| Monthly gross | Withheld | Works out as |
| --- | --- | --- |
| 15 000 kr | 2 090 kr | 13,93 % |
| 26 167 kr | 4 630 kr | 17,69 % |
| 60 000 kr | 15 094 kr | 25,16 % |

Which is why asking someone for their percentage cannot work: it is different
every month, and nobody carries the number around. The app asks for the
**kommun** instead and looks the withholding up the way payroll does. The
percentage shown on the tax line is an output.

## How the table is chosen

The table number is the total local tax rate, rounded:

- **Outside Svenska kyrkan** — kommunalskatt + regionskatt + begravningsavgift
- **A member** — the same plus kyrkoavgift

Skatteverket publishes both sums per församling. Rounding either gives the
table number directly.

**Non-members are exact.** The non-member table is uniform across every
församling in all 290 kommuner, so the kommun alone settles it.

**Members are exact in 261 of 290.** Kyrkoavgift varies by församling, and in 29
kommuner the parishes do not all land on the same table. Those carry
`spread: true` in the data; the app uses the table most parishes are on and says
so on screen.

Column **1** is shipped — employees under 66 on ordinary employment income,
which is who this app is for. Columns 2–6 cover pensioners and other cases.

## Where it does not fit

- **Jämkning** — anyone who has applied for an adjusted rate is off-table
- **Two employers** — the table assumes it is your only employment income
- **Not folkbokförd in Sweden**

For all of these the app keeps two other routes: derive the rate from two
payslip lines (`Bruttolön` ÷ `Preliminär skatt`), or type the percentage
directly.

## Regenerating `lib/skattetabell.ts`

Skatteverket republishes both source files every December. The generated file is
for a single tax year and its header says which.

**Finding the files.** The download URLs carry content hashes and change each
year. Fetch the raw HTML of the [technical description
page](https://www.skatteverket.se/foretag/arbetsgivare/arbetsgivaravgifterochskatteavdrag/skattetabeller/tekniskbeskrivningforskattetabeller.4.319dc1451507f2f99e86ee.html)
and grep for `href="([^"]*download[^"]*)"`. The pages are JS-rendered, so a
browser-style fetch that runs no scripts returns nothing useful — read the HTML
directly. Wanted:

- `allmanna-tabeller-manad.txt` — the tables (~390 kB)
- `skattesatser-kommuner-<year>.xlsx` — kommun rates (~90 kB)

**Table file layout.** Fixed width, 49 characters per line, no delimiters:

| Offset | Width | Field |
| --- | --- | --- |
| 0 | 5 | prefix + table number, e.g. `30B31` — take chars 3–4 |
| 5 | 7 | income from |
| 12 | 7 | income to |
| 19 | 5 | **column 1** — the one to ship |
| 24, 29, 34, 39, 44 | 5 | columns 2–6 |

**Kommun file.** Sheet 1, headers on row 1: C = kommun, D = församling,
E = summa inkl. kyrkoavgift, F = summa exkl. kyrkoavgift. Table number =
`round(summa)`.

**Checks any regeneration must pass.** Both from real 2026 payslips:

```
Stockholm, outside Svenska kyrkan            -> tabell 31
tabell 31 on a gross of 26 167,79            -> 4 630 kr
tabell 31 on a gross of 28 245,81            -> 5 149 kr
```

**A dead end to avoid.** The rowstore dataset
`skatteverket.entryscape.net/rowstore/dataset/0d3eae5d-99c5-4fd3-b954-9ab3bc705671`
has exactly the right shape — tabellnr, income from, income to, tax, year — and
is the wrong data. Its income brackets stop at 4 997 kr, so it is a daily or
weekly table, not the monthly one.
