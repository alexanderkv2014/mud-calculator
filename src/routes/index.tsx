import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  OwrModule,
  WeightModule,
  MixModule,
  RuoModule,
  CuttingsModule,
  PrepModule,
} from "@/components/mud/modules";
import { cn } from "@/lib/utils";

const TITLE = "MUD FLUID — калькулятор бурового раствора (РУО)";
const DESCRIPTION =
  "Шесть инженерных модулей для РУО: желаемое ВНО, утяжеление, смешивание, LGS/HGS, выбуренная порода и приготовление раствора.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Index,
});

const TABS = [
  { id: "owr", label: "Желаемое ВНО", node: <OwrModule /> },
  { id: "weight", label: "Утяжеление", node: <WeightModule /> },
  { id: "mix", label: "Смешивание", node: <MixModule /> },
  { id: "ruo", label: "LGS / HGS", node: <RuoModule /> },
  { id: "cuttings", label: "Выбуренная порода", node: <CuttingsModule /> },
  { id: "prep", label: "Приготовление", node: <PrepModule /> },
];

function Index() {
  const [active, setActive] = useState("owr");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-3 px-4 py-6 sm:px-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">
              drilling fluids
            </p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              MUD FLUID
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Расчёты растворов на углеводородной основе. Значения пересчитываются мгновенно и
              сохраняются на устройстве.
            </p>
          </div>
          <span className="rounded-full border border-border px-3 py-1 font-mono text-[11px] text-muted-foreground">
            v2 · offline-ready
          </span>
        </div>
      </header>

      <nav className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                active === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {TABS.find((t) => t.id === active)?.node}
      </main>

      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
        Результаты — инженерная оценка. Проверяй ключевые дозировки лабораторно.
      </footer>
    </div>
  );
}
