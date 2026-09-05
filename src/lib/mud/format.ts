export const fmt = (x: number, d = 3): string => (Number.isFinite(x) ? x.toFixed(d) : "0");

export class CalcError extends Error {}

export function toNum(value: string, label: string): number {
  const v = String(value ?? "").trim();
  if (v === "") return 0;
  const n = Number(v.replace(",", "."));
  if (Number.isNaN(n)) throw new CalcError(`${label}: введи число`);
  return n;
}

export function parseRatio(txt: string): [number, number] {
  const s = String(txt || "").replaceAll(" ", "");
  if (!s.includes("/")) throw new CalcError("ВНО введи через '/', например 70/30");
  const parts = s.split("/").map((x) => Number(x.replace(",", ".")));
  const a = parts[0] ?? NaN;
  const b = parts[1] ?? NaN;
  if (!(a >= 0) || !(b >= 0) || a + b <= 0) throw new CalcError("ВНО указано неверно");
  return [a / (a + b), b / (a + b)];
}

export type Metric = { name: string; value: string; unit?: string };
export type CalcResult = { metrics: Metric[]; report: string; warnings: string[] };
