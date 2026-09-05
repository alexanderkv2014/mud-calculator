import { CalcError, fmt, parseRatio, type CalcResult, type Metric } from "./format";

export const MATERIALS: Record<string, number> = {
  "Барит - 4.20 г/см³": 4200,
  "Мел - 2.70 г/см³": 2700,
  "Калий хлор - 1.984 г/см³": 1984,
  "Натрий хлор / Галит - 2.16 г/см³": 2160,
  "Кальций хлор - 2.15 г/см³": 2150,
  "Бентонит - 2.60 г/см³": 2600,
  "Гематит - 5.20 г/см³": 5200,
};

export const MAX_DELTA: Record<string, number | null> = {
  "Калий хлор - 1.984 г/см³": 0.16,
  "Натрий хлор / Галит - 2.16 г/см³": 0.2,
  "Кальций хлор - 2.15 г/см³": 0.4,
  "Мел - 2.70 г/см³": 0.35,
  "Бентонит - 2.60 г/см³": 0.0,
  "Барит - 4.20 г/см³": null,
  "Гематит - 5.20 г/см³": null,
};

export const MAX_CONC: Record<string, number | null> = {
  "Калий хлор - 1.984 г/см³": 310,
  "Натрий хлор / Галит - 2.16 г/см³": 320,
  "Кальций хлор - 2.15 г/см³": 670,
  "Мел - 2.70 г/см³": 900,
  "Бентонит - 2.60 г/см³": 60,
  "Барит - 4.20 г/см³": null,
  "Гематит - 5.20 г/см³": null,
};

export const CURRENT_CONC_IDS: { key: string; label: string; material: string }[] = [
  { key: "barite", label: "Барит уже в растворе, кг/м³", material: "Барит - 4.20 г/см³" },
  { key: "chalk", label: "Мел уже в растворе, кг/м³", material: "Мел - 2.70 г/см³" },
  { key: "kcl", label: "KCl уже в растворе, кг/м³", material: "Калий хлор - 1.984 г/см³" },
  {
    key: "nacl",
    label: "NaCl/галит уже в растворе, кг/м³",
    material: "Натрий хлор / Галит - 2.16 г/см³",
  },
  { key: "cacl2", label: "CaCl2 уже в растворе, кг/м³", material: "Кальций хлор - 2.15 г/см³" },
  { key: "bentonite", label: "Бентонит уже в растворе, кг/м³", material: "Бентонит - 2.60 г/см³" },
];

const m = (name: string, value: string, unit?: string): Metric =>
  unit === undefined ? { name, value } : { name, value, unit };

/* ---------- 1. Желаемое ВНО / корректировка РУО ---------- */

