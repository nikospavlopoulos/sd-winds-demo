import { describe, expect, it } from "vitest";
import { toUV } from "../src/bearing.js";
import { CLOUD_MIN_PCT, cloudLayer, oktaWord, oktas } from "../src/cloud.js";
import { FIELD_FT } from "../src/site.js";
import type { LevelSample } from "../src/types.js";

const level = (ftMsl: number, cloudPct: number | null): LevelSample => ({
  ftMsl,
  ...toUV(10, 0),
  tempC: 0,
  cloudPct,
});

describe("oktas", () => {
  it("rounds percent cover into eighths", () => {
    expect(oktas(0)).toBe(0);
    expect(oktas(100)).toBe(8);
    expect(oktas(50)).toBe(4);
    expect(oktas(94)).toBe(8);
  });

  it("names each eighth the way an aviation report does", () => {
    expect(oktaWord(0)).toBe("clear");
    expect(oktaWord(2)).toBe("a few");
    expect(oktaWord(4)).toBe("scattered");
    expect(oktaWord(7)).toBe("broken");
    expect(oktaWord(8)).toBe("overcast");
  });
});

describe("cloudLayer", () => {
  // A real layer from 27 Sep: clear below, solid between, clear above.
  const layered = [
    level(FIELD_FT + 33, 0),
    level(4738, 85),
    level(6000, 98),
    level(8970, 75),
    level(10128, 6),
  ];

  it("reports the raw level heights, not the nearest 1,000 ft step", () => {
    const layer = cloudLayer(layered);
    expect(layer).not.toBeNull();
    // 4,738 ft MSL, reported above the field. Snapping to 5,000 would move the base
    // of a layer by 262 ft on a page whose whole job is heights.
    expect(Math.round(layer!.baseFtAgl)).toBe(Math.round(4738 - FIELD_FT));
    expect(Math.round(layer!.topFtAgl)).toBe(Math.round(8970 - FIELD_FT));
  });

  it("returns heights above the airfield, matching the freezing level beside it", () => {
    // MSL here would be a silent 299 ft error against the number printed next to it.
    const layer = cloudLayer(layered)!;
    expect(layer.baseFtAgl).toBeLessThan(4738);
  });

  it("never puts the base above the top", () => {
    const layer = cloudLayer(layered)!;
    expect(layer.baseFtAgl).toBeLessThanOrEqual(layer.topFtAgl);
  });

  it("is null when nothing reaches the threshold", () => {
    expect(cloudLayer([level(3000, 0), level(6000, 12), level(9000, 39)])).toBeNull();
  });

  it("includes a level exactly at the threshold", () => {
    const layer = cloudLayer([level(3000, CLOUD_MIN_PCT)]);
    expect(layer).not.toBeNull();
  });

  it("reports a single-level layer as a base with no separate top", () => {
    // At 1,000 ft level spacing a layer can genuinely occupy one level. Printing
    // "base 16,099 ft top 16,099 ft" is the same number twice; the strip shows the
    // top only when it adds something.
    const layer = cloudLayer([level(3000, 0), level(16398, 90)])!;
    expect(layer.baseFtAgl).toBe(layer.topFtAgl);
  });

  it("ignores levels the model gave no cloud for", () => {
    const layer = cloudLayer([level(2000, null), level(5000, 90), level(9000, null)]);
    expect(Math.round(layer!.baseFtAgl)).toBe(Math.round(5000 - FIELD_FT));
    expect(Math.round(layer!.topFtAgl)).toBe(Math.round(5000 - FIELD_FT));
  });

  it("is null for an empty profile", () => {
    expect(cloudLayer([])).toBeNull();
  });
});
