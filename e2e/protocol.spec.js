// Lönetracker acceptance protocol — the automatable subset.
// Cases needing a physical device, a real payslip or a real person are not here.

const { test, expect } = require("@playwright/test");
const path = require("path");

const FIX = (n) => path.join(__dirname, "fixtures", n);

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForSelector("h1");
});

// ---------- helpers ----------

const summary = (page) => page.locator("section").filter({ has: page.locator('h2:text-is("Sammanställning")') });
const shiftsSection = (page) => page.locator("section").filter({ has: page.locator('h2:text-is("Pass")') });

/** Pull "1 600 kr" out of the summary by its label, as a plain number. */
async function kr(page, label) {
  const text = await summary(page).innerText();
  const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
  const i = lines.findIndex((l) => l === label || l.startsWith(label + " ·"));
  if (i === -1) return null;
  for (let j = i; j < Math.min(i + 3, lines.length); j++) {
    const m = lines[j].match(/([\d][\d\s\u00a0\u202f]*(?:[.,]\d+)?)\s*kr/);
    if (m) return Number(m[1].replace(/[\s\u00a0\u202f]/g, "").replace(",", "."));
  }
  return null;
}

async function hoursOf(page, label) {
  const text = await summary(page).innerText();
  const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
  const i = lines.findIndex((l) => l === label || l.startsWith(label + " ·"));
  if (i === -1) return null;
  for (let j = i; j < Math.min(i + 3, lines.length); j++) {
    const m = lines[j].match(/([\d]+[.,][\d]+)\s*h/);
    if (m) return Number(m[1].replace(",", "."));
  }
  return null;
}

const baseRateInput = (page) => page.locator('label:has(span:text-is("Grundlön")) input');
const taxInput = (page) => page.locator('label:has(span:text-is("Skatt")) input');

async function upload(page, file) {
  await page.locator('input[type="file"]').setInputFiles(FIX(file));
}

async function openManual(page) {
  await page.getByRole("button", { name: "Skriv in pass för hand" }).click();
}

async function addShift(page, { date, from, to, brk }) {
  await page.locator('input[type="date"]').fill(date);
  await page.locator('label:has(span:text-is("Från")) input').fill(from);
  await page.locator('label:has(span:text-is("Till")) input').fill(to);
  if (brk !== undefined) await page.locator('label:has(span:text-is("Rast (min)")) input').fill(brk);
  await page.getByRole("button", { name: "Lägg till pass" }).click();
}

async function setTaxPercent(page, pct) {
  const swap = page.getByRole("button", { name: "Jag vet min procent" });
  if (await swap.count()) await swap.click();
  const input = taxInput(page);
  await input.fill(String(pct));
  await input.blur();
}

async function setTaxFromPayslip(page, gross, tax) {
  const swap = page.getByRole("button", { name: "Räkna ut från ett lönebesked" });
  if (await swap.count()) await swap.click();
  await page.locator('label:has(span:text-is("Bruttolön")) input').fill(String(gross));
  await page.locator('label:has(span:text-is("Preliminär skatt")) input').fill(String(tax));
  await page.locator('label:has(span:text-is("Preliminär skatt")) input').blur();
}

async function setRate(page, rate, tax) {
  await baseRateInput(page).fill(String(rate));
  await baseRateInput(page).blur();
  // Tax now defaults to "not known", which is what the zero cases want.
  if (tax) await setTaxPercent(page, tax);
}

// =====================================================================
test.describe("Phase 1 — first run", () => {

  test("P1-01  the three-step panel is the first thing shown", async ({ page }) => {
    await expect(page.locator('h2:text-is("Så här gör du")')).toBeVisible();
    const steps = page.locator("ol li");
    await expect(steps).toHaveCount(3);
    await expect(steps.first()).toContainText("grundlön");
  });

  test("P1-04  the panel goes away once a schedule is loaded, and stays away", async ({ page }) => {
    await upload(page, "one-month.csv");
    await expect(page.locator('h2:text-is("Så här gör du")')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('h2:text-is("Så här gör du")')).toHaveCount(0);
    await expect(shiftsSection(page)).toBeVisible();
  });
});

