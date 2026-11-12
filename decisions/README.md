# Decision records

Six of the app's architecture decision records, copied as written, chosen for the trade-offs they show: each one
states the context, what I decided, what it costs, and what I rejected and why.

| Record | Decision |
|---|---|
| [0003](0003-pin-gfs-never-best-match.md) | Pin one forecast model for the winds, never Open-Meteo's `best_match` |
| [0004](0004-agl-not-msl.md) | Heights above the airfield (AGL), not above sea level |
| [0005](0005-thin-worker.md) | A thin Worker: the phone does the weather maths |
| [0006](0006-cache-api-and-why-workers-caching-is-off.md) | The Cache API, keyed to each model run, with Workers Caching off |
| [0014](0014-real-instants-not-local-labels.md) | True instants, not local time labels, so daylight-saving days are right |
| [0025](0025-check-an-upstream-reply-before-caching-it.md) | Check an upstream reply before caching it |

They refer to other records and files of the app; those stay in its private repository and are named here as plain text.
