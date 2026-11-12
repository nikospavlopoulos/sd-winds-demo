# 0004 — Altitudes are AGL above the airfield, not MSL

**Status:** accepted · 2026-09-23

## Context

Winds-aloft products disagree. The reference page at `markschulze.net/winds` labels
its rungs **AGL** — provable from the `ftAGL` header in its own downloadable file,
and from the fact that its ladder tops out ~11,000 ft lower at La Paz than in
Greece. The widely-cited Skydive Fundamentals method works in **MSL**. The
jumplogs.com calculator states neither. Open-Meteo's own data is MSL:
*"Altitudes are in meters above sea level (not above ground)."*

Kopaida sits at 91 m / 299 ft MSL, so the two differ by about 300 ft everywhere.

## Decision

**Feet AGL above Kopaida.** Every altitude on the page is what an altimeter reads
if it was zeroed on the ground here.

## Consequences

- Matches what a jumper's altimeter and dytter show, and how exit altitude is
  spoken about on the aircraft.
- Matches what Goal #2's spot calculator will need.
- Requires subtracting the field elevation from every geopotential height.
- **`&elevation=91` is pinned in the upstream URL** so Open-Meteo's own downscaling
  and our `FIELD_FT` constant cannot drift apart. Without that pin, a DEM update
  upstream would silently shift every altitude on the page. The contract test
  asserts the response still echoes it.
- Aviation charts will not line up exactly, so
  `/about` says so in the first section.

## Rejected

**MSL** — matches aviation charts and the Skydive Fundamentals text, but not the
instrument on the jumper's wrist. **A toggle** — two people reading the same screen
differently is worse than one convention stated clearly.
