# The weather core

A runnable excerpt of Winds Aloft & Weather: the pure TypeScript that turns one hour of a forecast model's
pressure levels into the winds, temperatures and cloud a skydiver reads, every 1,000 ft above the airfield. It runs
unchanged in the app, in the browser; here it runs with its unit tests and nothing else.

## Run it

Node 22:

```bash
npm ci
npm run typecheck
npm test
```

## What is inside

| File | What it does |
|---|---|
| [`src/site.ts`](src/site.ts) | The airfield (Kopaida Dimitra, 91 m / 299 ft), the 1,000 ft steps, and the pressure levels requested |
| [`src/types.ts`](src/types.ts) | The shapes: one model level, one wind, one row of the table |
| [`src/bearing.ts`](src/bearing.ts) | Direction and speed to and from u/v components; the drift arrow's bearing (wind direction + 180°) |
| [`src/cardinal.ts`](src/cardinal.ts) | The 16-point compass name of a direction |
| [`src/profile.ts`](src/profile.ts) | One hour's vertical profile: each level's real height from its geopotential, cloud clamped where it enters |
| [`src/interpolate.ts`](src/interpolate.ts) | Wind, temperature and cloud at any height, blended between the two levels around it |
| [`src/steps.ts`](src/steps.ts) | The table: the surface and every 1,000 ft to 15,000 ft above the field; the freezing level above the field |
| [`src/cloud.ts`](src/cloud.ts) | Cloud base and top from the levels, and cover in eighths and words |
| [`src/cloud-view.ts`](src/cloud-view.ts) | The Clouds screen: cover at a height, bands above 15,000 ft, a blend between a model's few levels, the shade curve |

## Two ideas worth reading the code for

**Wind is blended as vectors, never as degrees.** Between a level with wind from 350° and one with wind from 010°,
the average of the numbers is 180°: a wind from the opposite side of the sky, which would put a jump run on the wrong
side of the airfield. [`interpolate.ts`](src/interpolate.ts) blends the u and v components and converts back, so the
answer is from about 000°. Blended vectors can be weaker between two levels than at either of them when the wind veers
sharply, so the tests check a safety property instead of one number: every 50 ft, the blended wind is never stronger than
the stronger of the two levels the model reported.

**Heights are above the field, not above the sea.** A pressure level is not a fixed height: the 700 hPa surface was
at 10,128 ft above sea level on one measured day, and it moves with the weather. [`profile.ts`](src/profile.ts) reads each level's geopotential height and
subtracts the field's 299 ft, because an altimeter on a jump reads height above the ground it was set on.

## The fixture

[`fixtures/winds.json`](fixtures/winds.json) is one real response: forecast data from Open-Meteo.com, CC BY 4.0, GFS for
Kopaida Dimitra Airfield, 30 September–4 October 2026. The test in `cloud-view.test.ts` uses it to check, for every hour
and every 1,000 ft, that the Clouds picture and the winds table give the same cloud.

## Licence

The code here is licensed under the PolyForm Noncommercial License 1.0.0; the fixture is Open-Meteo's data under
CC BY 4.0. See [`../LICENSE`](../LICENSE).
