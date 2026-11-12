/** Metres to feet. Exact by definition: one foot is 0.3048 m. */
export const M_TO_FT = 1 / 0.3048;

export const SITE = {
  name: "Kopaida Dimitra Airfield",
  lat: 38.45611,
  lon: 23.13444,
  /** Open-Meteo's 90 m DEM elevation for this point, pinned in the upstream URL. */
  elevationM: 91,
  timeZone: "Europe/Athens",
} as const;

/** Field elevation in feet MSL. Displayed rounded; kept precise for arithmetic. */
export const FIELD_FT = SITE.elevationM * M_TO_FT;

/** Below this you are under canopy; above it you are in freefall. */
export const OPENING_FT = 4000;

/** Every rung of the ladder, in feet above the airfield. */
export const STEPS_FT = [0, ...Array.from({ length: 15 }, (_, i) => (i + 1) * 1000)] as const;

/**
 * Pressure levels requested from GFS 0.25. Every 25 hPa from 1000 to 550, which
 * brackets every step to 15,000 ft AGL within about 1,115 ft. Documented on
 * Open-Meteo's GFS page; the generic docs list only the coarse subset.
 */
export const PRESSURE_LEVELS = [
  1000, 975, 950, 925, 900, 875, 850, 825, 800, 775,
  750, 725, 700, 675, 650, 625, 600, 575, 550,
] as const;

/**
 * Cloud above the ladder, for the Clouds screen's compact bands: every 25 hPa from 525 to
 * 150 (about 17,000 to 45,000 ft). Cloud and height only — no wind, so `buildProfile`
 * leaves them out and the Winds table is unchanged.
 */
export const UPPER_CLOUD_LEVELS = [
  525, 500, 475, 450, 425, 400, 375, 350, 325, 300, 275, 250, 225, 200, 175, 150,
] as const;

/** ECMWF 0.25°'s levels on Open-Meteo, for the Clouds screen's second picture (ADR-0028). */
export const ECMWF_CLOUD_LEVELS = [1000, 925, 850, 700, 600, 500, 400, 300, 250, 200, 150] as const;

/**
 * Above-ground wind levels. GFS provides 10, 80 and 120 m — NOT 180 m, which other
 * models have. Requesting 180 m returns a column of nulls.
 */
export const AGL_LEVELS_M = [10, 80, 120] as const;
