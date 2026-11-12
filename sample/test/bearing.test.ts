import { describe, expect, it } from "vitest";
import { deg3, driftBearing, fromUV, toUV } from "../src/bearing.js";

describe("driftBearing", () => {
  // The single most safety-relevant function in the app. Open-Meteo reports the
  // direction wind comes FROM; the arrow must point where it takes you.
  it("is the reciprocal at every cardinal", () => {
    expect(driftBearing(0)).toBe(180);
    expect(driftBearing(90)).toBe(270);
    expect(driftBearing(180)).toBe(0);
    expect(driftBearing(270)).toBe(90);
  });

  it("wraps rather than exceeding 360", () => {
    expect(driftBearing(350)).toBe(170);
    expect(driftBearing(181)).toBe(1);
    expect(driftBearing(359)).toBe(179);
  });

  it("is its own inverse", () => {
    for (const d of [0, 17, 90, 173, 295, 359]) {
      expect(driftBearing(driftBearing(d))).toBe(d);
    }
  });

  it("carries a 295 degree wind toward the east-southeast", () => {
    // The worked example printed on the About page. If this breaks, that page lies.
    expect(driftBearing(295)).toBe(115);
  });
});

describe("toUV / fromUV", () => {
  it("round-trips speed and direction", () => {
    for (const [kt, dir] of [[10, 0], [15, 90], [22, 180], [8, 270], [37, 288]] as const) {
      const { u, v } = toUV(kt, dir);
      const back = fromUV(u, v);
      expect(back.kt).toBeCloseTo(kt, 6);
      expect(back.dirFrom).toBeCloseTo(dir, 6);
    }
  });

  it("puts a northerly wind's vector pointing south", () => {
    // Wind FROM 000 blows TOWARD 180: v must be negative (southward), u ~ 0.
    const { u, v } = toUV(10, 0);
    expect(u).toBeCloseTo(0, 6);
    expect(v).toBeCloseTo(-10, 6);
  });

  it("reports calm as 000 rather than NaN", () => {
    expect(fromUV(0, 0).kt).toBe(0);
    expect(Number.isNaN(fromUV(0, 0).dirFrom)).toBe(false);
  });
});

describe("deg3", () => {
  it("writes a direction as three digits, the way the tables print it", () => {
    expect(deg3(7)).toBe("007");
    expect(deg3(343.4)).toBe("343");
  });

  it("rounds 359.6 to 000, never to 360", () => {
    expect(deg3(359.6)).toBe("000");
  });
});