export function calcOwr(i: {
  V: number;
  rhoFact: number;
  water: number;
  oil: number;
  oilSg: number;
  rhoTarget: number;
  target: string;
}): CalcResult {
  const { V, rhoFact, water, oil, oilSg, rhoTarget } = i;
  if (V <= 0) throw new CalcError("Объем должен быть больше 0");
  if (rhoFact <= 0 || rhoTarget <= 0 || oilSg <= 0)
    throw new CalcError("Плотности должны быть больше 0");
  if (water < 0 || oil < 0 || water + oil <= 0 || water + oil > 100)
    throw new CalcError("Проверь масло/воду по реторте");
  const [targetOil, targetWater] = parseRatio(i.target);
  if (targetOil <= 0 || targetOil >= 1)
    throw new CalcError("ВНО должно быть реальным, например 70/30");

  const Vw = (V * water) / 100;
  const Vo = (V * oil) / 100;
  const oilNeeded = (targetOil / (1 - targetOil)) * Vw;
  const waterNeeded = ((1 - targetOil) / targetOil) * Vo;
  const oilAdd = Math.max(0, oilNeeded - Vo);
  const waterAdd = Math.max(0, waterNeeded - Vw);
  const baseAfter = V + oilAdd + waterAdd;
  const massAfter = 1000 * rhoFact * V + 1000 * oilSg * oilAdd + 1000 * waterAdd;
  const numerator = 1000 * rhoTarget * baseAfter - massAfter;
  let barite = 0;
  let chalk = 0;
  if (numerator > 0) {
    barite = numerator / (1 - (1000 * rhoTarget) / 4200);
    chalk = numerator / (1 - (1000 * rhoTarget) / 2700);
  }
  const factOil = (oil / (oil + water)) * 100;
  const factWater = (water / (oil + water)) * 100;

  const warnings: string[] = [];
  if (numerator <= 0)
    warnings.push(
      "После жидкой корректировки плотность уже не ниже целевой — утяжелитель не нужен.",
    );
  if (1000 * rhoTarget >= 2700)
    warnings.push("Целевая плотность близка к плотности мела — утяжеление мелом нереалистично.");

  return {
    metrics: [
      m("Факт. ВНО", `${fmt(factOil, 1)}/${fmt(factWater, 1)}`),
      m("Масло добавить", fmt(oilAdd, 3), "м³"),
      m("Водная фаза добавить", fmt(waterAdd, 3), "м³"),
      m("Барит", fmt(barite, 1), "кг"),
      m("Мел", fmt(chalk, 1), "кг"),
    ],
    warnings,
    report: `ПОДРОБНЫЙ РАСЧЕТ: ЖЕЛАЕМОЕ ВНО / КОРРЕКТИРОВКА РУО

Блок решает две задачи:
1) сколько добавить масла или водной фазы для выхода на целевое ВНО;
2) сколько утяжелителя нужно после жидкой корректировки для выхода на целевую плотность.

Входные данные:
- Объем раствора V = ${fmt(V, 3)} м³
- Плотность текущая ρфакт = ${fmt(rhoFact, 3)} г/см³
- Плотность желаемая ρцель = ${fmt(rhoTarget, 3)} г/см³
- Плотность масла ρмасла = ${fmt(oilSg, 3)} г/см³
- Масло по реторте = ${fmt(oil, 3)} %
- Вода по реторте = ${fmt(water, 3)} %
- Желаемое ВНО = ${i.target}

ШАГ 1. Фактическое ВНО
Сумма жидких фаз = ${fmt(oil, 3)} + ${fmt(water, 3)} = ${fmt(oil + water, 3)} %
Факт масло = ${fmt(oil, 3)} / ${fmt(oil + water, 3)} × 100 = ${fmt(factOil, 3)} %
Факт вода = ${fmt(water, 3)} / ${fmt(oil + water, 3)} × 100 = ${fmt(factWater, 3)} %
Факт ВНО = ${fmt(factOil, 1)}/${fmt(factWater, 1)}

ШАГ 2. Перевод реторты в объемы фаз
Vмасла = V × Масло / 100 = ${fmt(Vo, 6)} м³
Vводы  = V × Вода / 100 = ${fmt(Vw, 6)} м³

ШАГ 3. Целевое отношение фаз
Целевая доля масла = ${fmt(targetOil, 6)}
Целевая доля воды  = ${fmt(targetWater, 6)}
Нужно масла при текущей воде = ${fmt(oilNeeded, 6)} м³
Нужно воды при текущем масле = ${fmt(waterNeeded, 6)} м³
Масло добавить = max(0; ${fmt(oilNeeded, 6)} - ${fmt(Vo, 6)}) = ${fmt(oilAdd, 6)} м³
Вода добавить  = max(0; ${fmt(waterNeeded, 6)} - ${fmt(Vw, 6)}) = ${fmt(waterAdd, 6)} м³

ШАГ 4. Объем после жидкой корректировки
Vпосле = ${fmt(V, 3)} + ${fmt(oilAdd, 6)} + ${fmt(waterAdd, 6)} = ${fmt(baseAfter, 6)} м³

ШАГ 5. Масса после жидкой корректировки
Масса исходного раствора = 1000 × ${fmt(rhoFact, 3)} × ${fmt(V, 3)} = ${fmt(1000 * rhoFact * V, 3)} кг
Масса добавленного масла = 1000 × ${fmt(oilSg, 3)} × ${fmt(oilAdd, 6)} = ${fmt(1000 * oilSg * oilAdd, 3)} кг
Масса добавленной воды   = 1000 × ${fmt(waterAdd, 6)} = ${fmt(1000 * waterAdd, 3)} кг
Масса после = ${fmt(massAfter, 3)} кг

ШАГ 6. Недостающая масса
Требуемая масса = 1000 × ρцель × Vпосле = ${fmt(1000 * rhoTarget * baseAfter, 3)} кг
Дефицит массы = ${fmt(numerator, 3)} кг (до объемной поправки)

ШАГ 7-8. Утяжелитель с учетом собственного объема
m = (1000 × ρцель × Vпосле - Mпосле) / (1 - 1000 × ρцель / ρреагента)
Барит (4200 кг/м³) = ${fmt(barite, 3)} кг, объем ${fmt(barite / 4200, 6)} м³
Мел   (2700 кг/м³) = ${fmt(chalk, 3)} кг, объем ${fmt(chalk / 2700, 6)} м³

ИТОГ:
- Факт ВНО: ${fmt(factOil, 1)}/${fmt(factWater, 1)}
- Масло добавить: ${fmt(oilAdd, 3)} м³
- Водная фаза добавить: ${fmt(waterAdd, 3)} м³
- Барит: ${fmt(barite, 1)} кг
- Мел: ${fmt(chalk, 1)} кг

Важно: барит ИЛИ мел. Складывать эти значения нельзя.`,
  };
}

/* ---------- 2. Утяжеление ---------- */

