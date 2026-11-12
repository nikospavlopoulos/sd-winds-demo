# 0006 — The Cache API, and why Workers Caching stays off

**Status:** accepted · 2026-09-23 · the cache key is scoped to the model run and the Athens day, and stored for 8 h, since 0018 (in the private repository); `docs/architecture.md` has the current numbers; nothing is cached until it has been checked, since [0025](0025-check-an-upstream-reply-before-caching-it.md)

## Context

Cloudflare now offers two caching primitives. The older **Cache API**
(`caches.default`) is explicit: your Worker runs on every request and decides what
to store. The newer **Workers Caching** is read-through, tiered, collapses
concurrent requests, and skips Worker execution entirely on a hit. Cloudflare's own
documentation recommends it for new Workers.

## Decision

Use the **Cache API**, on `/api/*` only. **Workers Caching stays off.**

## Consequences

The recommendation does not survive contact with the Free plan. From Cloudflare's
pricing page: *"When Workers Caching is enabled, requests served from the Worker's
cache are billed at the same per-request rate as requests that invoke the Worker.
**This includes requests to static assets.**"*

Enabling it would convert this app's free, unlimited PWA shell loads into
consumption of the 100,000/day allowance — paying for the thing that is currently
free, in order to speed up the thing that is already cached.

Other consequences worth knowing:

- The Cache API is **per-data-centre**. N colos serving jumpers means N upstream
  fetches per TTL, not one.
- `cache.put()` **consumes the response body**, so the code clones before storing —
  and **awaits** the put. An un-awaited put is cancelled when the response
  completes, producing a permanent MISS and an upstream call on every request.
- Open-Meteo sends **no `Cache-Control` header at all**, so the Worker sets its own.
- `caches.default` is a Cloudflare extension absent from the DOM lib's
  `CacheStorage`, so it needs the augmentation in
  `src/worker/cloudflare.d.ts` (in the private repository). That file cannot
  be called `env.d.ts`: a sibling `env.ts` would shadow it and the augmentation
  would silently stop applying.

## Two `Cache-Control` headers, not one

The response stored in `caches.default` and the response returned to the browser
are **different objects with different headers**, and conflating them was a real
bug on the first release.

`cache.put()` reads a response's own `Cache-Control` to set its TTL, so the stored
copy carries `max-age`. Returning that same object told Cloudflare's edge and every
visitor's browser the forecast was cacheable — and the zone's Browser Cache TTL
(**14400 s**, Cloudflare's default) escalated it to four hours. A phone could serve
a four-hour-old forecast without any request reaching the Worker, and refreshing did
not help because a normal reload honours the HTTP cache. It took clearing the
browser cache by hand.

The returned copy is now `no-store`. **The shared cache belongs in the Worker, not
in the browser**, where it can be reasoned about, measured and invalidated.

## The TTL: scoped to the model run, not to the clock

GFS 0.25 publishes **every 6 hours** with roughly a **6.5 hour** lag — measured, the
00Z run became available at 06:28Z. And Open-Meteo bills by variable count:
*"Requests for data covering more than 10 weather variables … are considered
multiple API calls."* At **85 variables** each fetch costs about **8.5 weighted
calls**.

```
TTL 30 min ->  48 fetches/day/colo x 8.5 = 408 weighted calls/day/colo
TTL 60 min ->  24 fetches/day/colo x 8.5 = 204 weighted calls/day/colo
```

A 30-minute TTL would have doubled the upstream cost against a source that changes
four times a day. But a fixed TTL of any length is the wrong rule: an hourly one
re-fetched identical bytes five times per run, *and* could still serve an hour-old
copy the moment a new run landed. Worst of both.

**The cache key is therefore scoped to the model run** —
`/__cache/winds/v2/run-<initialisation-time>` — so a new run invalidates the entry by
existing. The metadata that supplies it is free, exempt from Open-Meteo's rate
limits, and cached for 15 minutes, which bounds how long a new run can go unnoticed.

Upstream cost drops to roughly one fetch per run per data centre (~4/day/colo,
~34 weighted calls) instead of 24, and the data is never more than 15 minutes
behind the newest run. If the metadata is unavailable the key falls back to an
hourly bucket, so a metadata outage degrades to the old behaviour rather than
breaking the page.
