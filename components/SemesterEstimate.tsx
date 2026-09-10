"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import { estimateSemesterPerDay } from "@/lib/semester";
import { money } from "@/lib/time";
import type { Language } from "@/lib/types";
import { Button, Field, LinkButton, NumberInput } from "./ui";

/**
 * The §14.6 formula, for someone with semester days and no payslip that shows
 * semesterlön per day. Folded away by default: the payslip figure is better
 * whenever it exists, and most people who have taken semester have one.
 */
export function SemesterEstimate({
  lang,
  date,
  onUse,
}: {
  lang: Language;
  /** A semester day in view, which decides which year's guarantee applies. */
  date: string;
  onUse: (perDay: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [underlag, setUnderlag] = useState(0);
  const [paidDays, setPaidDays] = useState(25);
  const [hoursWorked, setHoursWorked] = useState(0);
  const [experienced, setExperienced] = useState(false);

  const estimate = estimateSemesterPerDay({ underlag, paidDays, hoursWorked, experienced, date });

  return (
    <div className="mt-1">
      <LinkButton onClick={() => setOpen((v) => !v)} expanded={open}>
        {t("semesterEstimateOpen", lang)}
      </LinkButton>

      {open ? (
        <div className="mt-1 rounded-lg bg-accent-soft px-3.5 py-3 flex flex-col gap-3">
          <p className="text-xs text-muted max-w-prose">{t("semesterEstimateIntro", lang)}</p>

          <div className="flex flex-wrap items-end gap-3">
            <Field label={t("semesterUnderlag", lang)} suffix="kr">
              <NumberInput
                value={underlag}
                lang={lang}
                blankWhenZero
                placeholder="300000"
                className="w-28 text-right"
                onChange={setUnderlag}
              />
            </Field>
            <Field label={t("semesterPaidDays", lang)}>
              <NumberInput
                value={paidDays}
                lang={lang}
                blankWhenZero
                placeholder="25"
                className="w-16 text-right"
                onChange={setPaidDays}
              />
            </Field>
            <Field label={t("semesterHoursWorked", lang)} suffix="h">
              <NumberInput
                value={hoursWorked}
                lang={lang}
                blankWhenZero
                placeholder="1000"
                className="w-20 text-right"
                onChange={setHoursWorked}
              />
            </Field>
          </div>
          <p className="text-xs text-muted max-w-prose">{t("semesterUnderlagHint", lang)}</p>

          <label className="flex items-start gap-2.5 cursor-pointer max-w-prose">
            <input
              type="checkbox"
              checked={experienced}
              onChange={(e) => setExperienced(e.target.checked)}
              className="mt-0.5 accent-accent cursor-pointer"
            />
            <span className="text-sm">{t("semesterExperienced", lang)}</span>
          </label>

          {estimate ? (
            <div className="flex flex-col gap-1 border-t border-border pt-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className={`text-sm ${estimate.guaranteeWins ? "text-muted" : ""}`}>
                  {t("semesterFromPercent", lang)}
                </span>
                <span className={`tabular text-sm ${estimate.guaranteeWins ? "text-muted" : "font-medium"}`}>
                  {money(estimate.fromPercent, lang)}
                </span>
              </div>
              {estimate.guarantee != null ? (
                <div className="flex items-baseline justify-between gap-4">
                  <span className={`text-sm ${estimate.guaranteeWins ? "" : "text-muted"}`}>
                    {t("semesterGuarantee", lang)}
                  </span>
                  <span className={`tabular text-sm ${estimate.guaranteeWins ? "font-medium" : "text-muted"}`}>
                    {money(estimate.guarantee, lang)}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted">{t("semesterGuaranteeUnknown", lang)}</p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
                <span className="text-xs text-muted max-w-prose">{t("semesterEstimateNote", lang)}</span>
                <Button variant="primary" onClick={() => onUse(estimate.perDay)}>
                  {t("semesterUseEstimate", lang)} {money(estimate.perDay, lang)}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