export function calcWeight(i: {
  V: number;
  rhoFact: number;
  rhoTarget: number;
  material: string;
  current: number;
}): CalcResult {
  const { V, rhoFact, rhoTarget, material, current } = i;
  if (V <= 0) throw new CalcError("Объем должен быть больше 0");
  if (rhoTarget <= rhoFact) throw new CalcError("Это не утяжеление");
  const rhoMat = MATERIALS[material];
  if (!rhoMat) throw new CalcError("Выбери реагент");
  if (1000 * rhoTarget >= rhoMat) throw new CalcError("Целевая плотность выше плотности реагента");
  if (current < 0) throw new CalcError("Текущая концентрация не может быть отрицательной");

  const addKg = (1000 * V * (rhoTarget - rhoFact)) / (1 - (1000 * rhoTarget) / rhoMat);
  const addVol = addKg / rhoMat;
  const finalVol = V + addVol;
  const addKgM3 = addKg / V;
  const finalConc = current + addKgM3;
  const maxDelta = MAX_DELTA[material] ?? null;
  const maxConc = MAX_CONC[material] ?? null;
  const requestedDelta = rhoTarget - rhoFact;

  let availableDelta: number | null = null;
  let availableConc: number | null = null;
  const warnings: string[] = [];
  if (maxDelta !== null && maxConc !== null) {
    const usedPart = Math.max(0, Math.min(1, current / maxConc));
    availableDelta = maxDelta * (1 - usedPart);
    availableConc = Math.max(0, maxConc - current);
    if (requestedDelta > availableDelta + 1e-9)
      warnings.push(
        `Рекомендуемый предел подъема этим реагентом ≈ +${fmt(availableDelta, 2)} г/см³, запрошено +${fmt(requestedDelta, 2)}. Расчет показан, но практически это за пределом.`,
      );
    if (addKgM3 > availableConc + 1e-9)
      warnings.push(
        `Требуется ${fmt(addKgM3, 1)} кг/м³, рекомендуемый запас ${fmt(availableConc, 1)} кг/м³.`,
      );
  } else {
    warnings.push("Жесткого лимита нет. Контролируй реологию, HGS, седиментацию и ЭЦП.");
  }

  const checkRho = (1000 * V * rhoFact + addKg) / finalVol / 1000;

  return {
    metrics: [
      m("Добавить", fmt(addKg, 1), "кг"),
      m("Добавить", fmt(addKgM3, 1), "кг/м³"),
      m("Объем добавки", fmt(addVol, 3), "м³"),
      m("Итоговый объем", fmt(finalVol, 3), "м³"),
      m("Конц. после", fmt(finalConc, 1), "кг/м³"),
      m(
        "Запас подъема",
        availableDelta === null ? "без лимита" : `+${fmt(availableDelta, 2)}`,
        availableDelta === null ? undefined : "г/см³",
      ),
    ],
    warnings,
    report: `ПОДРОБНЫЙ РАСЧЕТ: УТЯЖЕЛЕНИЕ

Входные данные:
- Объем V = ${fmt(V, 3)} м³
- Текущая плотность ρфакт = ${fmt(rhoFact, 3)} г/см³
- Целевая плотность ρцель = ${fmt(rhoTarget, 3)} г/см³
- Реагент = ${material} (ρ = ${rhoMat} кг/м³)
- Текущая концентрация реагента = ${fmt(current, 3)} кг/м³

ШАГ 1. Проверка
Δρ = ${fmt(rhoTarget, 3)} - ${fmt(rhoFact, 3)} = ${fmt(requestedDelta, 6)} г/см³

ШАГ 2. Масса исходного раствора
Mисх = 1000 × V × ρфакт = ${fmt(1000 * V * rhoFact, 3)} кг

ШАГ 3. Простой (неверный) недобор массы
1000 × V × Δρ = ${fmt(1000 * V * requestedDelta, 3)} кг
Так считать нельзя: утяжелитель сам занимает объем.

ШАГ 4. Формула с объемной поправкой
m = 1000 × V × (ρцель - ρфакт) / (1 - 1000 × ρцель / ρреагента)
m = 1000 × ${fmt(V, 3)} × ${fmt(requestedDelta, 6)} / (1 - 1000 × ${fmt(rhoTarget, 3)} / ${rhoMat})
m = ${fmt(addKg, 6)} кг

ШАГ 5. Объем добавки и итоговый объем
Vдобавки = ${fmt(addKg, 6)} / ${rhoMat} = ${fmt(addVol, 6)} м³
Vитог = ${fmt(V, 3)} + ${fmt(addVol, 6)} = ${fmt(finalVol, 6)} м³

ШАГ 6. Проверка плотности
ρпроверка = (${fmt(1000 * V * rhoFact, 3)} + ${fmt(addKg, 3)}) / ${fmt(finalVol, 6)} / 1000 = ${fmt(checkRho, 6)} г/см³

ШАГ 7. Дозировка и концентрация
кг/м³ = ${fmt(addKg, 6)} / ${fmt(V, 3)} = ${fmt(addKgM3, 6)} кг/м³
Концентрация после = ${fmt(current, 3)} + ${fmt(addKgM3, 6)} = ${fmt(finalConc, 6)} кг/м³

ШАГ 8. Ограничения по реагенту
${
  availableDelta === null
    ? "Для этого реагента жесткий лимит не задан. Контролируй реологию, HGS и ЭЦП."
    : `Максимальная условная концентрация = ${fmt(maxConc ?? 0, 3)} кг/м³
Оставшийся запас концентрации = ${fmt(availableConc ?? 0, 6)} кг/м³
Доступный подъем плотности = +${fmt(availableDelta, 6)} г/см³
Запрошенный подъем плотности = +${fmt(requestedDelta, 6)} г/см³`
}

ИТОГ:
- Добавить всего: ${fmt(addKg, 1)} кг
- Добавить на 1 м³: ${fmt(addKgM3, 1)} кг/м³
- Итоговый объем: ${fmt(finalVol, 3)} м³
- Концентрация после: ${fmt(finalConc, 1)} кг/м³`,
  };
}

