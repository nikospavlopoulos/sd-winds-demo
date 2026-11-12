# 0014 — Real instants, not local labels

**Status:** accepted · 2026-09-30 · the legacy routes were retired on 2026-11-12, 0027 (in the private repository)

## Context

Every request asked Open-Meteo for `timezone=Europe/Athens` and got back local
wall-clock labels such as `"2026-10-26T15:00"`. The app compared those labels with the
current Greek time to find "now", sliced them to print the hour, and joined the winds to
the weather by matching them.

That breaks twice a year. Open-Meteo labels a whole response with **one fixed UTC
offset**. Measured against its historical API with both formats for the same request:

```
26 Oct 2025 (clocks go back at 04:00 EEST)
  instant 1761480000 = 12:00 UTC = 14:00 in Athens   local label: "2025-10-26T15:00"
  every label from 04:00 onwards is one hour late; the day shows 24 hours, not 25
```

The offset it applies is the one in force **when the request is made**, not the one at
the start of the window: a request made in September for 28–30 March 2026 reports
`utc_offset_seconds: 10800` (+3) although Greece is on +2 then, and its window starts at
23:00 on the 27th.

With a five- or seven-day window, every response fetched in the days before a change
spans it. On 25 October 2026 the page would have printed the wrong hour for everything
after the change — the one day a jumper most needs to know what time the winds are for.

## Decision

**Ask for true instants (`timeformat=unixtime`) and make every time decision in the
browser.**

- `hourly.time` holds Unix seconds. The Greek date and `HH:MM` of each hour come from the
  module-level `Intl.DateTimeFormat` formatters with the IANA zone, computed once per
  response.
- "Now" is the last hour that has started; days are the distinct Athens dates; the day the
  clocks go back has 25 hours with 03:00 twice, the day they go forward 23.
- The winds and the weather are joined by instant.
- The selected hour is stored as an instant, so a refresh whose window starts a day later
  keeps showing the same hour.

**The new format goes on new paths.** An installed app keeps running its previous bundle
for the rest of a visit after an update — the generated `registerSW.js` registers the
Service Worker and never reloads the page — and that bundle slices label strings. If
`/api/winds` had started returning numbers, those phones would have shown a blank page.
So the current client calls `/api/winds/gfs` and `/api/weather/ecmwf`, and the old paths
keep their old URL builders (`forecastUrlV1`, `weatherUrlV1`) and cache namespaces,
frozen, until no release in use calls them.

## Consequences

- Nothing in the app may slice, compare or parse an Open-Meteo time string again; the
  types say `number[]`, and `hasInstantTimes` rejects a body that is not.
- Tests pin the behaviour with two real captured responses, one across each change, not
  with synthetic timestamps.
- The e2e fixtures are rebuilt onto today as "Athens midnight + i hours", which is exact
  only for a capture that does not straddle a change; the capture script refuses one.
- Two sets of routes exist for a while. The legacy set is removed once no current release
  calls it; that is recorded in `future-features.md` (in the private repository).

## Rejected

- **Keep the labels and correct them by the known offset.** It needs a model of when
  Greece changes its clocks and of which offset Open-Meteo happened to apply; the instant
  needs neither.
- **Change the format of the existing paths.** Crashes every installed app still running
  the previous bundle, for one visit each.
- **Ask for UTC (`timezone=GMT`) instead.** The window would then start at UTC midnight,
  02:00 or 03:00 in Athens, and lose the first hours of each day.
