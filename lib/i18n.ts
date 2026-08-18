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
