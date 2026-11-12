import { FIELD_FT } from "./site.js";
import type { LevelSample } from "./types.js";

/**
 * Cloud, read from the model's own per-level cover.
 *
 * No model publishes a cloud base: `cloud_base` is null on ECMWF, ICON, GFS,
 * ARPEGE and UKMO alike. What GFS does publish is `cloud_cover_<L>hPa` on every
 * pressure level this app already fetches, so the base and top are found by
 * looking for the lowest and highest level with real cloud in it.
 */

/**
 * What counts as "real cloud", and a deliberate departure from aviation usage.
 *
 * A ceiling is the lowest BROKEN layer, five eighths or more. Over a week the two
 * definitions agree in 79 of 84 daylight hours, but where they differ they differ
 * hugely: on one afternoon the 40 percent base was 1,634 ft while the BKN ceiling
 * was 8,022 ft. A scattered layer at 1,634 ft is a jumper's problem even though a
 * pilot would not call it a ceiling -- so the page says "cloud base", never
 * "ceiling", and /about spells out the difference.
 */
export const CLOUD_MIN_PCT = 40;

/** Below this the ladder's cell is a dash: a few percent is not a layer. */
export const CLD_SHOW_MIN_PCT = 5;

/** Eighths, the aviation convention. 0/8 is clear, 8/8 is overcast. */
export const oktas = (pct: number): number => Math.round((pct / 100) * 8);

/** BKN means there are holes in it; OVC means there are not. */
export function oktaWord(eighths: number): string {
  if (eighths <= 0) return "clear";
  if (eighths <= 2) return "a few";
  if (eighths <= 4) return "scattered";
  if (eighths <= 7) return "broken";
  return "overcast";
}

export interface CloudLayer {
  /** Feet above the airfield, so it compares directly with the freezing level. */
  baseFtAgl: number;
  topFtAgl: number;
}

/**
 * The lowest and highest levels carrying real cloud, in ft AGL.
 *
 * Read from the raw levels and not snapped to the 1,000 ft ladder: a base of
 * 4,738 ft reported as 5,000 moves the bottom of a layer by 262 ft on a page whose
 * entire subject is height. Null when nothing reaches the threshold.
 */
export function cloudLayer(levels: readonly LevelSample[]): CloudLayer | null {
  const withCloud = levels.filter((l) => l.cloudPct !== null && l.cloudPct >= CLOUD_MIN_PCT);
  if (withCloud.length === 0) return null;

  const heights = withCloud.map((l) => l.ftMsl);
  return {
    baseFtAgl: Math.min(...heights) - FIELD_FT,
    topFtAgl: Math.max(...heights) - FIELD_FT,
  };
}
