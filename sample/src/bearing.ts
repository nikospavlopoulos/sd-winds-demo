import type { Wind } from "./types.js";

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/**
 * Where the wind will carry you, given where it blows from.
 *
 * Open-Meteo, like every meteorological source, reports the direction wind comes
 * FROM. The arrow on the ladder points the other way, because a jumper wants to
 * know which way they will drift. Getting this backwards puts the spot on the
 * wrong side of the airfield, so it is a safety defect rather than a cosmetic one.
 */
export const driftBearing = (fromDeg: number): number => (fromDeg + 180) % 360;

/** "007°" without the degree sign: three digits, and 359.6 rounds to 000, not 360. */
export const deg3 = (d: number): string => String(Math.round(d) % 360).padStart(3, "0");

/**
 * Split a wind into vector components.
 *
 * Both are negated because the reported angle is the origin, not the heading: a
 * wind FROM 000 travels toward the south, so v is negative.
 */
export function toUV(kt: number, dirFrom: number): { u: number; v: number } {
  const r = dirFrom * RAD;
  return { u: -kt * Math.sin(r), v: -kt * Math.cos(r) };
}

/** The inverse of {@link toUV}. Calm resolves to 000 rather than NaN. */
export function fromUV(u: number, v: number): Wind {
  const kt = Math.hypot(u, v);
  if (kt === 0) return { kt: 0, dirFrom: 0 };
  return { kt, dirFrom: (Math.atan2(-u, -v) * DEG + 360) % 360 };
}
