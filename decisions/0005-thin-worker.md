# 0005 — A thin Worker; the client does the meteorology

**Status:** accepted · 2026-09-23 · the window is five days, 120 hours, since 0015 (in the private repository); a MISS is parsed once to check it before caching, since [0025](0025-check-an-upstream-reply-before-caching-it.md)

## Context

Someone has to turn 19 pressure levels into 16 altitude steps. Either the Worker
does it and sends a small pre-computed ladder, or it passes the raw profile through
and the browser does it.

Two measured numbers decide it. The Workers **Free plan allows 10 ms of CPU per
invocation**. The full week from Open-Meteo is **80 kB raw, 21 kB gzipped**.

## Decision

The Worker is a caching, attributing, quota-protecting proxy and **never parses the
body**. All the meteorology lives in `src/shared/` and runs in the browser.

## Consequences

| | Thin Worker | Fat Worker |
|---|---|---|
| CPU on a cache miss | body streamed, never parsed | parse + ~2,700 trig ops + serialise, inside 10 ms |
| Payload | 21 kB gzipped | ~12 kB gzipped |
| Where the physics is tested | a pure function, in Node | inside `workerd` |
| Scrubbing 168 hours | free, the client holds the week | free, but the ladder is fixed at fetch time |
| Reused by Goal #2 | same module, no new endpoint | needs the raw profile back |

- The 9 kB saved was not worth putting a hot loop inside a 10 ms ceiling.
- **Goal #2 settles it independently:** freefall drift has to integrate the wind
  between exit and opening, which is exactly the raw profile a fat Worker would
  have discarded.
- Scrubbing across all 168 hours costs **zero** network requests, which is what
  makes the day and hour controls usable with no signal.
- `src/shared/` is imported by the client and the tests. The Worker imports only
  the URL builder.