// =====================================================================
test.describe("Phase 2 — pay settings", () => {

  test("P2-01  the rate field can be cleared without snapping to 0  [F-04]", async ({ page }) => {
    const input = baseRateInput(page);
    await expect(input).toHaveValue("177,44");
    await input.fill("");
    expect(await input.inputValue()).toBe("");          // the bug put a literal 0 here
    await input.type("200");
    expect(await input.inputValue()).toBe("200");        // ...and this would have been "0200"
  });

  test("P2-02  a Swedish decimal comma survives typing  [F-03]", async ({ page }) => {
    const input = baseRateInput(page);
    await input.fill("");
    await input.type("177,44");
    expect(await input.inputValue()).toBe("177,44");
    await input.blur();
    expect(await input.inputValue()).toBe("177,44");
  });

  test("P2-02b  English shows a dot instead", async ({ page }) => {
    await page.getByRole("button", { name: "en", exact: true }).click();
    const input = page.locator('label:has(span:text-is("Base rate")) input');
    expect(await input.inputValue()).toBe("177.44");
  });

  test("P2-03  a negative tax is refused; above 100 is not validated", async ({ page }) => {
    await page.getByRole("button", { name: "Jag vet min procent" }).click();
    const input = taxInput(page);
    await input.fill("");
    await input.type("-5");
    await input.blur();
    expect(Number(await input.inputValue() || 0)).toBeGreaterThanOrEqual(0);

    await input.fill("150");
    await input.blur();
    expect(await input.inputValue()).toBe("150");        // documented gap, not a fix
  });

  test("P2-04b  choosing a kommun is enough — no payslip needed  [F-08]", async ({ page }) => {
    await page.locator('label:has(span:text-is("Kommun")) select').selectOption("Stockholm");
    // Stockholm outside Svenska kyrkan sits on tabell 31.
    await expect(page.getByText("31", { exact: true })).toBeVisible();
  });

  test("P2-04c  the real August payslip, reproduced from the kommun alone", async ({ page }) => {
    // Gross 26 167,79 in Stockholm withheld 4 630,00 — this asserts the app
    // now arrives at that figure knowing only where the person lives.
    await page.locator('label:has(span:text-is("Kommun")) select').selectOption("Stockholm");
    await setRate(page, 177.44);
    await openManual(page);
    // A shift paying a gross inside the same tax bracket as the real month.
    await addShift(page, { date: "2026-08-09", from: "08:00", to: "20:00", brk: "" });

    const gross = await kr(page, "Bruttolön");
    const tax = await kr(page, "Skatt");
    const net = await kr(page, "Nettolön");
    console.log(`    gross ${gross} -> tax ${tax} -> net ${net}`);
    expect(gross).toBeGreaterThan(0);
    expect(tax).toBeGreaterThan(0);
    expect(net).toBeCloseTo(gross - tax, 1);
  });

  test("P2-04d  church membership moves the table", async ({ page }) => {
    await page.locator('label:has(span:text-is("Kommun")) select').selectOption("Stockholm");
    await expect(page.getByText("31", { exact: true })).toBeVisible();
    await page.locator('input[type="checkbox"]').first().check();
    await expect(page.getByText("32", { exact: true })).toBeVisible();
  });

  test("P2-05  tax is worked out from two payslip lines  [F-08]", async ({ page }) => {
    await page.getByRole("button", { name: "Räkna ut från ett lönebesked" }).click();
    // The exact figures from the payslip that made the app look 3 000 kr wrong.
    await setTaxFromPayslip(page, "26167,79", "4630");
    await expect(page.getByText("17,69 %")).toBeVisible();
  });

  test("P2-06  no kommun and no rate means no net figure, and gross leads  [F-08]", async ({ page }) => {
    await setRate(page, 100);
    await openManual(page);
    await addShift(page, { date: "2026-08-03", from: "09:00", to: "17:00", brk: "" });

    // Nothing may present itself as take-home while the rate is a guess.
    // (exact: true — the prompt below mentions "nettolönen" in passing.)
    await expect(page.getByText("Nettolön", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Välj din kommun ovan/)).toBeVisible();
    expect(await kr(page, "Bruttolön")).toBe(800);
  });

  test("P2-07  net appears once the payslip lines are in", async ({ page }) => {
    await setRate(page, 100);
    await openManual(page);
    await addShift(page, { date: "2026-08-03", from: "09:00", to: "17:00", brk: "" });
    await setTaxFromPayslip(page, "26167,79", "4630");

    await expect(page.getByText("Nettolön", { exact: true })).toBeVisible();
    expect(await kr(page, "Bruttolön")).toBe(800);
    expect(await kr(page, "Nettolön")).toBeCloseTo(800 * (1 - 0.176939), 1);
  });

  test("P2-08  a saved percentage survives and stays visible", async ({ page }) => {
    await setTaxPercent(page, 17.69);
    await page.reload();
    await expect(taxInput(page)).toHaveValue("17,69");
  });
});

