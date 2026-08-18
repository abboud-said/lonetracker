"use client";

import type { ReactNode } from "react";

export function Section({
  title,
  hint,
  actions,
  children,
}: {
  title: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bg-surface border border-border rounded-xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {hint ? <p className="text-sm text-muted mt-1 max-w-prose">{hint}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function Button({
  children,
  onClick,
  variant = "default",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "quiet" | "danger";
  type?: "button" | "submit";
}) {
  const styles = {
    default: "border-border bg-surface hover:bg-accent-soft",
    primary: "border-accent bg-accent text-white hover:opacity-90",
    quiet: "border-transparent bg-transparent text-muted hover:text-foreground hover:border-border",
    danger: "border-border bg-surface text-danger hover:bg-accent-soft",
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      className={`border rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${styles}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  suffix,
  children,
}: {
  label: string;
  suffix?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <span className="flex items-center gap-2">
        {children}
        {suffix ? <span className="text-sm text-muted">{suffix}</span> : null}
      </span>
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  className = "",
  inputMode,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputMode?: "decimal" | "numeric" | "text";
}) {
  return (
    <input
      type="text"
      value={value}
      inputMode={inputMode}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-background border border-border rounded-lg px-3 py-1.5 text-sm tabular outline-none focus:border-accent ${className}`}
    />
  );
}

/** A labelled figure in the summary grid. `strong` marks the headline number. */
export function Stat({
  label,
  value,
  strong = false,
  muted = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className={`text-sm ${muted ? "text-muted" : ""}`}>{label}</span>
      <span
        className={`tabular ${strong ? "text-lg font-semibold" : "text-sm font-medium"} ${
          muted ? "text-muted" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
