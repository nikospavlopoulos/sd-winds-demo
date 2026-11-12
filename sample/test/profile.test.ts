import { describe, expect, it } from "vitest";
import { buildProfile } from "../src/profile.js";
import { fromUV } from "../src/bearing.js";

// Shaped exactly like an Open-Meteo `hourly` block, one hour wide.
const hourly = {
  time: ["2026-09-23T13:00"],
  wind_speed_10m: [4.5], wind_direction_10m: [353],
  wind_speed_80m: [7], wind_direction_80m: [355],
  wind_speed_120m: [8], wind_direction_120m: [356],
  temperature_2m: [18],
  cloud_cover: [64],
  // 1000 hPa sits BELOW the 120 m above-ground sample on this day: the two sources
  // overlap, and the overlap must not produce a non-monotonic profile.
  wind_speed_1000hPa: [6], wind_direction_1000hPa: [358],
  geopotential_height_1000hPa: [110], temperature_1000hPa: [17],
  // GFS really does emit 101 here: 57 values in a 7-day sample of the 19 levels.
  cloud_cover_1000hPa: [101],
  wind_speed_975hPa: [9], wind_direction_975hPa: [2],
  geopotential_height_975hPa: [383], temperature_975hPa: [15],
  cloud_cover_975hPa: [30],
  wind_speed_950hPa: [null], wind_direction_950hPa: [null],
  geopotential_height_950hPa: [null], temperature_950hPa: [null],
};

describe("buildProfile", () => {
  const p = buildProfile(hourly, 0);

  it("returns levels sorted by height with no gaps or nulls", () => {
    expect(p.length).toBeGreaterThan(0);
    for (let i = 1; i < p.length; i++) expect(p[i]!.ftMsl).toBeGreaterThan(p[i - 1]!.ftMsl);
    expect(p.every((l) => Number.isFinite(l.u) && Number.isFinite(l.v))).toBe(true);
  });

  it("drops a pressure level the model did not produce", () => {
    // 950 hPa is all-null here. Including it would put NaN into the interpolation
    // and render "NaN kt" on a safety page.
    expect(p.some((l) => l.ftMsl === 0 || Number.isNaN(l.ftMsl))).toBe(false);
    expect(p.length).toBe(5);
  });

  it("starts at the 10 m wind and preserves it exactly", () => {
    const first = p[0]!;
    const w = fromUV(first.u, first.v);
    expect(w.kt).toBeCloseTo(4.5, 6);
    expect(w.dirFrom).toBeCloseTo(353, 6);
  });

  it("converts geopotential metres to feet above mean sea level", () => {
    // 383 m = 1256.6 ft. Getting this wrong shifts every altitude label.
    expect(p.some((l) => Math.abs(l.ftMsl - 1256.6) < 1)).toBe(true);
  });

  it("carries each pressure level's own cloud cover", () => {
    // p.length alone stays green even if cloud is wired up to the wrong level.
    const at975 = p.find((l) => Math.abs(l.ftMsl - 1256.6) < 1)!;
    expect(at975.cloudPct).toBe(30);
  });

  it("clamps the 101 percent GFS occasionally reports", () => {
    // Clamped HERE, at ingestion, not in cloud.ts: the ladder's CLD value travels
    // LevelSample -> buildSteps -> WindTable and never passes through cloud.ts, so
    // a clamp living there would leave the column rendering 101%.
    const at1000 = p.find((l) => Math.abs(l.ftMsl - 360.9) < 1)!;
    expect(at1000.cloudPct).toBe(100);
  });

  it("leaves the above-ground samples without a cloud value", () => {
    // The hour's total cover is a whole-sky figure and belongs in the conditions
    // strip as eighths, not in a column whose every other cell is the cover AT a
    // level. interpolate.ts skips levels with no value, so nothing above is lost.
    expect(p[0]!.cloudPct).toBeNull();
  });
});
