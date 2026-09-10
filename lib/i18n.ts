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
  errNotSchedule: {
    sv: "Filen innehåller inga datum, så det här ser inte ut som ett schema. Kontrollera att du valt rätt fil — eller klistra in schemat som text i stället.",
    en: "The file contains no dates, so this does not look like a schedule. Check you picked the right file — or paste the schedule as text instead.",
  },
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
  month: { sv: "Månad", en: "Month" },
  allMonths: { sv: "Alla månader", en: "All months" },
  nothingThisMonth: {
    sv: "Inga pass den här månaden. Välj en annan månad ovan.",
    en: "No shifts this month. Choose another month above.",
  },
  monthNote: {
    sv: "Ett lönebesked gäller en månad i taget, så sammanställningen visar en månad i taget.",
    en: "A payslip covers one month, so the summary shows one month at a time.",
  },

  howToTitle: { sv: "Så här gör du", en: "Getting started" },
  step1: {
    sv: "Fyll i din grundlön per timme. Den står på ditt lönebesked, under \"Timlön\".",
    en: "Enter your hourly rate. It is on your payslip, on the \"Timlön\" line.",
  },
  step2: {
    sv: "Välj vilken kommun du är folkbokförd i. Skatten räknas då ut ur Skatteverkets skattetabell, precis som din arbetsgivare gör. Har du inget lönebesked ännu spelar det ingen roll — det behövs inte.",
    en: "Choose the municipality you are registered in. Tax is then taken from Skatteverket's tax table, the same way your employer does it. It does not matter if you have no payslip yet — none is needed.",
  },
  step3: {
    sv: "Lägg in ditt schema: ladda upp filen från ditt schemasystem (.xlsx eller .csv), klistra in schemat som text eller skriv in passen för hand.",
    en: "Add your schedule: upload the file from your scheduling system (.xlsx or .csv), paste the schedule as text, or enter the shifts by hand.",
  },
  stepLeave: {
    sv: "Varit sjuk eller haft semester? Välj Sjuk eller Semester när du skriver in pass för hand. De dagarna betalas på ett annat sätt än vanliga pass.",
    en: "Been off sick or on vacation? Choose Sick or Vacation when entering shifts by hand. Those days are paid differently from ordinary shifts.",
  },
  stepNote: {
    sv: "Bruttolönen är den siffra du kan stämma av mot lönebeskedet. Nettolönen är en uppskattning, eftersom riktig skatt räknas efter skattetabell.",
    en: "Gross pay is the figure to check against your payslip. Net pay is an estimate, since real tax follows a skattetabell.",
  },
  taxHelp: {
    sv: "Från lönebeskedet: Preliminär skatt ÷ Bruttolön × 100",
    en: "From a payslip: tax deducted ÷ gross pay × 100",
  },
  kommunLabel: { sv: "Kommun", en: "Municipality" },
  chooseKommun: { sv: "Välj kommun", en: "Choose municipality" },
  taxTableIs: { sv: "Skattetabell", en: "Tax table" },
  churchMember: { sv: "Jag är medlem i Svenska kyrkan", en: "I am a member of Svenska kyrkan" },
  kommunHint: {
    sv: "Välj var du är folkbokförd, så används Skatteverkets skattetabell för din kommun. Skatten dras enligt tabell och inte som en fast procent — procenten stiger med hur mycket du tjänat den månaden.",
    en: "Choose where you are registered and Skatteverket's tax table for your municipality is used. Tax is withheld by table, not as a flat percentage — the percentage rises with what you earned that month.",
  },
  kommunSpread: {
    sv: "Kyrkoavgiften skiljer sig mellan församlingarna i din kommun, så tabellen kan vara en bredvid. Stämmer det inte mot lönebeskedet kan du räkna ut procenten därifrån i stället.",
    en: "The church fee differs between parishes in your municipality, so the table may be one off. If it does not match your payslip, work the percentage out from that instead.",
  },
  useKommunInstead: { sv: "Välj kommun i stället", en: "Choose your municipality instead" },
  taxFromPayslip: {
    sv: "Skriv av två rader från ett gammalt lönebesked, vilken månad som helst. Appen räknar ut procenten.",
    en: "Copy two lines from any old payslip. The app works out the percentage.",
  },
  payslipGross: { sv: "Bruttolön", en: "Gross pay" },
  payslipTax: { sv: "Preliminär skatt", en: "Preliminary tax" },
  yourTaxRate: { sv: "Din skatteprocent", en: "Your tax rate" },
  taxNotSetYet: { sv: "Inte uträknad än", en: "Not worked out yet" },
  usePercentInstead: { sv: "Jag vet min procent", en: "I know my percentage" },
  usePayslipInstead: { sv: "Räkna ut från ett lönebesked", en: "Work it out from a payslip" },
  netNeedsTax: {
    sv: "Välj din kommun ovan, så visas nettolönen här.",
    en: "Choose your municipality above and net pay appears here.",
  },
  grossPayout: {
    sv: "Det här är vad du tjänat före skatt",
    en: "This is what you earned before tax",
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
    sv: "Kopiera schemat från en PDF, ett mejl eller en webbsida och klistra in det här. Varje rad behöver ett datum och två klockslag. En tredje tid tolkas som rast. Skriv \"sjuk\" eller \"semester\" på raden för de dagarna — en semesterdag behöver inga tider.",
    en: "Copy your schedule from a PDF, an email or a web page and paste it here. Each line needs a date and two clock times. A third time is read as a break. Write \"sick\" or \"vacation\" on the line for those days — a vacation day needs no times.",
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

  // Kinds of day, for hand entry and the list
  dayKind: { sv: "Typ av dag", en: "Kind of day" },
  kindWork: { sv: "Arbete", en: "Work" },
  kindSick: { sv: "Sjuk", en: "Sick" },
  kindSemester: { sv: "Semester", en: "Vacation" },
  kindOther: { sv: "Annan frånvaro", en: "Other leave" },
  addSickDay: { sv: "Lägg till sjukdag", en: "Add sick day" },
  addSemesterDay: { sv: "Lägg till semesterdag", en: "Add vacation day" },
  manualSickHint: {
    sv: "Skriv in passet du skulle ha jobbat enligt schemat. Sjuklönen räknas på de timmarna, med OB (§15.4).",
    en: "Enter the shift you were scheduled to work. Sick pay is calculated on those hours, OB included (§15.4).",
  },
  manualSemesterHint: {
    sv: "Semesterlön betalas per dag, så inga tider behövs. Skriv bara in datumet.",
    en: "Vacation pay is paid per day, so no times are needed. Just enter the date.",
  },
  manualDateInvalid: { sv: "Välj ett datum.", en: "Choose a date." },
  replacedWork: {
    sv: "Arbetspasset samma dag togs bort, eftersom en dag inte kan vara både arbete och frånvaro.",
    en: "The work shift on that date was removed, since a day cannot be both work and leave.",
  },
  replacedLeave: {
    sv: "Frånvaron samma dag togs bort, eftersom en dag inte kan vara både arbete och frånvaro.",
    en: "The leave on that date was removed, since a day cannot be both work and leave.",
  },
  wholeDay: { sv: "Hel dag", en: "Whole day" },
  markSick: { sv: "Markera som sjukdag", en: "Mark as sick day" },
  markSemester: { sv: "Markera som semesterdag", en: "Mark as vacation day" },
  markWork: { sv: "Ändra till arbetspass", en: "Change to work shift" },
  removeDay: { sv: "Ta bort dagen", en: "Remove day" },
  pasteSickWithoutTimesOne: {
    sv: "rad med \"sjuk\" saknade tider och lästes inte in. Sjuklönen räknas på passet du skulle ha jobbat, så skriv in tiderna.",
    en: "line marked \"sick\" had no times and was left out. Sick pay is calculated on the shift you would have worked, so add the times.",
  },
  pasteSickWithoutTimes: {
    sv: "rader med \"sjuk\" saknade tider och lästes inte in. Sjuklönen räknas på passet du skulle ha jobbat, så skriv in tiderna.",
    en: "lines marked \"sick\" had no times and were left out. Sick pay is calculated on the shift you would have worked, so add the times.",
  },

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
  sickPayAtMost: { sv: "Sjuklön högst", en: "Sick pay at most" },
  sickNotInGross: {
    sv: "Räknas inte in i bruttolönen än. Utan timmar per vecka går karensen inte att dra, och då blir sjuklönen för hög.",
    en: "Not in the gross pay yet. Without weekly hours the karens period cannot be taken off, which would make sick pay too high.",
  },
  sickNoAgreedHours: {
    sv: "Står det ingen veckotid i ditt anställningsbevis? Då går karensen inte att räkna säkert — fråga din arbetsgivare eller Handels.",
    en: "No weekly hours in your contract? Then the karens period cannot be worked out reliably — ask your employer or your union.",
  },
  sickUnverified: {
    sv: "Sjuklönen följer §15.4 men har ännu inte stämts av mot ett riktigt lönebesked med sjukdagar. Jämför gärna med ditt.",
    en: "Sick pay follows §15.4 but has not yet been checked against a real payslip with sick days on it. Compare it with yours.",
  },
  grossExcludes: { sv: "Bruttolönen räknar inte med:", en: "Gross pay does not include:" },
  excludesSick: {
    sv: "sjuklön — fyll i timmar per vecka",
    en: "sick pay — enter your weekly hours",
  },
  excludesSemester: {
    sv: "semesterlön — fyll i kr/dag",
    en: "vacation pay — enter kr/day",
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

  estimateTag: { sv: "uppskattning", en: "estimate" },
  semesterEstimateOpen: {
    sv: "Ingen siffra på lönebeskedet? Räkna ut ungefär",
    en: "No figure on a payslip? Estimate it",
  },
  semesterEstimateIntro: {
    sv: "Semesterlönen är 13 % av lönen du tjänade under intjänandeåret, 1 april–31 mars, fördelad på dina betalda semesterdagar — men aldrig lägre än avtalets garantibelopp (§14.6).",
    en: "Vacation pay is 13 % of what you earned in the qualifying year, 1 April–31 March, spread over your paid vacation days — but never below the agreement's guaranteed minimum (§14.6).",
  },
  semesterUnderlag: { sv: "Lön apr–mar", en: "Pay Apr–Mar" },
  semesterUnderlagHint: {
    sv: "Lägg ihop bruttolönen för arbete april–mars, utan semesterlön och sjuklön. Lönen kommer i efterskott, så det är lönebeskeden för maj–april.",
    en: "Add up gross pay for work April–March, leaving out vacation pay and sick pay. Pay comes a month in arrears, so that is the payslips for May–April.",
  },
  semesterPaidDays: { sv: "Betalda dagar", en: "Paid days" },
  semesterHoursWorked: { sv: "Timmar apr–mar", en: "Hours Apr–Mar" },
  semesterExperienced: {
    sv: "Jag har minst 3 års branschvana",
    en: "I have at least 3 years' experience in the trade",
  },
  semesterFromPercent: { sv: "13 % av lönen per dag", en: "13 % of pay, per day" },
  semesterGuarantee: { sv: "Garantibelopp per dag", en: "Guaranteed minimum per day" },
  semesterGuaranteeUnknown: {
    sv: "Fyll i timmarna för att jämföra med garantibeloppet.",
    en: "Enter the hours to compare against the guaranteed minimum.",
  },
  semesterUseEstimate: { sv: "Använd", en: "Use" },
  semesterEstimateNote: {
    sv: "En uppskattning enligt avtalet. Står semesterlönen per dag på ett lönebesked är det den siffran som gäller.",
    en: "An estimate from the agreement. If a payslip shows vacation pay per day, that figure is the one that counts.",
  },
  semesterersattningLabel: {
    sv: "Jag får semesterersättning varje månad",
    en: "I get holiday compensation with every month's pay",
  },
  semesterersattningHint: {
    sv: "Kryssa bara i om det står semesterersättning på ditt lönebesked varje månad. Då läggs 13 % av månadens lön för arbete till (§14.8). Annars betalas den ut när anställningen slutar, och räknas inte här.",
    en: "Tick only if your payslip shows holiday compensation every month. Then 13 % of the month's pay for work is added (§14.8). Otherwise it is paid when the job ends, and is not counted here.",
  },
  semesterersattningRow: { sv: "Semesterersättning 13 %", en: "Holiday compensation 13 %" },

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