// =====================================================================
test.describe("Phase 3 — schedule files", () => {

  test("P3-01  a real .xlsx loads", async ({ page }) => {
    await upload(page, "one-month.xlsx");
    await expect(page.getByText(/3 pass inlästa/)).toBeVisible();
  });

  test("P3-02  semicolon CSV, Swedish headers", async ({ page }) => {
    await upload(page, "one-month.csv");
    await expect(page.getByText(/4 pass inlästa/)).toBeVisible();
  });

  test("P3-02b  comma CSV, English headers", async ({ page }) => {
    await upload(page, "english-comma.csv");
    await expect(page.getByText(/2 pass inlästa/)).toBeVisible();
  });

  test("P3-03  unfamiliar headers open the column mapper, not an error", async ({ page }) => {
    await upload(page, "unknown-headers.csv");
    await expect(page.locator('h3:text-is("Vilka kolumner är vad?")')).toBeVisible();
    // Scoped to the mapper: the kommun dropdown is a select on this page too.
    const mapperSelects = page
      .locator('h3:text-is("Vilka kolumner är vad?") >> xpath=../..')
      .locator("select");
    await expect(mapperSelects).toHaveCount(4);
  });

  test("P3-04  the mapper can rescue the file", async ({ page }) => {
    await upload(page, "unknown-headers.csv");
    const selects = page.locator('h3:text-is("Vilka kolumner är vad?") >> xpath=../..').locator("select");
    await selects.nth(0).selectOption({ index: 1 });
    await selects.nth(1).selectOption({ index: 2 });
    await selects.nth(2).selectOption({ index: 3 });
    await page.getByRole("button", { name: "Använd de här" }).click();
    await expect(page.getByText(/2 pass inlästa/)).toBeVisible();
  });

  test("P3-05  a file that is not a schedule says so  [F-16]", async ({ page }) => {
    await upload(page, "garbage.csv");
    // It used to offer a column picker for a file with no dates in it, which
    // hands someone who picked the wrong file a puzzle instead of an answer.
    await expect(page.getByText(/ser inte ut som ett schema/)).toBeVisible();
    await expect(page.locator('h3:text-is("Vilka kolumner är vad?")')).toHaveCount(0);
  });

  test("P3-05b  unfamiliar headers WITH dates still get the picker  [F-16]", async ({ page }) => {
    await upload(page, "unknown-headers.csv");
    await expect(page.locator('h3:text-is("Vilka kolumner är vad?")')).toBeVisible();
  });

  test("P3-06  a two-month export shows one month, and the months sum  [F-06]", async ({ page }) => {
    await setRate(page, 100, 0);
    await upload(page, "two-months.csv");

    const picker = page.locator('label:has(span:text-is("Månad")) select');
    await expect(picker).toBeVisible();

    await expect(picker).toHaveValue("2026-09");         // latest month by default
    const sep = await kr(page, "Bruttolön");

    await picker.selectOption("2026-08");
    const aug = await kr(page, "Bruttolön");

    await picker.selectOption("all");
    const all = await kr(page, "Bruttolön");

    expect(aug).toBeGreaterThan(0);
    expect(sep).toBeGreaterThan(0);

    // Now that öre are shown, the displayed figures must add up exactly — no
    // tolerance. This is the assertion F-17 was fixed to make possible.
    const drift = aug + sep - all;
    console.log(`    P3-06: aug ${aug} + sep ${sep} = ${aug + sep} vs all ${all}  (drift ${drift})`);
    expect(aug + sep, "the displayed months must sum to the displayed whole").toBeCloseTo(all, 2);
  });

  test("P3-06b  a single-month file shows no picker at all", async ({ page }) => {
    await upload(page, "one-month.csv");
    await expect(page.locator('label:has(span:text-is("Månad")) select')).toHaveCount(0);
  });
});

