import { CLD_SHOW_MIN_PCT } from "./cloud.js";
import { cloudAt } from "./interpolate.js";
import { clampPct, num } from "./profile.js";
import { FIELD_FT, M_TO_FT } from "./site.js";
import type { LevelSample } from "./types.js";

/**
 * The Clouds screen's numbers (ADR-0026).
 *
 * Up to 15,000 ft the picture is the Winds table's own cloud, drawn continuously: the same
 * levels and the same interpolation, so at every 1,000 ft it equals the table's cell. Above
 * that, three compact bands, each the most cloud anywhere in it.
 */

/** Where the continuous picture stops and the compact bands begin, ft above the field. */
export const PICTURE_TOP_FT = 15_000;

/** Top band first, as drawn. */
export const CLOUD_BANDS = [
  { label: "30k+", lo: 30_000, hi: Number.POSITIVE_INFINITY },
  { label: "20–30k", lo: 20_000, hi: 30_000 },
  { label: "15–20k", lo: 15_000, hi: 20_000 },
] as const;

/** A number is printed in the picture from this much cover, every NUMBER_EVERY_FT (ADR-0028). */
export const NUMBER_MIN_PCT = 10;
export const NUMBER_EVERY_FT = 2000;

/** Cover at a height above the field, from the Winds table's profile and interpolation. */
export const coverAt = (profile: readonly LevelSample[], ftAgl: number): number | null =>
  cloudAt(profile, FIELD_FT + ftAgl);

/** Every pressure level that reports cloud, as [ft above the field, %], lowest first; wind not needed. */
export function cloudLevels(hourly: Record<string, unknown>, i: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const key of Object.keys(hourly)) {
    const m = /^geopotential_height_(\d+)hPa$/.exec(key);
    if (!m) continue;
    const gh = num(hourly, key, i);
    const pct = clampPct(num(hourly, `cloud_cover_${m[1]}hPa`, i));
    if (gh !== null && pct !== null) out.push([gh * M_TO_FT - FIELD_FT, pct]);
  }
  return out.sort((a, b) => a[0] - b[0]);
}

/**
 * Cover at a height from a few levels, blended linearly between the two either side (ADR-0028).
 * The lowest level holds down to the ground; above the highest there is nothing to say.
 */
export function coverBetween(levels: ReadonlyArray<readonly [number, number]>, ftAgl: number): number | null {
  if (levels.length === 0) return null;
  if (ftAgl <= levels[0]![0]) return levels[0]![1];
  for (let i = 0; i < levels.length - 1; i++) {
    const [lo, a] = levels[i]!;
    const [hi, b] = levels[i + 1]!;
    if (ftAgl <= hi) return a + ((b - a) * (ftAgl - lo)) / (hi - lo);
  }
  return null;
}

/** The most cover among the levels with lo < height ≤ hi; null when no level falls there. */
export function bandMax(levels: ReadonlyArray<readonly [number, number]>, lo: number, hi: number): number | null {
  let best: number | null = null;
  for (const [ft, pct] of levels) if (ft > lo && ft <= hi && (best === null || pct > best)) best = pct;
  return best;
}

/**
 * The picture's opacity for a cover: nothing below the ladder's 5 % threshold, then a light grey
 * you can see (0.1) rising to 0.78, so thin cloud shows and dense cores stay darkest (ADR-0028).
 */
export function pictureAlpha(pct: number | null): number {
  if (pct === null || pct < CLD_SHOW_MIN_PCT) return 0;
  return 0.1 + 0.68 * ((Math.min(100, pct) - CLD_SHOW_MIN_PCT) / (100 - CLD_SHOW_MIN_PCT)) ** 0.85;
}

/** The picture's colour (slate-600); opacity comes from `pictureAlpha`. */
export const PICTURE_RGB = [71, 85, 105] as const;

const DARK = [51, 65, 85] as const; // slate-700
const hex = (rgb: readonly number[]) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
const mixWhite = (t: number) => hex(DARK.map((c) => 255 + (c - 255) * t));

/**
 * A shaded cell for the wide day grid's Cloud view, with its text colour. Two halves with a gap
 * between them, so dark text never sits on a mid grey and white text never on a light one:
 * every shade from 5 % to 100 % keeps WCAG AA contrast (4.5:1), checked in the unit test.
 */
export function cellShade(pct: number): { background: string; color: string } {
  if (pct < 50) return { background: mixWhite(0.07 + ((pct - 5) / 45) * 0.35), color: "#0f172a" };
  return { background: mixWhite(0.74 + ((Math.min(100, pct) - 50) / 50) * 0.21), color: "#ffffff" };
}
