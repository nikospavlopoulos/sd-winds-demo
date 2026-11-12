# 0003 — Pin `models=gfs_global`, never `best_match`

**Status:** accepted · 2026-09-23 · its seven-day horizon argument is superseded by 0015 (in the private repository); the vertical-resolution argument stands

## Context

Open-Meteo's default is `models=best_match`, described as selecting the
highest-resolution model available for a location. For Greece that is ICON-EU at
7 km, which sounds like the right answer.

It is not. **`best_match` interleaves two models inside a single vertical
profile.** Measured directly at Kopaida:

| Level | `best_match` | equals |
|---|---|---|
| 900 hPa | 10.2 kt | `icon_eu` |
| 875 hPa | 16.4 kt | `gfs_global` |
| 850 hPa | 11.7 kt | `icon_eu` |
| 825 hPa | 13.9 kt | `gfs_global` |
| 800 hPa | 11.5 kt | `icon_eu` |
| 775 hPa | 13.7 kt | `gfs_global` |

ICON-EU publishes the coarse standard levels; the 25 hPa intermediate levels come
from GFS. Requesting both gives a several-knot sawtooth every ~750 ft that is
entirely an artefact of model switching. For a page whose purpose is to show wind
shear, that is the worst possible defect: it manufactures the exact signal the
reader is looking for.

## Decision

Pin **`models=gfs_global`** for the whole column, in
`src/shared/openmeteo.ts` (in the private repository).

## Consequences

Measured level counts and worst interpolation spans between 1,000 and 15,000 ft AGL:

| Model | Levels | Worst span | Median | Horizon |
|---|---|---|---|---|
| **GFS 0.25 (25 km)** | **19** | **1,115 ft** | **863 ft** | 16 days |
| ICON-EU (7 km) | 10 | 4,580 ft | 3,507 ft | 5 days |
| ARPEGE-EU (11 km) | 11 | 2,195 ft | 1,804 ft | 4 days |

- Every step is a short interpolation between two real model values, never an
  extrapolation across a void.
- Only GFS covers the full 7-day view the app offers.
- **The trade-off, stated plainly:** 25 km is a coarser grid than ICON-EU's 7 km
  and is weaker at the surface, where terrain matters and the Kopais basin *is*
  terrain. Above the boundary layer the flow is synoptic and 25 km resolves it
  about as well. Vertical resolution is what this app exists to show, so that is
  what was bought.
- The 25 hPa intermediate levels are documented on Open-Meteo's **GFS page only**,
  not the generic docs. The contract test asserts they still exist.

## Rejected

**ICON-EU** — better grid, but nine of the fifteen steps would be invented from
levels 3,500-4,600 ft apart, and it cannot see a wind minimum like the 775-700 hPa
feature GFS resolves. **`best_match`** — the sawtooth above.