/* ---------- 3. Смешивание ---------- */

export function calcMix(i: {
  v1: number;
  rho1: number;
  owr1: string;
  v2: number;
  rho2: number;
  owr2: string;
}): CalcResult {
  const { v1, rho1, v2, rho2 } = i;
  if (v1 < 0 || v2 < 0 || v1 + v2 <= 0) throw new CalcError("Проверь объемы");
  if (rho1 <= 0 || rho2 <= 0) throw new CalcError("Плотности должны быть больше 0");
  const [ok1, wk1] = parseRatio(i.owr1);
  const [ok2, wk2] = parseRatio(i.owr2);
  const finalVol = v1 + v2;
  const finalRho = (rho1 * v1 + rho2 * v2) / finalVol;
  const oil1 = v1 * ok1;
  const water1 = v1 * wk1;
  const oil2 = v2 * ok2;
  const water2 = v2 * wk2;
  const oilT = oil1 + oil2;
  const waterT = water1 + water2;
  const oilRatio = (oilT / (oilT + waterT)) * 100;
  const waterRatio = (waterT / (oilT + waterT)) * 100;

  return {
    metrics: [
      m("Итоговый объем", fmt(finalVol, 3), "м³"),
      m("Итоговая плотность", fmt(finalRho, 3), "г/см³"),
      m("Итоговое ВНО", `${fmt(oilRatio, 1)}/${fmt(waterRatio, 1)}`),
    ],
    warnings: [],
    report: `ПОДРОБНЫЙ РАСЧЕТ: СМЕШИВАНИЕ РАСТВОРОВ

Раствор 1: V1 = ${fmt(v1, 3)} м³, ρ1 = ${fmt(rho1, 3)} г/см³, ВНО1 = ${i.owr1}
Раствор 2: V2 = ${fmt(v2, 3)} м³, ρ2 = ${fmt(rho2, 3)} г/см³, ВНО2 = ${i.owr2}

ШАГ 1. Итоговый объем
Vитог = ${fmt(v1, 3)} + ${fmt(v2, 3)} = ${fmt(finalVol, 6)} м³

ШАГ 2. Массы
M1 = 1000 × ${fmt(rho1, 3)} × ${fmt(v1, 3)} = ${fmt(1000 * rho1 * v1, 3)} кг
M2 = 1000 × ${fmt(rho2, 3)} × ${fmt(v2, 3)} = ${fmt(1000 * rho2 * v2, 3)} кг
Mитог = ${fmt(1000 * rho1 * v1 + 1000 * rho2 * v2, 3)} кг

ШАГ 3. Итоговая плотность
ρитог = Mитог / Vитог / 1000 = ${fmt(finalRho, 6)} г/см³

ШАГ 4. Фазы раствора 1
Масло 1 = ${fmt(v1, 3)} × ${fmt(ok1, 6)} = ${fmt(oil1, 6)} м³
Вода 1  = ${fmt(v1, 3)} × ${fmt(wk1, 6)} = ${fmt(water1, 6)} м³

ШАГ 5. Фазы раствора 2
Масло 2 = ${fmt(v2, 3)} × ${fmt(ok2, 6)} = ${fmt(oil2, 6)} м³
Вода 2  = ${fmt(v2, 3)} × ${fmt(wk2, 6)} = ${fmt(water2, 6)} м³

ШАГ 6. Итоговое ВНО
Масло всего = ${fmt(oilT, 6)} м³, вода всего = ${fmt(waterT, 6)} м³
Oil ratio = ${fmt(oilRatio, 6)} %
Water ratio = ${fmt(waterRatio, 6)} %
ВНО итог = ${fmt(oilRatio, 1)}/${fmt(waterRatio, 1)}

Примечание: смешивание считается по правилу аддитивности объемов и масс, без учета усадки.`,
  };
}

/* ---------- 4. LGS/HGS РУО ---------- */

export type BrineSalt = "CaCl2" | "NaCl" | "KCl";

const SALT_META: Record<BrineSalt, { label: string; clFactor: number }> = {
  CaCl2: { label: "CaCl₂", clFactor: 110.98 / 70.9 },
  NaCl: { label: "NaCl", clFactor: 58.44 / 35.45 },
  KCl: { label: "KCl", clFactor: 74.55 / 35.45 },
};