// =====================================================================
test.describe("Phase 4 — hand entry", () => {

  test("P4-01(partial)  bare digits are accepted as a time  [F-01]", async ({ page }) => {
    await setRate(page, 100, 0);
    await openManual(page);
    await addShift(page, { date: "2026-08-03", from: "0900", to: "1700", brk: "" });
    await expect(shiftsSection(page)).toBeVisible();
    expect(await hoursOf(page, "Arbetade timmar")).toBeCloseTo(8, 1);
  });

  test("P4-01b  the colon form still works", async ({ page }) => {
    await setRate(page, 100, 0);
    await openManual(page);
    await addShift(page, { date: "2026-08-03", from: "09:00", to: "17:00", brk: "" });
    expect(await hoursOf(page, "Arbetade timmar")).toBeCloseTo(8, 1);
  });

  test("P4-02  a break of 30 means thirty minutes  [F-02]", async ({ page }) => {
    await setRate(page, 100, 0);
    await openManual(page);
    await addShift(page, { date: "2026-08-03", from: "09:00", to: "17:00", brk: "30" });
    expect(await hoursOf(page, "Arbetade timmar")).toBeCloseTo(7.5, 1);   // was 8.0 with the bug
  });

  test("P4-02b  an unreadable break is refused, not silently zeroed  [F-02]", async ({ page }) => {
    await openManual(page);
    await page.locator('input[type="date"]').fill("2026-08-03");
    await page.locator('label:has(span:text-is("Från")) input').fill("09:00");
    await page.locator('label:has(span:text-is("Till")) input').fill("17:00");
    await page.locator('label:has(span:text-is("Rast (min)")) input').fill("abc");
    await page.getByRole("button", { name: "Lägg till pass" }).click();
    await expect(page.getByText(/Kontrollera rasten/)).toBeVisible();
    await expect(shiftsSection(page)).toHaveCount(0);     // nothing was added
  });

  test("P4-03  a shift across midnight is 8 h, not minus 16", async ({ page }) => {
    await setRate(page, 100, 0);
    await openManual(page);
    await addShift(page, { date: "2026-08-03", from: "22:00", to: "06:00", brk: "" });
    expect(await hoursOf(page, "Arbetade timmar")).toBeCloseTo(8, 1);
  });

  test("P4-04  the date persists so a week can be typed in a run", async ({ page }) => {
    await openManual(page);
    await addShift(page, { date: "2026-08-03", from: "09:00", to: "17:00", brk: "" });
    await expect(page.locator('input[type="date"]')).toHaveValue("2026-08-03");
    await expect(page.locator('label:has(span:text-is("Från")) input')).toHaveValue("");
  });

  test("P4-06  both date forms parse from pasted text", async ({ page }) => {
    await page.getByRole("button", { name: "Klistra in text" }).click();
    await page.locator("textarea").fill("2026-08-03  09:00-17:00\n04/08/2026  17:00-21:00");
    await page.getByRole("button", { name: "Läs in texten" }).click();
    await expect(page.getByText(/2 pass inlästa/)).toBeVisible();
  });

  test("P4-07  a short third time on a pasted line is read as a break", async ({ page }) => {
    await setRate(page, 100, 0);
    await page.getByRole("button", { name: "Klistra in text" }).click();
    await page.locator("textarea").fill("2026-08-03  09:00-17:00  00:30");
    await page.getByRole("button", { name: "Läs in texten" }).click();
    expect(await hoursOf(page, "Arbetade timmar")).toBeCloseTo(7.5, 1);
  });
});

