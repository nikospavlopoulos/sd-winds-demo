/** One level of the vertical profile, already converted to vector components. */
export interface LevelSample {
  /** Height above mean sea level, in feet. */
  ftMsl: number;
  /** Eastward component, knots. */
  u: number;
  /** Northward component, knots. */
  v: number;
  /** Null where the model produced no temperature for this level. Never coerced to 0. */
  tempC: number | null;
  /** Percent cloud cover at this level. Null where the model produced none. */
  cloudPct: number | null;
}

export interface Wind {
  /** Meteorological convention: the direction the wind blows FROM, in degrees true. */
  dirFrom: number;
  kt: number;
}

/** One rendered row of the ladder. */
export interface Step extends Wind {
  /** Height above the airfield, in feet. */
  ftAgl: number;
  tempC: number | null;
  cloudPct: number | null;
}
