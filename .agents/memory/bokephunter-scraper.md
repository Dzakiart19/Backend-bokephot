---
name: BokepHunter scraper
description: Scrapes bokephunter.com; two embed source types with different resolution strategies. Thumbnail hotlink notes included.
---

## Embed source types

**bokeprest-XXXX** slugs:
- Thumbnail from `bokep.rest/wp-content/uploads/...` — hotlink-blocked, must proxy via `/api/bh/proxy-thumb`
- Embed resolved by: bokep.rest page → luluvdo.com/e/ID → unpack eval(p,a,c,k,e,d) JS → extract `file:"https://...master.m3u8"` → return direct HLS stream (no ads)
- Luluvdo m3u8 tokens expire ~8h (e=28800 param); 5-min in-memory cache is fine
- If Luluvdo direct fails, falls back to luluvdo iframe

**indoav-XXXX** slugs:
- Embed constructed as `https://www.indoav.com/video/embed/VIDEOID`
- Loaded in sandboxed iframe (`sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"`) — no `allow-popups` blocks popup/popunder ads
- RC4 `/video/v/` POST for direct stream blocked by Cloudflare server-side; sandbox is the best available approach

## Key decisions

- Embed URL is now resolved **eagerly** on the `/api/bh/video/:slug` endpoint (not lazily on click). This means the detail page delivers `embedUrlFromPage` ready to use, so play is instant.
- `xepoFrame` section on bokephunter.com contains the player but the iframe `src` is JS-rendered (not in raw HTML), so it must always be resolved via bokep.rest.
- Thumbnails from `bokep.rest` must go through `/api/bh/proxy-thumb?url=...` — direct browser requests are hotlink-blocked.
- Cache TTL: 5 minutes in-memory. Embed URLs cached under `embed_SLUG` key.

**Why:** Eager embed resolution inside the API response caused 10–17s page load times (scrape + embed = sequential). The pattern that works: return page data fast (~0.7s), fire embed resolution as a fire-and-forget background task after `res.json()`, and have the frontend immediately start prefetching `/embed` so the promise is already resolved by the time the user taps play.
