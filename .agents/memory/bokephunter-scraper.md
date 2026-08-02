---
name: BokepHunter scraper
description: How the bokephunter.com scraper works — embed URL resolution per video source type
---

## Embed URL Resolution

Two video slug types exist:

1. `bokeprest-{ID}` — from bokep.rest (WordPress, post ID numeric)
   - Construct URL: `https://bokep.rest/bokep/{title-slug-from-thumbnail}/{ID}/.html`
   - Title slug: extracted from thumbnail filename (e.g. `Bokepkurir-pasrah-digoyang-pacar-tocil-hot-320x180.jpg` → `bokepkurir-pasrah-digoyang-pacar-tocil-hot`)
   - Actual player: `luluvdo.com/e/{code}` — found in the bokep.rest page HTML
   
2. `indoav-{slug}` — from indoav.com
   - Embed URL: `https://www.indoav.com/video/embed/{slug-without-indoav-prefix}`
   - Sometimes also present directly in bokephunter.com video detail HTML

**Why:** bokephunter.com is server-rendered Laravel; bokeprest video embed iframe is empty fallback in their HTML — must resolve from bokep.rest directly.

## Scraping Patterns

- Homepage: `https://bokephunter.com?page=N&sort=new|popular|duration`
- Category: `https://bokephunter.com/category/{slug}?page=N&sort=...`
- Search: `https://bokephunter.com/search?q={term}&page=N`
- Video detail: `https://bokephunter.com/video/{slug}`
- Age gate: cookie `age_ok=1` bypasses the interstitial

## Cache

5-minute in-memory cache in `backend/scraper.js` — keeps repeated requests fast without hammering source.
