import { describe, expect, it } from "vitest";
import { toUV } from "../src/bearing.js";
import { cloudAt, tempAt, windAt } from "../src/interpolate.js";
import type { LevelSample } from "../src/types.js";

const level = (
  ftMsl: number,
  dirFrom: number,
  kt: number,
  tempC: number | null,
  cloudPct: number | null = null,
): LevelSample => ({
  ftMsl,
  ...toUV(kt, dirFrom),
  tempC,
  cloudPct,
});

// Deliberately spans north, because that is where naive interpolation breaks.
const profile: LevelSample[] = [
  level(1000, 350, 10, 12),
  level(2000, 10, 20, 8),
  level(3000, 90, 30, 4),
];

describe("windAt", () => {
  it("never interpolates direction through the long way round", () => {
    // Averaging 350 and 010 as numbers gives 180 — the exact opposite of the truth,
    // and a spot on the wrong side of the airfield. u/v interpolation gives ~000.
    const w = windAt(profile, 1500);
    expect(w).not.toBeNull();
    const d = w!.dirFrom;
    const throughNorth = d >= 340 || d <= 20;
    expect(throughNorth).toBe(true);
    // And emphatically not the southern half, which is where averaging degrees lands.
    const southerly = d > 90 && d < 270;
    expect(southerly).toBe(false);
  });

  it("returns a speed between the two bracketing speeds", () => {
    const w = windAt(profile, 1500)!;
    expect(w.kt).toBeGreaterThan(10);
    expect(w.kt).toBeLessThan(20);
  });

  it("returns a bracketing level untouched when the step lands exactly on it", () => {
    for (const [ft, dir, kt] of [[1000, 350, 10], [2000, 10, 20], [3000, 90, 30]] as const) {
      const w = windAt(profile, ft)!;
      expect(w.kt).toBeCloseTo(kt, 6);
      expect(w.dirFrom).toBeCloseTo(dir, 6);
    }
  });

  it("refuses to extrapolate beyond either end", () => {
    // A step above the highest level must be null, not a guess. Printing an
    // invented number beside real ones is the failure this app exists to avoid.
    expect(windAt(profile, 999)).toBeNull();
    expect(windAt(profile, 3001)).toBeNull();
  });

  it("never invents wind stronger than the stronger bracketing level", () => {
    // NOT monotonicity: a convex combination of two vectors 80 degrees apart is
    // weaker than both, and that is physically correct. The real invariant is the
    // triangle inequality, and the safety property is that we never exceed what
    // the model actually reported.
    for (let ft = 1000; ft <= 3000; ft += 50) {
      const w = windAt(profile, ft)!;
      const stronger = ft <= 2000 ? 20 : 30;
      expect(w.kt).toBeLessThanOrEqual(stronger + 1e-9);
      expect(w.kt).toBeGreaterThan(0);
    }
  });

  it("handles an unsorted input by sorting it, not by trusting the caller", () => {
    const shuffled = [profile[2]!, profile[0]!, profile[1]!];
    expect(windAt(shuffled, 1500)!.kt).toBeCloseTo(windAt(profile, 1500)!.kt, 6);
  });
});

describe("tempAt", () => {
  it("interpolates linearly between levels", () => {
    expect(tempAt(profile, 1500)).toBeCloseTo(10, 6);
    expect(tempAt(profile, 2500)).toBeCloseTo(6, 6);
  });

  it("returns null rather than zero when no level has a temperature", () => {
    // Coercing a missing temperature to 0 would read as freezing. Never do that.
    const gappy = [level(1000, 0, 10, null), level(2000, 0, 10, null)];
    expect(tempAt(gappy, 1500)).toBeNull();
  });

  it("reaches past a level that has no temperature to the ones that do", () => {
    /**
     * A real gap, visible in production before this was fixed: only the 10 m
     * above-ground sample carries a temperature, so the 80 m and 120 m samples are
     * null. On an ordinary day the 120 m sample sits at 692 ft and the 1,000 ft
     * step lands at 1,299 ft, bracketed by that null and the 975 hPa level -- so a
     * strict pairwise rule blanked the °C on the 1,000 ft row while 21.2 °C sat at
     * 607 ft and 18.7 °C at 1,322 ft, either side of it.
     *
     * Interpolating between the nearest levels that HAVE a value is not
     * extrapolation: the target really is between them.
     */
    const gappy = [level(1000, 0, 10, 10), level(1500, 0, 10, null), level(2000, 0, 10, 20)];
    expect(tempAt(gappy, 1600)).toBeCloseTo(16, 6);
  });

  it("still refuses to extrapolate past the last level that has one", () => {
    const gappy = [level(1000, 0, 10, 10), level(2000, 0, 10, 20), level(3000, 0, 10, null)];
    expect(tempAt(gappy, 2500)).toBeNull();
  });
});

describe("cloudAt", () => {
  const stack = [level(1000, 0, 10, 10, 0), level(2000, 0, 10, 8, 100)];

  it("lands strictly between the two levels, not merely somewhere non-null", () => {
    // A bug that returned 0 would still be non-null. The value has to move.
    const mid = cloudAt(stack, 1500);
    expect(mid).not.toBeNull();
    expect(mid!).toBeGreaterThan(0);
    expect(mid!).toBeLessThan(100);
    expect(mid!).toBeCloseTo(50, 6);
  });

  it("returns null rather than zero where no level has cloud", () => {
    const gappy = [level(1000, 0, 10, 10, null), level(2000, 0, 10, 8, null)];
    expect(cloudAt(gappy, 1500)).toBeNull();
  });

  it("reaches past a level with no cloud value, the way tempAt does", () => {
    const gappy = [level(1000, 0, 10, 10, 0), level(1500, 0, 10, 9, null), level(2000, 0, 10, 8, 80)];
    expect(cloudAt(gappy, 1500)).toBeCloseTo(40, 6);
  });

  it("refuses to extrapolate past the top of the profile", () => {
    // Above 550 hPa there is nothing to bracket, so the column shows a dash.
    expect(cloudAt(stack, 2001)).toBeNull();
  });
});
