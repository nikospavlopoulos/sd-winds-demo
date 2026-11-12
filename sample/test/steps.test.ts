import { describe, expect, it } from "vitest";
import { toUV } from "../src/bearing.js";
import { FIELD_FT, M_TO_FT } from "../src/site.js";
import { buildSteps, freezingLevelFtAgl } from "../src/steps.js";
import type { LevelSample } from "../src/types.js";

const level = (
  ftMsl: number,
  dir: number,
  kt: number,
  t: number | null,
  cloudPct: number | null = null,
): LevelSample => ({ ftMsl, ...toUV(kt, dir), tempC: t, cloudPct });

// Lowest sample is the 10 m wind, ~33 ft above the field — so nothing brackets
// 0 ft AGL. That is the normal case, not an edge case.
const levels = [
  level(FIELD_FT + 10 * M_TO_FT, 353, 4.5, 18, 20),
  level(1257, 4, 9, 15, 0),
  level(5003, 12, 12, 4, 100),
  level(10128, 292, 15, -2, 40),
  level(16247, 288, 41, -11, 0),
];

describe("buildSteps", () => {
  const steps = buildSteps(levels);

  it("produces one row per 1,000 ft from the surface to 15,000", () => {
    expect(steps).toHaveLength(16);
    expect(steps[0]?.ftAgl).toBe(0);
    expect(steps[15]?.ftAgl).toBe(15000);
  });

  it("takes the surface row from the 10 m wind rather than returning a dash", () => {
    // Nothing brackets 0 ft AGL, so a strict interpolation would be null here and
    // the most-read row on the page would be blank every day.
    const surface = steps[0]!;
    expect(surface.kt).toBeCloseTo(4.5, 6);
    expect(surface.dirFrom).toBeCloseTo(353, 6);
    expect(surface.tempC).toBe(18);
  });

  it("interpolates the steps in between", () => {
    const at5000 = steps.find((s) => s?.ftAgl === 5000)!;
    expect(at5000.kt).toBeGreaterThan(0);
    expect(at5000.dirFrom).toBeGreaterThanOrEqual(0);
    expect(at5000.dirFrom).toBeLessThan(360);
  });

  it("carries cloud up the ladder the way it carries temperature", () => {
    // A step halfway between a clear level and a solid one must land in between.
    const at3000 = steps.find((s) => s?.ftAgl === 3000)!;
    expect(at3000.cloudPct).not.toBeNull();
    expect(at3000.cloudPct!).toBeGreaterThan(0);
    expect(at3000.cloudPct!).toBeLessThan(100);
  });

  it("leaves the surface row's cloud blank rather than inventing a quantity", () => {
    // The surface row is the 10 m wind taken directly, and "cloud at 10 m AGL" is
    // not a thing the model reports or a reader could act on. The whole-sky cover
    // is in the conditions strip, as eighths, where it means something.
    const surface = buildSteps([
      level(FIELD_FT + 10 * M_TO_FT, 353, 4.5, 18, null),
      level(1257, 4, 9, 15, 0),
      level(5003, 12, 12, 4, 100),
    ])[0]!;
    expect(surface.cloudPct).toBeNull();
  });

  it("returns null for a step above the profile rather than extrapolating", () => {
    const shallow = buildSteps(levels.slice(0, 3));
    expect(shallow[15]).toBeNull();
    expect(shallow[0]).not.toBeNull();
  });
});

describe("freezingLevelFtAgl", () => {
  it("converts metres above sea level to feet above the airfield", () => {
    // Measured at Kopaida: 2,630 m MSL. The interpolated ladder put 0 C at the
    // 8,000 ft step, so these two independent paths agree to within one step.
    expect(freezingLevelFtAgl(2630)).toBeCloseTo(8629 - 299, 0);
  });

  it("passes null through instead of reporting sea level", () => {
    expect(freezingLevelFtAgl(null)).toBeNull();
  });
});
