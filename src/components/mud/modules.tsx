import { useMemo } from "react";
import {
  MATERIALS,
  CURRENT_CONC_IDS,
  COMPONENTS,
  calcOwr,
  calcWeight,
  calcMix,
  calcRuo,
  calcCuttings,
  calcPrep,
  type BrineSalt,
  type PrepRow,
} from "@/lib/mud/calc";
import { CalcError, toNum, type CalcResult } from "@/lib/mud/format";
import { usePersistentState } from "@/lib/mud/usePersistentState";
import { Field, SelectField, Metrics, ErrorBox, WarningList, ReportBlock, ModuleShell } from "./ui";
import { Plus, Trash2 } from "lucide-react";

type Attempt = { result?: CalcResult; error?: string };

function attempt(fn: () => CalcResult): Attempt {
  try {
    return { result: fn() };
  } catch (e) {
    return { error: e instanceof CalcError ? e.message : "Проверь введённые данные" };
  }
}

function Results({ state }: { state: Attempt }) {
  if (state.error) return <ErrorBox message={state.error} />;
  if (!state.result) return null;
  return (
    <>
      <Metrics metrics={state.result.metrics} />
      <WarningList warnings={state.result.warnings} />
      <ReportBlock text={state.result.report} />
    </>
  );
}

const hasInput = (...vals: string[]) => vals.some((v) => String(v).trim() !== "");

/* ---------- 1 ---------- */

export function OwrModule() {
  const [s, set] = usePersistentState("mud.owr", {
    V: "",
    rhoFact: "",
    water: "",
    oil: "",
    oilSg: "0.840",
    rhoTarget: "",
    target: "70/30",
  });
  const f = (k: keyof typeof s) => (v: string) => set((p) => ({ ...p, [k]: v }));

  const state = useMemo<Attempt>(() => {
    if (!hasInput(s.V, s.rhoFact, s.water, s.oil, s.rhoTarget)) return {};
    return attempt(() =>
      calcOwr({
        V: toNum(s.V, "Объем"),
        rhoFact: toNum(s.rhoFact, "Плотность текущая"),
        water: toNum(s.water, "Вода"),
        oil: toNum(s.oil, "Масло"),
        oilSg: toNum(s.oilSg, "Плотность масла"),
        rhoTarget: toNum(s.rhoTarget, "Плотность желаемая"),
        target: s.target,
      }),
    );
  }, [s]);

  return (
    <ModuleShell
      title="Желаемое ВНО и корректировка РУО"
      subtitle="Сколько масла или водной фазы добавить и сколько утяжелителя нужно после этого."
      inputs={
        <>
          <Field label="Объем, м³" value={s.V} onChange={f("V")} />
          <Field label="Плотность текущая, г/см³" value={s.rhoFact} onChange={f("rhoFact")} />
          <Field label="Вода по реторте, %" value={s.water} onChange={f("water")} />
          <Field label="Масло по реторте, %" value={s.oil} onChange={f("oil")} />
          <Field label="Плотность масла, г/см³" value={s.oilSg} onChange={f("oilSg")} />
          <Field label="Плотность желаемая, г/см³" value={s.rhoTarget} onChange={f("rhoTarget")} />
          <Field label="ВНО желаемое" type="text" value={s.target} onChange={f("target")} placeholder="70/30" />
        </>
      }
      results={<Results state={state} />}
    />
  );
}

/* ---------- 2 ---------- */

export function WeightModule() {
  const [s, set] = usePersistentState("mud.weight", {
    V: "",
    rhoFact: "",
    rhoTarget: "",
    material: "Барит - 4.20 г/см³",
    barite: "0",
    chalk: "0",
    kcl: "0",
    nacl: "0",
    cacl2: "0",
    bentonite: "0",
  });
  const f = (k: keyof typeof s) => (v: string) => set((p) => ({ ...p, [k]: v }));

  const state = useMemo<Attempt>(() => {
    if (!hasInput(s.V, s.rhoFact, s.rhoTarget)) return {};
    const entry = CURRENT_CONC_IDS.find((c) => c.material === s.material);
    const currentRaw = entry ? (s[entry.key as keyof typeof s] as string) : "0";
    return attempt(() =>
      calcWeight({
        V: toNum(s.V, "Объем"),
        rhoFact: toNum(s.rhoFact, "Плотность текущая"),
        rhoTarget: toNum(s.rhoTarget, "Плотность желаемая"),
        material: s.material,
        current: toNum(currentRaw, "Текущая концентрация"),
      }),
    );
  }, [s]);

  return (
    <ModuleShell
      title="Утяжеление"
      subtitle="Масса реагента с учётом собственного объёма добавки и запаса по концентрации."
      inputs={
        <>
          <Field label="Объем, м³" value={s.V} onChange={f("V")} />
          <Field label="Плотность текущая, г/см³" value={s.rhoFact} onChange={f("rhoFact")} />
          <Field label="Плотность желаемая, г/см³" value={s.rhoTarget} onChange={f("rhoTarget")} />
          <SelectField
            label="Реагент"
            value={s.material}
            onChange={f("material")}
            options={Object.keys(MATERIALS)}
          />
          {CURRENT_CONC_IDS.map((c) => (
            <Field
              key={c.key}
              label={c.label}
              value={s[c.key as keyof typeof s] as string}
              onChange={f(c.key as keyof typeof s)}
            />
          ))}
        </>
      }
      results={<Results state={state} />}
    />
  );
}

