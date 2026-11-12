const POINTS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
] as const;

export type Cardinal = (typeof POINTS)[number];

/**
 * 16-point, not 8-point.
 *
 * Measured at Kopaida, the winds between 9,000 and 15,000 ft were steady within
 * 13 degrees; 8-point buckets rendered them as W, NW, NW, NW, W, W, which reads as
 * the wind swinging about. In the same profile a genuine veer from NNE through NNW
 * was flattened to four identical N's. 8-point both invents movement and hides it.
 */
export const cardinal = (dirFrom: number): Cardinal =>
  POINTS[Math.round((((dirFrom % 360) + 360) % 360) / 22.5) % 16]!;