export function brineSgFromPct(salt: BrineSalt, pct: number): number {
  if (salt === "CaCl2") return 0.99707 + 0.007923 * pct + 0.00004964 * pct ** 2;
  if (salt === "NaCl") return 0.99707 + 0.006504 * pct + 0.00004395 * pct ** 2;
  return 0.99707 + 0.005 * pct + 0.0000355 * pct ** 2;
}

export function calcRuo(i: {
  mw: number;
  oil: number;
  oilSg: number;
  water: number;
  cl: number;
  salt: BrineSalt;
}): CalcResult {
  const { mw, oil, oilSg, water, cl, salt } = i;
  if (mw <= 0 || oilSg <= 0 || water <= 0 || oil < 0 || oil + water >= 100 || cl < 0)
    throw new CalcError("Проверь входные данные");
  const meta = SALT_META[salt];
  const saltMgL = meta.clFactor * cl;
  const saltPct = (100 * saltMgL) / (saltMgL + 10000 * water);
  const wps = saltPct * 10000;
  const brineSg = brineSgFromPct(salt, saltPct);
  const brinePct = water / (brineSg * (1 - wps * 0.000001));
  const insoluble = 100 - oil - brinePct;
  if (insoluble <= 0) throw new CalcError("Нерастворимые твердые <= 0. Проверь реторту и хлориды.");
  const asg = (mw * 100 - oil * oilSg - brinePct * brineSg) / insoluble;
  let lgs = ((4.2 - asg) / (4.2 - 2.6)) * insoluble;
  let hgs = insoluble - lgs;
  const warnings: string[] = [];
  if (lgs < 0 || hgs < 0) warnings.push("ASG вне диапазона 2.6-4.2, LGS/HGS ограничены нулем.");
  lgs = Math.max(0, lgs);
  hgs = Math.max(0, hgs);
  const owrOil = (oil / (oil + water)) * 100;
  const owrWater = (water / (oil + water)) * 100;

  return {
    metrics: [
      m("OWR", `${fmt(owrOil, 1)}/${fmt(owrWater, 1)}`),
      m("WPS", fmt(wps, 1), "ppm"),
      m("Brine SG", fmt(brineSg, 3)),
      m("Рассол", fmt(brinePct, 2), "%"),
      m("Insoluble solids", fmt(insoluble, 2), "%"),
      m("ASG", fmt(asg, 3)),
      m("LGS", fmt(lgs, 2), "%"),
      m("HGS", fmt(hgs, 2), "%"),
      m("LGS", fmt(lgs * 26, 1), "кг/м³"),
      m("HGS", fmt(hgs * 42, 1), "кг/м³"),
    ],
    warnings,
    report: `ПОДРОБНЫЙ РАСЧЕТ: LGS/HGS РУО

Входные данные:
- Плотность раствора MW = ${fmt(mw, 3)} г/см³
- Масло по реторте = ${fmt(oil, 3)} %
- Вода по реторте = ${fmt(water, 3)} %
- Плотность масла = ${fmt(oilSg, 3)} г/см³
- Хлориды = ${fmt(cl, 3)} мг/л
- Соль рассола = ${meta.label}

ШАГ 1. OWR
OWR oil = ${fmt(oil, 3)} / ${fmt(oil + water, 3)} × 100 = ${fmt(owrOil, 6)} %
OWR water = ${fmt(water, 3)} / ${fmt(oil + water, 3)} × 100 = ${fmt(owrWater, 6)} %

ШАГ 2. Пересчет хлоридов в соль
${meta.label} = ${fmt(meta.clFactor, 4)} × Cl⁻ = ${fmt(saltMgL, 3)} мг/л

ШАГ 3. Массовый процент соли в водной фазе
% = 100 × соль / (соль + 10000 × Water%) = ${fmt(saltPct, 6)} %

ШАГ 4. WPS
WPS = % × 10000 = ${fmt(wps, 3)} ppm

ШАГ 5. Плотность рассола
Brine SG (${meta.label}) = ${fmt(brineSg, 6)} г/см³

ШАГ 6. Скорректированный объем рассола
Corrected brine % = Water / (Brine SG × (1 - WPS × 10⁻⁶)) = ${fmt(brinePct, 6)} %

ШАГ 7. Нерастворимые твердые
Insoluble = 100 - Oil - Corrected brine = ${fmt(insoluble, 6)} %

ШАГ 8. Средняя плотность твердых
ASG = ((MW × 100) - Oil × OilSG - Brine% × BrineSG) / Insoluble = ${fmt(asg, 6)}

ШАГ 9. Разделение LGS/HGS (2.6 и 4.2 г/см³)
LGS = ((4.2 - ASG) / (4.2 - 2.6)) × Insoluble = ${fmt(lgs, 6)} %
HGS = Insoluble - LGS = ${fmt(hgs, 6)} %

ШАГ 10. Перевод в кг/м³
LGS = ${fmt(lgs, 6)} × 26 = ${fmt(lgs * 26, 3)} кг/м³
HGS = ${fmt(hgs, 6)} × 42 = ${fmt(hgs * 42, 3)} кг/м³

Примечание: растворимые соли входят в сухой остаток реторты, но не относятся к LGS/HGS.`,
  };
}