/* ---------- 3 ---------- */

export function MixModule() {
  const [s, set] = usePersistentState("mud.mix", {
    v1: "",
    rho1: "",
    owr1: "70/30",
    v2: "",
    rho2: "",
    owr2: "75/25",
  });
  const f = (k: keyof typeof s) => (v: string) => set((p) => ({ ...p, [k]: v }));

  const state = useMemo<Attempt>(() => {
    if (!hasInput(s.v1, s.rho1, s.v2, s.rho2)) return {};
    return attempt(() =>
      calcMix({
        v1: toNum(s.v1, "Объем 1"),
        rho1: toNum(s.rho1, "Плотность 1"),
        owr1: s.owr1,
        v2: toNum(s.v2, "Объем 2"),
        rho2: toNum(s.rho2, "Плотность 2"),
        owr2: s.owr2,
      }),
    );
  }, [s]);

  return (
    <ModuleShell
      title="Смешивание растворов"
      subtitle="Итоговые объём, плотность и ВНО при доливе второго раствора."
      inputs={
        <>
          <Field label="Объем исходный, м³" value={s.v1} onChange={f("v1")} />
          <Field label="Плотность исходная, г/см³" value={s.rho1} onChange={f("rho1")} />
          <Field label="ВНО исходное" type="text" value={s.owr1} onChange={f("owr1")} />
          <Field label="Объем добавляемый, м³" value={s.v2} onChange={f("v2")} />
          <Field label="Плотность добавляемого, г/см³" value={s.rho2} onChange={f("rho2")} />
          <Field label="ВНО добавляемого" type="text" value={s.owr2} onChange={f("owr2")} />
        </>
      }
      results={<Results state={state} />}
    />
  );
}

/* ---------- 4 ---------- */

const SALT_OPTIONS: { value: BrineSalt; label: string }[] = [
  { value: "CaCl2", label: "CaCl₂ (кальций хлор)" },
  { value: "NaCl", label: "NaCl (галит)" },
  { value: "KCl", label: "KCl (калий хлор)" },
];

export function RuoModule() {
  const [s, set] = usePersistentState("mud.ruo", {
    mw: "",
    oil: "",
    oilSg: "0.850",
    water: "",
    cl: "",
    salt: "CaCl2" as BrineSalt,
  });
  const f = (k: keyof typeof s) => (v: string) => set((p) => ({ ...p, [k]: v }));

  const state = useMemo<Attempt>(() => {
    if (!hasInput(s.mw, s.oil, s.water, s.cl)) return {};
    return attempt(() =>
      calcRuo({
        mw: toNum(s.mw, "Плотность"),
        oil: toNum(s.oil, "Масло"),
        oilSg: toNum(s.oilSg, "Плотность масла"),
        water: toNum(s.water, "Вода"),
        cl: toNum(s.cl, "Хлориды"),
        salt: s.salt,
      }),
    );
  }, [s]);

  return (
    <ModuleShell
      title="LGS / HGS для РУО"
      subtitle="Разделение нерастворимой твёрдой фазы по ASG с учётом типа соли рассола."
      inputs={
        <>
          <Field label="Плотность раствора, г/см³" value={s.mw} onChange={f("mw")} />
          <Field label="Масло по реторте, %" value={s.oil} onChange={f("oil")} />
          <Field label="Плотность масла, г/см³" value={s.oilSg} onChange={f("oilSg")} />
          <Field label="Вода по реторте, %" value={s.water} onChange={f("water")} />
          <Field label="Хлориды, мг/л" value={s.cl} onChange={f("cl")} />
          <SelectField
            label="Соль рассола"
            value={SALT_OPTIONS.find((o) => o.value === s.salt)?.label ?? ""}
            onChange={(label) => {
              const found = SALT_OPTIONS.find((o) => o.label === label);
              if (found) set((p) => ({ ...p, salt: found.value }));
            }}
            options={SALT_OPTIONS.map((o) => o.label)}
          />
        </>
      }
      results={<Results state={state} />}
    />
  );
}

/* ---------- 5 ---------- */

