import { fromUV } from "./bearing.js";
import type { LevelSample, Wind } from "./types.js";

const sorted = (levels: readonly LevelSample[]): LevelSample[] =>
  [...levels].sort((a, b) => a.ftMsl - b.ftMsl);

/** The two levels bracketing `ftMsl`, or null if it lies outside the profile. */
function bracket(levels: LevelSample[], ftMsl: number): [LevelSample, LevelSample, number] | null {
  const first = levels[0];
  const last = levels[levels.length - 1];
  if (!first || !last || ftMsl < first.ftMsl || ftMsl > last.ftMsl) return null;

  for (let i = 1; i < levels.length; i++) {
    const hi = levels[i]!;
    if (ftMsl <= hi.ftMsl) {
      const lo = levels[i - 1]!;
      const span = hi.ftMsl - lo.ftMsl;
      return [lo, hi, span === 0 ? 0 : (ftMsl - lo.ftMsl) / span];
    }
  }
  return null;
}

/**
 * Wind at an arbitrary height, interpolated **as vectors**.
 *
 * Interpolating degrees is the defect this function exists to prevent: the mean of
 * 350 and 010 is 180, which points a spot at the opposite side of the airfield.
 * Interpolating u and v and converting back gives ~000, which is the truth.
 *
 * Returns null outside the profile rather than extrapolating. An invented number
 * printed beside real ones is worse than a blank.
 */
export function windAt(levels: readonly LevelSample[], ftMsl: number): Wind | null {
  const b = bracket(sorted(levels), ftMsl);
  if (!b) return null;
  const [lo, hi, t] = b;
  return fromUV(lo.u + (hi.u - lo.u) * t, lo.v + (hi.v - lo.v) * t);
}

/**
 * A scalar at an arbitrary height, interpolated between the nearest levels that
 * actually carry one.
 *
 * Levels without a value are dropped BEFORE bracketing rather than poisoning the
 * pair. That is not extrapolation — the target still has to lie between two real
 * values — but it matters, because the profile legitimately contains levels that
 * carry wind and nothing else. Only the 10 m above-ground sample has a
 * temperature; the 80 m and 120 m samples do not. On an ordinary day the 120 m
 * sample sits at 692 ft and the 1,000 ft step lands at 1,299 ft, so a strict
 * pairwise rule blanked the °C on the 1,000 ft row while 21.2 °C sat at 607 ft and
 * 18.7 °C at 1,322 ft either side of it. That dash was live in production.
 *
 * Outside the range of the levels that have a value, the answer is still null.
 */
function scalarAt(
  levels: readonly LevelSample[],
  ftMsl: number,
  pick: (l: LevelSample) => number | null,
): number | null {
  const known = sorted(levels).filter((l) => pick(l) !== null);
  const b = bracket(known, ftMsl);
  if (!b) return null;
  const [lo, hi, t] = b;
  return pick(lo)! + (pick(hi)! - pick(lo)!) * t;
}

/** Temperature at an arbitrary height. Null when no levels around it have one. */
export const tempAt = (levels: readonly LevelSample[], ftMsl: number): number | null =>
  scalarAt(levels, ftMsl, (l) => l.tempC);

/**
 * Cloud cover at an arbitrary height, null outside the levels that report it —
 * above 550 hPa there is nothing to bracket, so the column shows a dash rather
 * than pretending the sky is clear up there.
 */
export const cloudAt = (levels: readonly LevelSample[], ftMsl: number): number | null =>
  scalarAt(levels, ftMsl, (l) => l.cloudPct);