/* ---------- 5. Выбуренная порода ---------- */

export function calcCuttings(i: {
  rho: number;
  k: number;
  cl: number;
  ca: number;
  caco3: number;
  barite: number;
  grease: number;
  solid: number;
}): CalcResult {
  const { rho, k, cl, ca, caco3, barite, grease, solid } = i;
  const water = 100 - grease - solid;
  if (rho <= 0) throw new CalcError("Плотность должна быть больше 0");
  if (water < 0 || solid < 0) throw new CalcError("Проверь реторту: смазка + твердая фаза > 100 %");

  const vSolid = solid / 100;
  const vBarite = barite / 4200;
  const vCaco3 = caco3 / 2700;
  const kclMgL = k * (74.55 / 39.1);
  const clFromKcl = kclMgL * (35.45 / 74.55);
  const cacl2MgL = ca * (110.98 / 40.08);
  const clFromCacl2 = cacl2MgL * (70.9 / 110.98);
  const clRemaining = Math.max(0, cl - clFromKcl - clFromCacl2);
  const naclMgL = clRemaining * (58.44 / 35.45);
  const kclKg = kclMgL / 1000;
  const cacl2Kg = cacl2MgL / 1000;
  const naclKg = naclMgL / 1000;
  const vKcl = kclKg / 1980;
  const vCacl2 = cacl2Kg / 2150;
  const vNacl = naclKg / 2160;
  const known = vBarite + vCaco3 + vKcl + vCacl2 + vNacl;
  const vCut = Math.max(0, vSolid - known);
  const cutPct = vCut * 100;

  const warnings: string[] = [];
  if (cl > 0 && cl < clFromKcl + clFromCacl2)
    warnings.push("Хлоридов меньше, чем дают K⁺ и Ca²⁺ — NaCl принят равным нулю, проверь анализ.");
  if (vSolid < known)
    warnings.push("Известные solids превышают твердую фазу по реторте — проверь дозировки.");
  if (cutPct > 6) warnings.push("Выбуренная порода выше 6 % — усиль очистку.");

  return {
    metrics: [
      m("Вода по реторте", fmt(water, 1), "%"),
      m("Выбуренная порода", fmt(cutPct, 2), "%"),
      m("Известные solids", fmt(known * 100, 2), "%"),
    ],
    warnings,
    report: `ПОДРОБНЫЙ РАСЧЕТ: ВЫБУРЕННАЯ ПОРОДА

Входные данные:
- ρ раствора = ${fmt(rho, 3)} г/см³
- K⁺ = ${fmt(k, 1)} мг/л, Cl⁻ = ${fmt(cl, 1)} мг/л, Ca²⁺ = ${fmt(ca, 1)} мг/л
- CaCO₃ = ${fmt(caco3, 1)} кг/м³, Барит = ${fmt(barite, 1)} кг/м³
- Смазка = ${fmt(grease, 2)} %, Твердая фаза = ${fmt(solid, 2)} %

ШАГ 1. Вода по реторте
Water = 100 - Смазка - Твердая фаза = ${fmt(water, 3)} %

ШАГ 2. Объемные доли известных твердых (на 1 м³)
Vsolid = ${fmt(vSolid, 6)} м³
Vбарит = ${fmt(barite, 1)} / 4200 = ${fmt(vBarite, 8)} м³
VCaCO₃ = ${fmt(caco3, 1)} / 2700 = ${fmt(vCaco3, 8)} м³

ШАГ 3. Соли из ионного анализа
KCl = K⁺ × 74.55 / 39.10 = ${fmt(kclMgL, 1)} мг/л → ${fmt(kclKg, 4)} кг/м³ → V = ${fmt(vKcl, 8)} м³
Cl⁻ от KCl = ${fmt(clFromKcl, 1)} мг/л
CaCl₂ = Ca²⁺ × 110.98 / 40.08 = ${fmt(cacl2MgL, 1)} мг/л → ${fmt(cacl2Kg, 4)} кг/м³ → V = ${fmt(vCacl2, 8)} м³
Cl⁻ от CaCl₂ = ${fmt(clFromCacl2, 1)} мг/л
Остаток Cl⁻ = max(0; ${fmt(cl, 1)} - ${fmt(clFromKcl, 1)} - ${fmt(clFromCacl2, 1)}) = ${fmt(clRemaining, 1)} мг/л
NaCl = остаток × 58.44 / 35.45 = ${fmt(naclMgL, 1)} мг/л → ${fmt(naclKg, 4)} кг/м³ → V = ${fmt(vNacl, 8)} м³

ШАГ 4. Известные solids
Known = Vбарит + VCaCO₃ + VKCl + VCaCl₂ + VNaCl = ${fmt(known, 8)} м³ = ${fmt(known * 100, 4)} %

ШАГ 5. Выбуренная порода
Vcuttings = max(0; Vsolid - Known) = ${fmt(vCut, 8)} м³
Выбуренная порода = ${fmt(cutPct, 4)} %

Примечание: соли учтены как объем сухого вещества, поэтому результат — оценка сверху для нерастворимой породы.`,
  };
}