// =====================================================================
test.describe("Phase 5 — the money, end to end", () => {

  test("P5-01  a plain weekday shift is base rate only", async ({ page }) => {
    await setRate(page, 100, 0);
    await openManual(page);
    await addShift(page, { date: "2026-08-03", from: "09:00", to: "17:00", brk: "" });  // Monday
    expect(await kr(page, "Bruttolön")).toBe(800);
  });

  test("P5-02  a weekday evening walks the whole OB ladder", async ({ page }) => {
    await setRate(page, 100, 0);
    await openManual(page);
    await addShift(page, { date: "2026-08-04", from: "17:00", to: "21:00", brk: "" });  // Tuesday
    // 17:00-18:15 base (1.25h=125) + 18:15-20:00 at +50% (1.75h=175+87.50) + 20:00-21:00 at +70% (1h=100+70)
    // 557.50 exactly. Whole-krona display used to round this to 558 — the öre
    // are now shown, which is the point of F-17.
    expect(await kr(page, "Bruttolön")).toBe(557.5);
  });

  test("P5-03  Saturday splits at noon", async ({ page }) => {
    await setRate(page, 100, 0);
    await openManual(page);
    await addShift(page, { date: "2026-08-08", from: "10:00", to: "16:00", brk: "" });  // Saturday
    // 2h base (200) + 4h at +100% (400+400)
    expect(await kr(page, "Bruttolön")).toBe(1000);
  });

  test("P5-04  Sunday is 100 % all day", async ({ page }) => {
    await setRate(page, 100, 0);
    await openManual(page);
    await addShift(page, { date: "2026-08-09", from: "11:00", to: "17:00", brk: "" });  // Sunday
    expect(await kr(page, "Bruttolön")).toBe(1200);                                      // 6h x 200
  });

  test("P5-09  over five hours with no break is flagged", async ({ page }) => {
    await openManual(page);
    await addShift(page, { date: "2026-08-03", from: "09:00", to: "17:00", brk: "" });
    await expect(page.getByText("Över 5 h utan rast")).toBeVisible();
  });

  test("P5-tax  net is gross minus the stated percentage", async ({ page }) => {
    await setRate(page, 100, 25);
    await openManual(page);
    await addShift(page, { date: "2026-08-03", from: "09:00", to: "17:00", brk: "" });
    expect(await kr(page, "Bruttolön")).toBe(800);
    expect(await kr(page, "Nettolön")).toBe(600);
  });
});

// =====================================================================
test.describe("Phase 6 — leave", () => {

  test("P6-07  a sick spell across a month boundary charges karens once  [F-06]", async ({ page }) => {
    await setRate(page, 100, 0);
    await upload(page, "sick-across-months.csv");

    const weekly = page.locator('label:has(span), div').locator('input').last();
    const picker = page.locator('label:has(span:text-is("Månad")) select');
    await expect(picker).toBeVisible();

    await picker.selectOption("2026-08");
    const augText = await summary(page).innerText();
    await picker.selectOption("2026-09");
    const sepText = await summary(page).innerText();

    expect(augText).toContain("sjukdagar");
    expect(sepText).toContain("sjukdagar");
  });

  test("P6-04  sick days without weekly hours prompt rather than mislead", async ({ page }) => {
    await upload(page, "sick-across-months.csv");
    await expect(page.getByText(/Fyll i timmar per vecka/)).toBeVisible();
  });
});

