import { toUV } from "./bearing.js";
import { AGL_LEVELS_M, FIELD_FT, M_TO_FT } from "./site.js";
import type { LevelSample } from "./types.js";

/** The subset of Open-Meteo's `hourly` block this module reads. */
export type HourlyBlock = Record<string, Array<number | null> | string[]>;

/**
 * GFS occasionally reports 101 percent cloud on a pressure level -- 57 values in a
 * 7-day sample of the 19 levels. Clamped here, at the single point of ingestion,
 * because the value travels LevelSample -> buildSteps -> the CLD column without
 * passing through cloud.ts, so a clamp anywhere later leaves "101%" on the page.
 */
export const clampPct = (v: number | null): number | null =>
  v === null ? null : Math.min(100, Math.max(0, v));

/**
 * One numeric value out of an Open-Meteo series, or null.
 *
 * Deliberately loose in its input type so the client's screens can read the same
 * raw block without a cast. Never coerces: a missing temperature is not 0 degrees
 * and a missing wind is not calm.
 */
export const num = (block: Record<string, unknown>, key: string, i: number): number | null => {
  const series = block[key];
  if (!Array.isArray(series)) return null;
  const value: unknown = series[i];
  return typeof value === "number" ? value : null;
};

/**
 * Assemble one hour of Open-Meteo output into a vertical profile.
 *
 * Two sources are merged. The above-ground levels (10/80/120 m) cover the surface,
 * where the lowest pressure level can sit hundreds of feet up. The pressure levels
 * cover everything above. They overlap near the ground, so the result is sorted by
 * height and de-duplicated — an unsorted or repeated height would make the
 * interpolation bracket the wrong pair.
 *
 * A level the model did not produce is dropped, never defaulted. Open-Meteo happily
 * accepts variables it has no data for and returns a column of nulls; admitting one
 * would put NaN on a safety page.
 */
export function buildProfile(hourly: HourlyBlock, i: number): LevelSample[] {
  const levels: LevelSample[] = [];

  for (const m of AGL_LEVELS_M) {
    const kt = num(hourly, `wind_speed_${m}m`, i);
    const dir = num(hourly, `wind_direction_${m}m`, i);
    if (kt === null || dir === null) continue;
    // Only the 2 m temperature exists near the ground, so it stands in for all of them.
    const tempC = m === 10 ? num(hourly, "temperature_2m", i) : null;
    // Cloud is published per pressure level and nowhere else, so these carry none.
    // That is not a gap to fill: "cloud at 10 m" is not a quantity, and putting the
    // hour's whole-sky cover here would print a total in a per-level column, right
    // under a strip already showing it as eighths. interpolate.ts skips levels
    // without a value, so the steps above are unaffected.
    levels.push({ ftMsl: FIELD_FT + m * M_TO_FT, ...toUV(kt, dir), tempC, cloudPct: null });
  }

  for (const key of Object.keys(hourly)) {
    const match = /^geopotential_height_(\d+)hPa$/.exec(key);
    if (!match) continue;
    const hPa = match[1]!;
    const gh = num(hourly, key, i);
    const kt = num(hourly, `wind_speed_${hPa}hPa`, i);
    const dir = num(hourly, `wind_direction_${hPa}hPa`, i);
    if (gh === null || kt === null || dir === null) continue;
    levels.push({
      ftMsl: gh * M_TO_FT,
      ...toUV(kt, dir),
      tempC: num(hourly, `temperature_${hPa}hPa`, i),
      cloudPct: clampPct(num(hourly, `cloud_cover_${hPa}hPa`, i)),
    });
  }

  levels.sort((a, b) => a.ftMsl - b.ftMsl);
  return levels.filter((l, idx) => idx === 0 || l.ftMsl > levels[idx - 1]!.ftMsl);
}