/* ---------- 6. Приготовление ---------- */

export type ComponentKind = "empty" | "water" | "oil" | "hgs" | "lgs" | "salt";

export const COMPONENTS: Record<
  string,
  { rho: number; kind: ComponentKind; k?: number; na?: number; ca?: number; cl?: number }
> = {
  Пусто: { rho: 0, kind: "empty" },
  Вода: { rho: 1000, kind: "water" },
  "Базовое масло / дизель": { rho: 850, kind: "oil" },
  Смазка: { rho: 850, kind: "oil" },
  Барит: { rho: 4200, kind: "hgs" },
  Гематит: { rho: 5200, kind: "hgs" },
  "Карбонат кальция / CaCO3": { rho: 2700, kind: "lgs" },
  Бентонит: { rho: 2600, kind: "lgs" },
  "KCl / Калий хлор": { rho: 1984, kind: "salt", k: 39.1 / 74.55, cl: 35.45 / 74.55 },
  "NaCl / Галит": { rho: 2160, kind: "salt", na: 22.99 / 58.44, cl: 35.45 / 58.44 },
  "CaCl2 / Кальций хлор": { rho: 2150, kind: "salt", ca: 40.08 / 110.98, cl: 70.9 / 110.98 },
};

export type PrepRow = {
  id: string;
  comp: string;
  qty: string;
  unit: "кг всего" | "м³ всего";
  rho: string;
};

