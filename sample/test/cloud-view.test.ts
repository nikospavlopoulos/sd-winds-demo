import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  bandMax, cellShade, cloudLevels, coverAt, coverBetween, NUMBER_EVERY_FT, NUMBER_MIN_PCT, pictureAlpha,
} from "../src/cloud-view.js";
import { buildProfile, type HourlyBlock } from "../src/profile.js";
import { STEPS_FT } from "../src/site.js";
import { buildSteps } from "../src/steps.js";

const winds = (JSON.parse(readFileSync("fixtures/winds.json", "utf8")) as { hourly: HourlyBlock & { time: number[] } }).hourly;

describe("the picture below 15,000 ft is the Winds table's own cloud", () => {
  it("equals every 1,000 ft cell of the table, in every fixture hour, nulls included", () => {
    for (let i = 0; i < winds.time.length; i++) {
      const profile = buildProfile(winds, i);
      const steps = buildSteps(profile);
      STEPS_FT.forEach((ft, k) => {
        if (ft === 0) return; // the Surface row never carries cloud
        expect(coverAt(profile, ft), `hour ${i}, ${ft} ft`).toBe(steps[k]?.cloudPct ?? null);
      });
    }
  });

  it("leaves the levels above the ladder out of the wind profile", () => {
    const withUpper: HourlyBlock = { ...winds, geopotential_height_300hPa: [9300], cloud_cover_300hPa: [80] };
    expect(buildProfile(withUpper, 0)).toEqual(buildProfile(winds, 0));
  });
});

describe("cloudLevels and bandMax", () => {
  const hourly: HourlyBlock = {
    time: [0],
    geopotential_height_550hPa: [5000], cloud_cover_550hPa: [40], // ~16,100 ft above the field
    geopotential_height_500hPa: [5700], cloud_cover_500hPa: [101], // GFS reports 101 at times
    geopotential_height_300hPa: [9300], cloud_cover_300hPa: [70], // ~30,200 ft
    geopotential_height_250hPa: [10500], cloud_cover_250hPa: [null],
  };
  const levels = cloudLevels(hourly, 0);

  it("reads every level with cloud and a height, clamped, lowest first, with or without wind", () => {
    expect(levels.map(([, p]) => p)).toEqual([40, 100, 70]);
    expect(levels[0]![0]).toBeLessThan(levels[1]![0]);
  });

  it("takes the most cover in a band, counting 550 hPa in 15–20k", () => {
    expect(bandMax(levels, 15_000, 20_000)).toBe(100);
    expect(bandMax(levels, 20_000, 30_000)).toBeNull();
    expect(bandMax(levels, 30_000, Number.POSITIVE_INFINITY)).toBe(70);
  });
});

describe("coverBetween — ECMWF's few levels, blended in height (ADR-0028)", () => {
  // ft above the field, %; as ECMWF's 1000, 925, 850 and 700 hPa sit at Kopaida.
  const levels: Array<[number, number]> = [[150, 20], [2300, 46], [4700, 37], [9900, 0]];

  it("blends linearly between the two levels either side", () => {
    expect(coverBetween(levels, 2300)).toBe(46);
    expect(coverBetween(levels, 7300)).toBeCloseTo(37 / 2, 5);
  });

  it("holds the lowest level down to the ground, and invents nothing above the highest", () => {
    expect(coverBetween(levels, 0)).toBe(20);
    expect(coverBetween(levels, 10_000)).toBeNull();
    expect(coverBetween([], 3000)).toBeNull();
  });
});

describe("pictureAlpha", () => {
  it("draws nothing below the ladder's 5 % and for no data", () => {
    expect(pictureAlpha(null)).toBe(0);
    expect(pictureAlpha(4.9)).toBe(0);
  });

  it("shows thin cloud: a light grey already at 5 %", () => {
    expect(pictureAlpha(5)).toBeCloseTo(0.1, 5);
  });

  it("rises with cover and stops at 0.78", () => {
    let last = 0;
    for (let p = 5; p <= 100; p++) {
      const a = pictureAlpha(p);
      expect(a).toBeGreaterThanOrEqual(last);
      last = a;
    }
    expect(pictureAlpha(100)).toBeCloseTo(0.78, 5);
  });

  it("prints a number from 10 %, every 2,000 ft", () => {
    expect(NUMBER_MIN_PCT).toBe(10);
    expect(NUMBER_EVERY_FT).toBe(2000);
    expect(pictureAlpha(NUMBER_MIN_PCT)).toBeGreaterThan(0.1);
  });
});

describe("cellShade keeps WCAG AA contrast at every cover", () => {
  // WCAG 2.2 relative luminance and contrast ratio.
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((k) => {
      const c = parseInt(hex.slice(k, k + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
    return (hi + 0.05) / (lo + 0.05);
  };

  it("from 5 % to 100 %", () => {
    for (let p = 5; p <= 100; p++) {
      const { background, color } = cellShade(p);
      expect(contrast(background, color), `${p} %`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
