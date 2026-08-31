import type { Language } from "./types";

export const LANGUAGES: Language[] = ["sv", "en"];

const dict = {
  appName: { sv: "Lönetracker", en: "Lönetracker" },
  tagline: {
    sv: "För dig som jobbar i butik och har timlön. Ladda upp schemat och se vad månaden faktiskt ger, med OB-tillägg inräknade.",
    en: "For hourly-paid retail staff. Upload your schedule and see what the month actually pays, OB supplements included.",
  },
  privacy: {
    sv: "Allt räknas ut i din webbläsare och sparas lokalt. Inget schema och ingen lön skickas någonstans.",
    en: "Everything is calculated in your browser and stored locally. No schedule or salary data is sent anywhere.",
  },

  // Upload
  schedule: { sv: "Schema", en: "Schedule" },
  uploadHint: {
    sv: "Ladda upp ett schema (.csv eller .xlsx) med kolumnerna Datum, Start och Slut. Rast är valfri.",
    en: "Upload a schedule (.csv or .xlsx) with Date, Start and End columns. Break is optional.",
  },
  chooseFile: { sv: "Välj fil", en: "Choose file" },
  replaceFile: { sv: "Byt fil", en: "Replace file" },
  clearSchedule: { sv: "Rensa schema", en: "Clear schedule" },
  shiftsLoadedOne: { sv: "pass inläst", en: "shift loaded" },
  shiftsLoadedMany: { sv: "pass inlästa", en: "shifts loaded" },
  noSchedule: { sv: "Inget schema uppladdat än.", en: "No schedule uploaded yet." },

  // Parse errors
  errNoDate: {
    sv: 'Hittade ingen "Datum"-kolumn i filen.',
    en: 'Could not find a "Date" column in the file.',
  },
  errNoTimes: {
    sv: 'Hittade ingen "Start"- och "Slut"-kolumn i filen.',
    en: 'Could not find "Start" and "End" columns in the file.',
  },
  errNoShifts: { sv: "Inga pass hittades i filen.", en: "No shifts found in the file." },
  errBadExcel: { sv: "Ogiltig Excel-fil.", en: "Invalid Excel file." },
  errNoSheet: { sv: "Kunde inte läsa kalkylbladet.", en: "Could not read the worksheet." },
  errUnknown: { sv: "Kunde inte läsa filen.", en: "Could not read the file." },

  // Settings
  pay: { sv: "Lön", en: "Pay" },
  baseRate: { sv: "Grundlön", en: "Base rate" },
  baseRateUnit: { sv: "kr/timme", en: "kr/hour" },
  taxRate: { sv: "Skatt", en: "Tax" },
  taxRateUnit: { sv: "% av bruttolön", en: "% of gross pay" },

  // Rules
  rules: { sv: "OB-regler", en: "OB rules" },
  rulesHint: {
    sv: "OB-tillägg betalas ovanpå grundlönen. Timmar utanför alla fönster ger bara grundlön.",
    en: "OB supplements are paid on top of the base rate. Hours outside every window pay base only.",
  },
  rulesDisclaimer: {
    sv: "Förinställningen är hämtad ur §8.1 i Detaljhandelsavtalet 2025–2027. Har du ett annat avtal, eller lokala tillägg, kan du ändra reglerna själv.",
    en: "The preset is taken from §8.1 of Detaljhandelsavtalet 2025–2027. On a different agreement, or with local additions, you can edit the rules yourself.",
  },
  dayEve: { sv: "Afton", en: "Eve" },
  dayHoliday: { sv: "Helgdag", en: "Holiday" },
  dayTypesHint: {
    sv: "Helgdag gäller röda dagar oavsett veckodag. Afton är jul-, nyårs- och midsommarafton, som avtalet jämställer med lördagar.",
    en: "Holiday covers Swedish public holidays whatever weekday they fall on. Eve is Christmas, New Year's and Midsummer Eve, which the agreement equates with Saturdays.",
  },
  loadPreset: { sv: "Läs in förinställning", en: "Load preset" },
  presetDetaljhandel: { sv: "Handels detaljhandel", en: "Handels retail" },
  clearRules: { sv: "Töm regler", en: "Clear rules" },
  tiers: { sv: "Nivåer", en: "Tiers" },
  addTier: { sv: "Lägg till nivå", en: "Add tier" },
  tierName: { sv: "Namn", en: "Name" },
  supplement: { sv: "Tillägg (%)", en: "Supplement (%)" },
  windows: { sv: "Tidsfönster", en: "Time windows" },
  addWindow: { sv: "Lägg till fönster", en: "Add window" },
  from: { sv: "Från", en: "From" },
  to: { sv: "Till", en: "To" },
  tier: { sv: "Nivå", en: "Tier" },
  days: { sv: "Dagar", en: "Days" },
  remove: { sv: "Ta bort", en: "Remove" },
  noTiers: {
    sv: "Inga nivåer än. Lägg till en nivå innan du skapar fönster.",
    en: "No tiers yet. Add a tier before creating windows.",
  },
  noWindows: {
    sv: "Inga fönster. Alla timmar ger grundlön.",
    en: "No windows. Every hour pays the base rate.",
  },
  issueRange: { sv: "Ogiltig tid", en: "Invalid time" },
  issueOverlap: { sv: "Överlappar ett annat fönster", en: "Overlaps another window" },
  issueTier: { sv: "Nivån finns inte", en: "Tier no longer exists" },

  // Results
  summary: { sv: "Sammanställning", en: "Summary" },
  shiftsCount: { sv: "Pass", en: "Shifts" },
  totalHours: { sv: "Arbetade timmar", en: "Hours worked" },
  basePay: { sv: "Grundlön", en: "Base pay" },
  gross: { sv: "Bruttolön", en: "Gross pay" },
  tax: { sv: "Skatt", en: "Tax" },
  net: { sv: "Nettolön", en: "Net pay" },
  netPayout: {
    sv: "Detta betalas ut till dig",
    en: "This is what reaches your account",
  },
  taxEstimate: {
    sv: "Skatten är en uppskattning. Riktig skatt räknas efter skattetabell, inte en fast procent. Ta din verkliga skatteprocent från lönebeskedet (skatteavdrag delat med bruttolön) för en exakt siffra.",
    en: "Tax is an estimate. Real tax follows a skattetabell, not a flat percentage. Take your actual rate from a payslip (tax deducted divided by gross) for an exact figure.",
  },
  shifts: { sv: "Pass", en: "Shifts" },
  breakLabel: { sv: "Rast", en: "Break" },
  breakPaid: { sv: "Rasten är betald", en: "Break is paid" },
  breakPaidHint: {
    sv: "Rast är obetald och räknas inte som arbetstid (§6.1). Måltidsuppehåll (§6.5) och kortare pauser räknas in i arbetstiden — kryssa i rutan då.",
    en: "A rast is unpaid and outside working time (§6.1). A måltidsuppehåll (§6.5) and short pauses count as working time — tick the box in that case.",
  },
  missingBreak: {
    sv: "Över 5 h utan rast",
    en: "Over 5 h with no break",
  },
  missingBreakHint: {
    sv: "Arbetstidslagen §15 ger dig rast senast efter 5 timmars arbete. Avtalet sätter ingen minsta längd — den bestäms av schemat. Saknas rasten i filen räknas passet som helt betalt här.",
    en: "Arbetstidslagen §15 entitles you to a break after at most 5 hours of work. The agreement sets no minimum length — the schedule decides. If the break is missing from the file, the shift is counted as fully paid here.",
  },
  perHour: { sv: "kr/h", en: "kr/h" },
  uploadToSee: {
    sv: "Ladda upp ett schema för att se din lön.",
    en: "Upload a schedule to see your pay.",
  },

  howToTitle: { sv: "Så här gör du", en: "Getting started" },
  step1: {
    sv: "Fyll i din grundlön per timme. Den står på ditt lönebesked, under \"Timlön\".",
    en: "Enter your hourly rate. It is on your payslip, on the \"Timlön\" line.",
  },
  step2: {
    sv: "Fyll i din skatteprocent. Ta fram ett gammalt lönebesked och leta upp två rader: \"Bruttolön\" och \"Preliminär skatt\". Dela skatten med bruttolönen och gånga med 100. Exempel: 4 630 ÷ 26 168 × 100 = 17,7 %. Skatten är personlig — 30 % som står här från början stämmer nästan aldrig.",
    en: "Enter your tax percentage. Take an old payslip and find two lines: \"Bruttolön\" (gross) and \"Preliminär skatt\" (tax). Divide the tax by the gross and multiply by 100. Example: 4 630 ÷ 26 168 × 100 = 17.7 %. Tax is personal — the 30 % filled in here to begin with is almost never right.",
  },
  step3: {
    sv: "Ladda upp ditt schema. Det är filen \"Attestera tid\" som du laddar ner från schemasystemet (.xlsx eller .csv).",
    en: "Upload your schedule — the \"Attestera tid\" file you download from the scheduling system (.xlsx or .csv).",
  },
  stepNote: {
    sv: "Bruttolönen är den siffra du kan stämma av mot lönebeskedet. Nettolönen är en uppskattning, eftersom riktig skatt räknas efter skattetabell.",
    en: "Gross pay is the figure to check against your payslip. Net pay is an estimate, since real tax follows a skattetabell.",
  },
  taxHelp: {
    sv: "Från lönebeskedet: Preliminär skatt ÷ Bruttolön × 100",
    en: "From a payslip: tax deducted ÷ gross pay × 100",
  },

  addManually: { sv: "Skriv in pass för hand", en: "Enter shifts by hand" },
  pasteInstead: { sv: "Klistra in text", en: "Paste text" },
  pasted: { sv: "Inklistrat schema", en: "Pasted schedule" },
  dateLabel: { sv: "Datum", en: "Date" },
  addShift: { sv: "Lägg till pass", en: "Add shift" },
  manualHint: {
    sv: "Fungerar oavsett var du jobbar. Tider kan skrivas som 17:00 eller 1700, och rasten som antal minuter. Datumet blir kvar när du lagt till ett pass, så du kan skriva in en hel vecka i rad.",
    en: "Works wherever you work. Times can be written as 17:00 or 1700, and the break as a number of minutes. The date stays after adding a shift, so a whole week can be entered in a row.",
  },
  breakMinutes: { sv: "Rast (min)", en: "Break (min)" },
  manualInvalid: {
    sv: "Kontrollera datum och tider. Tider kan skrivas som 17:00 eller 1700.",
    en: "Check the date and times. Times can be written as 17:00 or 1700.",
  },
  breakInvalid: {
    sv: "Kontrollera rasten. Skriv antalet minuter, till exempel 30.",
    en: "Check the break. Enter the number of minutes, for example 30.",
  },
  pasteHint: {
    sv: "Kopiera schemat från en PDF, ett mejl eller en webbsida och klistra in det här. Varje rad behöver ett datum och två klockslag. En tredje tid tolkas som rast.",
    en: "Copy your schedule from a PDF, an email or a web page and paste it here. Each line needs a date and two clock times. A third time is read as a break.",
  },
  readText: { sv: "Läs in texten", en: "Read the text" },
  pasteFailed: {
    sv: "Hittade inga pass. Varje rad behöver ett datum och två tider.",
    en: "No shifts found. Each line needs a date and two times.",
  },
  mapTitle: { sv: "Vilka kolumner är vad?", en: "Which columns are which?" },
  mapHint: {
    sv: "Filen lästes in, men kolumnrubrikerna känns inte igen. Peka ut vilka kolumner som är datum, start och slut så räknar appen ut resten.",
    en: "The file was read, but the column headings are unfamiliar. Point out which columns hold the date, start and end and the app takes it from there.",
  },
  useColumns: { sv: "Använd de här", en: "Use these" },
  cancel: { sv: "Avbryt", en: "Cancel" },
  noBreakColumn: { sv: "Ingen rastkolumn", en: "No break column" },
  removeShift: { sv: "Ta bort pass", en: "Remove shift" },
  addedByHandLabel: { sv: "Egna pass", en: "Own shifts" },

  showAdvanced: { sv: "Visa avancerat", en: "Show advanced" },
  hideAdvanced: { sv: "Dölj avancerat", en: "Hide advanced" },
  advancedHint: {
    sv: "OB-reglerna är redan inställda enligt Detaljhandelsavtalet. Du behöver bara ändra här om du har lokala tillägg, till exempel Coops extra OB på morgonen.",
    en: "The OB rules already follow Detaljhandelsavtalet. You only need this if you have local additions, such as Coop's extra morning OB.",
  },

  semesterDay: { sv: "semesterdag", en: "vacation day" },
  semesterDays: { sv: "semesterdagar", en: "vacation days" },
  sickDay: { sv: "sjukdag", en: "sick day" },
  sickDays: { sv: "sjukdagar", en: "sick days" },
  otherLeaveDay: { sv: "dag annan frånvaro", en: "day of other leave" },
  otherLeaveDays: { sv: "dagar annan frånvaro", en: "days of other leave" },
  notIncluded: { sv: "räknas inte med", en: "not included" },
  hoursPerWeek: { sv: "h/vecka", en: "h/week" },
  karens: { sv: "Karensperiod (obetald)", en: "Karens period (unpaid)" },
  sickPay: { sv: "Sjuklön (80 %)", en: "Sick pay (80 %)" },
  sickHint: {
    sv: "Sjuklön är 80 % av lönen du skulle fått, OB inräknat (§15.4). Karensperioden är 20 % av din genomsnittliga arbetsvecka och är obetald — fyll i dina avtalade timmar per vecka från anställningsbeviset.",
    en: "Sick pay is 80 % of what you would have earned, OB included (§15.4). The karens period is 20 % of your average working week and is unpaid — enter your agreed weekly hours from your contract.",
  },
  needWeeklyHours: {
    sv: "Fyll i timmar per vecka för att räkna ut sjuklönen.",
    en: "Enter your weekly hours to calculate sick pay.",
  },
  beyondSickPeriod: {
    sv: "dagar ligger efter dag 14 — då betalar Försäkringskassan, inte arbetsgivaren. De räknas inte med.",
    en: "days fall past day 14 — Försäkringskassan pays those, not the employer. They are not included.",
  },
  otherLeaveHint: {
    sv: "Tjänstledighet och liknande betalas olika, och filen säger inte vilket. Kolla lönebeskedet för de här dagarna.",
    en: "Unpaid leave and similar are paid differently, and the file does not say which. Check your payslip for these days.",
  },
  perDay: { sv: "kr/dag", en: "kr/day" },
  semesterPay: { sv: "Semesterlön", en: "Vacation pay" },
  semesterHint: {
    sv: "Semesterdagar betalas inte per timme, så de räknas inte som pass. Fyll i din semesterlön per dag från lönebeskedet (\"Semesterlön betald ... a\") för att få med dem.",
    en: "Vacation days are not paid by the hour, so they do not count as shifts. Enter your vacation pay per day from a payslip to include them.",
  },

  language: { sv: "Språk", en: "Language" },
} as const;

export type MessageKey = keyof typeof dict;

export function t(key: MessageKey, lang: Language): string {
  return dict[key][lang];
}

/** Map a parse error code onto its message key. */
export function parseErrorKey(code: string): MessageKey {
  switch (code) {
    case "noDate":
      return "errNoDate";
    case "noTimes":
      return "errNoTimes";
    case "noShifts":
      return "errNoShifts";
    case "badExcel":
      return "errBadExcel";
    case "noSheet":
      return "errNoSheet";
    default:
      return "errUnknown";
  }
}
