# Testing

## What is proven, and by what

| | Evidence |
| --- | --- |
| **OB splitting, breaks, midnight, holidays** | Two real payslips matched to 1,30 kr on gross, every tier exact. See [lonebesked.md](lonebesked.md). |
| **Tax** | Two real payslips matched **exactly**: 4 630 kr and 5 149 kr. |
| **Parsers, month filter, leave grouping, layout** | 47 browser cases, all passing. Below. |
| **Manual entry on a phone** | Confirmed on a real iPhone. |
| **Sjuklön** | ⚠️ **Nothing.** Built from §15.4 and checked by hand only. No payslip with sick days has ever been run through it. |
| **Anyone but the author using it** | ⚠️ **Nothing.** Never handed to a stranger. |

The last two are the honest gaps. Everything else has been checked against
something outside the app's own arithmetic.

## The acceptance protocol

Full protocol, 60 cases with personas and a device matrix:
<https://claude.ai/code/artifact/221686e6-7a8e-4fbc-9c84-448dfedc2110>

Still needing a human:

- **P5-10** — a full month against a real payslip. Redo whenever the
  calculation changes.
- **P1-02** — hand the phone to someone who has never seen it, say only "find
  out what you earned last month", then stay quiet.
- **P6-02** — a sick month against a payslip that has sick days on it.

## The browser suite

`e2e/` holds a Playwright suite covering the parsers, both CSV dialects, xlsx,
the column mapper, hand entry and paste, every OB tier end to end, leave, the
month filter, persistence, the 375 px layout, contrast and keyboard access.

To run it:

```bash
npx playwright install chromium   # once per machine
npx next dev --webpack            # in another terminal
npm run e2e
```

It drives the dev server at `localhost:3000` rather than mocking anything, so
the server has to be up. The browser binaries live outside the repo, so a fresh
machine needs the `playwright install` line — on a Mac, `npm run dev` is fine in
place of the `--webpack` form.

Two cases are worth knowing about because they encode findings rather than
behaviour:

- **P3-06** asserts the displayed months sum to the displayed total with *no
  tolerance*. That only holds because money is shown to the öre; rounding to
  whole kronor made two months display a krona apart from their own sum.
- **P2-06** asserts nothing on screen calls itself take-home while the tax rate
  is unknown. A guessed rate once drove the largest figure on the page and sent
  someone away believing the app was 3 000 kr wrong when its gross was right.

## Two lessons that cost time

**A green build is not evidence.** A constant exported across a `"use client"`
boundary passed `tsc` and `next build` and still left the browser bundle
without it. Only opening the page showed it. Run the app.

**Windows blocks the native compiler.** Application Control blocks Next's SWC
binary, so `npm run dev` crashes on Turbopack. Use `npx next dev --webpack`.
Slower, works.