export function calcPrep(rows: PrepRow[]): CalcResult {
  let totalMass = 0;
  let waterMass = 0;
  let waterVol = 0;
  let oilMass = 0;
  let oilVol = 0;
  let hgsVol = 0;
  let lgsVol = 0;
  let dryVol = 0;
  let kclMass = 0;
  let naclMass = 0;
  let cacl2Mass = 0;
  let kMass = 0;
  let naMass = 0;
  let caMass = 0;
  let clMass = 0;
  const lines: string[] = [];
  const warnings: string[] = [];

  rows.forEach((r, idx) => {
    if (r.comp === "Пусто") return;
    const qty = Number(String(r.qty).replace(",", ".") || 0);
    const rho = Number(String(r.rho).replace(",", ".") || 0);
    if (!Number.isFinite(qty) || !Number.isFinite(rho) || qty < 0 || rho <= 0)
      throw new CalcError(`Строка ${idx + 1}: проверь количество и плотность`);
    const volDry = r.unit === "кг всего" ? qty / rho : qty;
    const mass = r.unit === "кг всего" ? qty : qty * rho;
    totalMass += mass;
    const info = COMPONENTS[r.comp];
    if (!info) return;
    lines.push(`${idx + 1}. ${r.comp}: ${fmt(mass, 2)} кг, объем сухого ${fmt(volDry, 4)} м³`);
    if (info.kind === "water") {
      waterMass += mass;
      waterVol += volDry;
    } else if (info.kind === "oil") {
      oilMass += mass;
      oilVol += volDry;
    } else if (info.kind === "hgs") {
      dryVol += volDry;
      hgsVol += volDry;
    } else if (info.kind === "lgs") {
      dryVol += volDry;
      lgsVol += volDry;
    } else if (info.kind === "salt") {
      if (r.comp.includes("KCl")) {
        kclMass += mass;
        kMass += mass * (info.k ?? 0);
        clMass += mass * (info.cl ?? 0);
      } else if (r.comp.includes("NaCl")) {
        naclMass += mass;
        naMass += mass * (info.na ?? 0);
        clMass += mass * (info.cl ?? 0);
      } else if (r.comp.includes("CaCl2")) {
        cacl2Mass += mass;
        caMass += mass * (info.ca ?? 0);
        clMass += mass * (info.cl ?? 0);
      }
    }
  });

  const saltMass = kclMass + naclMass + cacl2Mass;
  let brineMass = 0;
  let brineSg = 0;
  let brineVol = 0;
  if (waterMass > 0) {
    brineMass = waterMass + saltMass;
    const naclEquiv = naclMass + kclMass;
    const naclPct = (naclEquiv / brineMass) * 100;
    const cacl2Pct = (cacl2Mass / brineMass) * 100;
    brineSg =
      0.99707 +
      0.006504 * naclPct +
      0.007923 * cacl2Pct +
      0.00008334 * naclPct * cacl2Pct +
      0.00004395 * naclPct ** 2 +
      0.00004964 * cacl2Pct ** 2;
    brineVol = brineMass / (brineSg * 1000);
  } else {
    const saltDryVol = kclMass / 1984 + naclMass / 2160 + cacl2Mass / 2150;
    dryVol += saltDryVol;
    lgsVol += saltDryVol;
  }

  const totalVol = brineVol + oilVol + dryVol;
  if (totalVol <= 0) throw new CalcError("Добавь хотя бы один компонент");
  const density = totalMass / totalVol / 1000;
  const oilSg = oilVol > 0 ? oilMass / (oilVol * 1000) : 0.85;
  const totalL = totalVol * 1000;
  const kMgL = (kMass * 1e6) / totalL;
  const naMgL = (naMass * 1e6) / totalL;
  const caMgL = (caMass * 1e6) / totalL;
  const clMgL = (clMass * 1e6) / totalL;
  const wps = brineMass > 0 ? (saltMass / brineMass) * 1e6 : 0;
  const oilPct = (oilVol / totalVol) * 100;
  const waterPct = (waterVol / totalVol) * 100;
  const brinePct = (brineVol / totalVol) * 100;
  const retortSolids = 100 - oilPct - waterPct;
  const insoluble = 100 - oilPct - brinePct;
  const compHgs = (hgsVol / totalVol) * 100;
  const compLgs = (lgsVol / totalVol) * 100;
  let asg = 0;
  let lgs = 0;
  let hgs = 0;
  if (insoluble > 0) {
    asg = (density * 100 - oilPct * oilSg - brinePct * brineSg) / insoluble;
    lgs = ((4.2 - asg) / (4.2 - 2.6)) * insoluble;
    hgs = insoluble - lgs;
    if (lgs < 0 || hgs < 0) warnings.push("ASG вышел за диапазон 2.6-4.2, LGS/HGS ограничены.");
    lgs = Math.max(0, lgs);
    hgs = Math.max(0, hgs);
  }
  const owr =
    oilVol + waterVol > 0
      ? `${fmt((oilVol / (oilVol + waterVol)) * 100, 1)}/${fmt((waterVol / (oilVol + waterVol)) * 100, 1)}`
      : "0/0";
  if (saltMass > 0 && waterMass <= 0) warnings.push("Есть соль без воды — она не растворится.");
  if (retortSolids > 20) warnings.push("Твердая фаза выше 20 %.");
  if (cacl2Mass / Math.max(waterVol, 1e-9) > 300)
    warnings.push("CaCl₂ выше 300 кг/м³ водной фазы.");

  return {
    metrics: [
      m("Общая масса", fmt(totalMass, 1), "кг"),
      m("Общий объем", fmt(totalVol, 3), "м³"),
      m("Плотность", fmt(density, 3), "г/см³"),
      m("OWR", owr),
      m("Oil retort", fmt(oilPct, 2), "%"),
      m("Water retort", fmt(waterPct, 2), "%"),
      m("Retort solids", fmt(retortSolids, 2), "%"),
      m("Brine SG", fmt(brineSg, 3)),
      m("WPS", fmt(wps, 0), "ppm"),
      m("Insoluble solids", fmt(insoluble, 2), "%"),
      m("ASG", fmt(asg, 3)),
      m("LGS", fmt(lgs, 2), "%"),
      m("HGS", fmt(hgs, 2), "%"),
      m("Cl⁻", fmt(clMgL, 0), "мг/л"),
      m("Ca²⁺", fmt(caMgL, 0), "мг/л"),
    ],
    warnings,
    report: `ОТЧЕТ: ПРИГОТОВЛЕНИЕ РАСТВОРА

Компоненты:
${lines.join("\n") || "нет компонентов"}

1. Масса
Общая масса = ${fmt(totalMass, 2)} кг

2. Рассол
Масса воды = ${fmt(waterMass, 2)} кг
Масса солей = ${fmt(saltMass, 2)} кг
Масса рассола = ${fmt(brineMass, 2)} кг
Плотность рассола = ${fmt(brineSg, 4)} г/см³
Объем рассола = ${fmt(brineVol, 4)} м³

3. Объем системы
Объем масла = ${fmt(oilVol, 4)} м³
Объем нерастворимых твердых = ${fmt(dryVol, 4)} м³
Общий объем = ${fmt(totalVol, 4)} м³

4. Плотность
ρ = масса / объем / 1000 = ${fmt(density, 4)} г/см³

5. Реторта
Oil = ${fmt(oilPct, 2)} %
Water = ${fmt(waterPct, 2)} %
Retort solids = ${fmt(retortSolids, 2)} %

6. WPS и ионы
WPS = ${fmt(wps, 0)} ppm
K⁺ = ${fmt(kMgL, 0)} мг/л
Na⁺ = ${fmt(naMgL, 0)} мг/л
Ca²⁺ = ${fmt(caMgL, 0)} мг/л
Cl⁻ = ${fmt(clMgL, 0)} мг/л

7. LGS/HGS
Corrected brine = ${fmt(brinePct, 2)} %
Insoluble solids = ${fmt(insoluble, 2)} %
ASG = ${fmt(asg, 3)}
LGS = ${fmt(lgs, 2)} %   HGS = ${fmt(hgs, 2)} %
Компонентный LGS = ${fmt(compLgs, 2)} %   Компонентный HGS = ${fmt(compHgs, 2)} %

${warnings.length ? "Предупреждения:\n- " + warnings.join("\n- ") : "Предупреждений нет."}`,
  };
}
