import { fromUV } from "./bearing.js";
import { cloudAt, tempAt, windAt } from "./interpolate.js";
import { FIELD_FT, M_TO_FT, STEPS_FT } from "./site.js";
import type { LevelSample, Step } from "./types.js";

/**
 * The ladder: one row per 1,000 ft above the airfield.
 *
 * The surface row is a special case and deliberately so. On a normal day the
 * lowest pressure level sits a few hundred feet up, so nothing brackets 0 ft AGL;
 * the 10 m wind IS the surface wind by convention, and /about says so. Every other
 * row is interpolated, never extrapolated — a step with no bracketing pair is null
 * and renders as a dash rather than an invented number.
 */
export function buildSteps(levels: readonly LevelSample[]): Array<Step | null> {
  const lowest = [...levels].sort((a, b) => a.ftMsl - b.ftMsl)[0];

  return STEPS_FT.map((ftAgl) => {
    if (ftAgl === 0) {
      if (!lowest) return null;
      return {
        ftAgl,
        ...fromUV(lowest.u, lowest.v),
        tempC: lowest.tempC,
        cloudPct: lowest.cloudPct,
      };
    }
    const wind = windAt(levels, FIELD_FT + ftAgl);
    if (!wind) return null;
    return {
      ftAgl,
      ...wind,
      tempC: tempAt(levels, FIELD_FT + ftAgl),
      cloudPct: cloudAt(levels, FIELD_FT + ftAgl),
    };
  });
}

/** The model's own 0 degree level, converted from metres MSL to feet above the field. */
export const freezingLevelFtAgl = (metresMsl: number | null): number | null =>
  metresMsl === null ? null : metresMsl * M_TO_FT - FIELD_FT;
