# 0025 — Check an upstream reply before caching it

**Status:** accepted · 2026-11-12 · the legacy paths' exemption from the fallback ended with them the same day, 0027 (in the private repository)

## Context

The Worker cached any 2xx from Open-Meteo without reading it ([ADR-0005](0005-thin-worker.md)). On
1 October 2026 the CI smoke check found `/api/winds/gfs` answering with headers but an empty body,
twice from the same data centre — so the empty reply had been cached. Analytics recorded a 62 s wall
time for that window's slowest request. Cached, a bad reply is served to everyone in that data centre
until the key changes (the next model run or Athens midnight, up to about six hours), and the Service
Worker stores it over the phone's last good copy, because it carries our `x-winds-fetched-at`.

Open-Meteo's metadata endpoint has also answered 200 with `{"error":true,…}`, and that reply was
cached for 15 minutes like any other.

Nothing had a timeout: a stalled upstream held the request as long as the client waited.

## Decision

- **A MISS is parsed once, before it is stored**: the body must be JSON, not Open-Meteo's
  `{"error":true}`, with a non-empty `hourly.time`, and the response must say `application/json`
  (`src/worker/upstream-body.ts`). Anything else is answered `503 {"error":"upstream_invalid"}` and
  never cached. A HIT is still served without reading the body.
- **Timeouts:** 15 s for a forecast, 5 s for metadata, covering the body as well as the headers. A
  timeout answers `503 {"error":"upstream_timeout"}`; the metadata simply counts as unavailable.
- **Metadata is cached only when it parses.**
- **One log line per MISS** — status, content type, size, milliseconds, and whether it was kept — so the
  next bad reply leaves evidence in `wrangler tail` and Workers Logs.
- **The Service Worker falls back to its last good copy on a 5xx** and marks that copy
  (`x-winds-from-cache`), so the page shows it and still reports the failure. A phone with signal says
  *"Can't reach the forecast service"*, not *"No connection"*; a failure is remembered with whether the
  phone had a network at the time, and the app refreshes when the network comes back. The three frozen
  legacy paths are left out of the fallback, so app versions from before 30 September 2026 get exactly
  the answers they always got.

## Consequences

- An empty or broken reply costs one 503 and a retry on the next request, never hours of a broken page
  or a lost offline copy.
- The Worker now parses about 64 kB on each MISS — a handful of times a day per data centre per route.
  The MISS CPU is re-measured and recorded in `docs/operations.md`: 5–7 ms for the 86 kB winds on 12 November.
- The rule "the Worker never parses the body" becomes "the Worker parses a body only to check it,
  never to change it" (the repository's working rules).
- The hermetic tests cover each bad reply, and the timeouts, through test-only settings
  (`UPSTREAM_TIMEOUT_MS`, `META_TIMEOUT_MS`) that production never sets.

## Rejected

- **Checking only the content type and a minimum size.** Cheaper, and it catches the empty body, but a
  long truncated body or the error object inside a valid-looking reply would still be cached.
- **Validating on every HIT.** It would protect against an entry stored before this change, at a parse
  per request; entries live a few hours at most, so it buys nothing lasting.
- **Leaving the Service Worker as it was.** A cold start during an outage would still say "nothing
  cached yet" while the phone held a good copy.
