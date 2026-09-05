import { useState, type ReactNode } from "react";
import { Copy, Check, AlertTriangle, ChevronDown } from "lucide-react";
import type { Metric } from "@/lib/mud/format";
import { cn } from "@/lib/utils";

export function Field({
  label,
  value,
  onChange,
  type = "number",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "number" | "text";
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.09em] text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : "text"}
        step="any"
        value={value}
        placeholder={placeholder ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-md border border-border bg-input/40 px-3 font-mono text-[15px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:bg-input/70"
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.09em] text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-md border border-border bg-input/40 px-3 text-sm text-foreground outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-card text-foreground">
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Metrics({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((mt, idx) => (
        <div
          key={`${mt.name}-${idx}`}
          className="flex items-baseline justify-between gap-3 rounded-md border border-border/70 bg-secondary/40 px-3 py-2.5"
        >
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{mt.name}</span>
          <b className="font-mono text-[15px] font-semibold text-primary">
            {mt.value}
            {mt.unit ? <span className="ml-1 text-xs text-muted-foreground">{mt.unit}</span> : null}
          </b>
        </div>
      ))}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

export function WarningList({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <ul className="space-y-1.5">
      {warnings.map((w) => (
        <li
          key={w}
          className="flex items-start gap-2 rounded-md border border-chart-4/40 bg-chart-4/10 px-3 py-2 text-sm text-chart-4"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{w}</span>
        </li>
      ))}
    </ul>
  );
}

export function ReportBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!text) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard недоступен */
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card/60">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
        >
          <ChevronDown
            className={cn("size-4 transition-transform", open && "rotate-180")}
            aria-hidden
          />
          Подробный расчёт
        </button>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {copied ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          {copied ? "Скопировано" : "Копировать"}
        </button>
      </div>
      {open ? (
        <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap border-t border-border px-3 py-3 font-mono text-[12.5px] leading-relaxed text-muted-foreground">
          {text}
        </pre>
      ) : null}
    </div>
  );
}

export function ModuleShell({
  title,
  subtitle,
  inputs,
  results,
}: {
  title: string;
  subtitle: string;
  inputs: ReactNode;
  results: ReactNode;
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="rounded-xl border border-border bg-card/70 p-4 sm:p-5">
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{inputs}</div>
      </div>
      <div className="space-y-3">{results}</div>
    </section>
  );
}