export function CuttingsModule() {
  const [s, set] = usePersistentState("mud.cuttings", {
    rho: "",
    k: "0",
    cl: "0",
    ca: "0",
    caco3: "0",
    barite: "0",
    grease: "",
    solid: "",
  });
  const f = (k: keyof typeof s) => (v: string) => set((p) => ({ ...p, [k]: v }));

  const state = useMemo<Attempt>(() => {
    if (!hasInput(s.rho, s.grease, s.solid)) return {};
    return attempt(() =>
      calcCuttings({
        rho: toNum(s.rho, "Плотность"),
        k: toNum(s.k, "K"),
        cl: toNum(s.cl, "Cl"),
        ca: toNum(s.ca, "Ca"),
        caco3: toNum(s.caco3, "CaCO3"),
        barite: toNum(s.barite, "Барит"),
        grease: toNum(s.grease, "Смазка"),
        solid: toNum(s.solid, "Твердая фаза"),
      }),
    );
  }, [s]);

  return (
    <ModuleShell
      title="Выбуренная порода"
      subtitle="Оценка нерастворимой породы: из твёрдой фазы вычитаются известные реагенты и соли."
      inputs={
        <>
          <Field label="ρ раствора, г/см³" value={s.rho} onChange={f("rho")} />
          <Field label="K⁺, мг/л" value={s.k} onChange={f("k")} />
          <Field label="Cl⁻, мг/л" value={s.cl} onChange={f("cl")} />
          <Field label="Ca²⁺, мг/л" value={s.ca} onChange={f("ca")} />
          <Field label="CaCO₃, кг/м³" value={s.caco3} onChange={f("caco3")} />
          <Field label="Барит, кг/м³" value={s.barite} onChange={f("barite")} />
          <Field label="Смазка, %" value={s.grease} onChange={f("grease")} />
          <Field label="Тв. фаза, %" value={s.solid} onChange={f("solid")} />
        </>
      }
      results={<Results state={state} />}
    />
  );
}

/* ---------- 6 ---------- */

const DEFAULT_ROWS: PrepRow[] = [
  { id: "r1", comp: "Базовое масло / дизель", qty: "35", unit: "м³ всего", rho: "850" },
  { id: "r2", comp: "Вода", qty: "15", unit: "м³ всего", rho: "1000" },
  { id: "r3", comp: "CaCl2 / Кальций хлор", qty: "4000", unit: "кг всего", rho: "2150" },
  { id: "r4", comp: "Барит", qty: "7000", unit: "кг всего", rho: "4200" },
  { id: "r5", comp: "Карбонат кальция / CaCO3", qty: "7000", unit: "кг всего", rho: "2700" },
];

export function PrepModule() {
  const [s, set] = usePersistentState("mud.prep", { rows: DEFAULT_ROWS });
  const rows = s.rows;

  const update = (id: string, patch: Partial<PrepRow>) =>
    set((p) => ({ rows: p.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));

  const state = useMemo<Attempt>(() => attempt(() => calcPrep(rows)), [rows]);

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-border bg-card/70 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Приготовление раствора
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Рецептура по компонентам: плотность, реторта, WPS, ионы и LGS/HGS будущего раствора.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                set((p) => ({
                  rows: [
                    ...p.rows,
                    { id: crypto.randomUUID(), comp: "Пусто", qty: "", unit: "кг всего", rho: "0" },
                  ],
                }))
              }
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="size-4" aria-hidden /> Компонент
            </button>
            <button
              type="button"
              onClick={() => set({ rows: DEFAULT_ROWS })}
              className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              Сброс
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] border-separate border-spacing-y-1.5 text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
                <th className="px-2 font-medium">Компонент</th>
                <th className="px-2 font-medium">Кол-во</th>
                <th className="px-2 font-medium">Ед.</th>
                <th className="px-2 font-medium">ρ, кг/м³</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="bg-secondary/40">
                  <td className="rounded-l-md px-2 py-1.5">
                    <select
                      value={r.comp}
                      onChange={(e) =>
                        update(r.id, {
                          comp: e.target.value,
                          rho: String(COMPONENTS[e.target.value]?.rho ?? 0),
                        })
                      }
                      className="h-9 w-full rounded border border-border bg-input/40 px-2 text-sm text-foreground outline-none focus:border-primary"
                    >
                      {Object.keys(COMPONENTS).map((k) => (
                        <option key={k} value={k} className="bg-card">
                          {k}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      step="any"
                      value={r.qty}
                      onChange={(e) => update(r.id, { qty: e.target.value })}
                      className="h-9 w-28 rounded border border-border bg-input/40 px-2 font-mono text-sm outline-none focus:border-primary"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={r.unit}
                      onChange={(e) => update(r.id, { unit: e.target.value as PrepRow["unit"] })}
                      className="h-9 rounded border border-border bg-input/40 px-2 text-sm outline-none focus:border-primary"
                    >
                      <option className="bg-card">кг всего</option>
                      <option className="bg-card">м³ всего</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      step="any"
                      value={r.rho}
                      onChange={(e) => update(r.id, { rho: e.target.value })}
                      className="h-9 w-28 rounded border border-border bg-input/40 px-2 font-mono text-sm outline-none focus:border-primary"
                    />
                  </td>
                  <td className="rounded-r-md px-2 py-1.5 text-right">
                    <button
                      type="button"
                      aria-label="Удалить строку"
                      onClick={() => set((p) => ({ rows: p.rows.filter((x) => x.id !== r.id) }))}
                      className="rounded p-2 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <Results state={state} />
      </div>
    </section>
  );
}