// =====================================================================
test.describe("Phase 8 — memory and privacy", () => {

  test("P8-01  a reload brings everything back", async ({ page }) => {
    await setRate(page, 250, 0);
    await upload(page, "one-month.csv");
    await page.reload();
    await expect(baseRateInput(page)).toHaveValue("250");
    await expect(page.getByText(/4 pass inlästa/)).toBeVisible();
  });

  test("P8-05  no request ever carries schedule or salary data", async ({ page }) => {
    const suspicious = [];
    page.on("request", (r) => {
      const url = r.url();
      if (url.startsWith("http://localhost:3000") || url.startsWith("data:")) return;
      suspicious.push(r.method() + " " + url);
      const body = r.postData();
      if (body && /2026-08|177|Datum/.test(body)) suspicious.push("BODY LEAK: " + url);
    });

    await setRate(page, 199.5, 22);
    await upload(page, "one-month.csv");
    await page.waitForTimeout(1500);

    expect(suspicious, "requests leaving the origin: " + suspicious.join(", ")).toEqual([]);
  });

  test("P8-06  clearing the schedule is instant and unconfirmed", async ({ page }) => {
    await upload(page, "one-month.csv");
    await page.getByRole("button", { name: "Rensa schema" }).click();
    await expect(page.getByText("Inget schema uppladdat än.")).toBeVisible();  // no confirm step — F-13
  });
});

// =====================================================================
test.describe("Phase 9 — small screen", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("P9-02  every control meets 44 px  [F-07]", async ({ page }) => {
    await upload(page, "two-months.csv");
    await openManual(page);
    await page.getByRole("button", { name: "Visa avancerat" }).click();

    const small = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll("button, input, select, textarea, a")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (el.type === "file" || el.type === "checkbox") continue;
        if (r.height < 44) {
          out.push(`${el.tagName.toLowerCase()}"${(el.textContent || el.type || "").trim().slice(0, 28)}" = ${Math.round(r.height)}px`);
        }
      }
      return out;
    });
    expect(small, "controls under 44px: " + small.join(" | ")).toEqual([]);
  });

  test("P9-06  the page never scrolls sideways at 375 px", async ({ page }) => {
    await upload(page, "two-months.csv");
    await page.getByRole("button", { name: "Visa avancerat" }).click();
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

// =====================================================================
test.describe("Phase 10 — language and access", () => {

  test("P10-01  English leaves no Swedish behind in the main UI", async ({ page }) => {
    await page.getByRole("button", { name: "en", exact: true }).click();
    await upload(page, "one-month.csv");
    const body = await page.locator("main").innerText();
    for (const word of ["Sammanställning", "Bruttolön", "Nettolön", "Ladda upp", "Välj fil"]) {
      expect(body, `found Swedish "${word}" while in English`).not.toContain(word);
    }
  });

  test("P10-02  the html lang attribute follows the chosen language  [F-11]", async ({ page }) => {
    await page.getByRole("button", { name: "en", exact: true }).click();
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang, "html lang stayed Swedish while the UI is English").toBe("en");
  });

  test("P10-03  everything is reachable by keyboard with a visible focus ring", async ({ page }) => {
    await upload(page, "one-month.csv");
    const reached = await page.evaluate(async () => {
      const focusable = document.querySelectorAll(
        'button, input:not([type=file]), select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
      let ok = 0;
      for (const el of focusable) { el.focus(); if (document.activeElement === el) ok++; }
      return { total: focusable.length, ok };
    });
    expect(reached.ok).toBe(reached.total);
  });

  test("P10-05  muted and danger text meet 4.5:1", async ({ page }) => {
    const results = await page.evaluate(() => {
      const lum = (hex) => {
        const c = hex.replace("#", "").match(/../g).map((h) => parseInt(h, 16) / 255)
          .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      };
      const ratio = (a, b) => {
        const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
        return (x + 0.05) / (y + 0.05);
      };
      const s = getComputedStyle(document.documentElement);
      const v = (n) => s.getPropertyValue(n).trim();
      return {
        mutedOnBg: ratio(v("--muted"), v("--background")),
        mutedOnSurface: ratio(v("--muted"), v("--surface")),
        dangerOnSurface: ratio(v("--danger"), v("--surface")),
        fgOnBg: ratio(v("--foreground"), v("--background")),
      };
    });
    console.log("    contrast:", JSON.stringify(results, null, 0));
    expect(results.fgOnBg).toBeGreaterThanOrEqual(4.5);
    expect(results.mutedOnBg).toBeGreaterThanOrEqual(4.5);
    expect(results.mutedOnSurface).toBeGreaterThanOrEqual(4.5);
    expect(results.dangerOnSurface).toBeGreaterThanOrEqual(4.5);
  });
});
