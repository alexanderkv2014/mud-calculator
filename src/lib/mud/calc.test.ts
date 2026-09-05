import { describe, expect, it } from "vitest";
import { calcWeight } from "./calc";
import { CalcError } from "./format";

function metricValue(result: ReturnType<typeof calcWeight>, name: string, unit?: string) {
  const metric = result.metrics.find((item) => item.name === name && item.unit === unit);
  if (!metric) throw new Error(`Metric not found: ${name} ${unit ?? ""}`);
  return Number(metric.value.replace(",", "."));
}

describe("calcWeight — инженерные инварианты", () => {
  it("рассчитывает положительную массу утяжелителя и достигает целевой плотности", () => {
    const result = calcWeight({
      V: 100,
      rhoFact: 1.2,
      rhoTarget: 1.3,
      material: "Барит - 4.20 г/см³",
      current: 0,
    });

    const addKg = metricValue(result, "Добавить", "кг");
    const addVol = metricValue(result, "Объем добавки", "м³");
    const finalVol = metricValue(result, "Итоговый объем", "м³");

    expect(addKg).toBeGreaterThan(0);
    expect(addVol).toBeGreaterThan(0);
    expect(finalVol).toBeGreaterThan(100);

    // Независимая проверка баланса массы: результат должен давать целевую плотность.
    const calculatedDensity = (1000 * 100 * 1.2 + addKg) / finalVol / 1000;
    expect(calculatedDensity).toBeCloseTo(1.3, 3);
  });

  it("отклоняет попытку утяжелить до плотности ниже текущей", () => {
    expect(() =>
      calcWeight({
        V: 100,
        rhoFact: 1.3,
        rhoTarget: 1.2,
        material: "Барит - 4.20 г/см³",
        current: 0,
      }),
    ).toThrow(CalcError);
  });

  it("отклоняет неизвестный реагент", () => {
    expect(() =>
      calcWeight({
        V: 100,
        rhoFact: 1.2,
        rhoTarget: 1.3,
        material: "Неизвестный реагент",
        current: 0,
      }),
    ).toThrow("Выбери реагент");
  });
});
