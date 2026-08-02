---
name: Backend dependency mismatch
description: node-telegram-bot-api must be in backend/package.json, not just root
---

## Rule

`backend/index.js` imports `node-telegram-bot-api`. This package MUST be listed in `backend/package.json` dependencies, not just in the root `package.json`. The deployment run command (`node backend/index.js`) resolves modules relative to `backend/`, so root dependencies are not reliably available.

**Why:** When this was missing, the server failed on startup with MODULE_NOT_FOUND. Fixed by running `npm install node-telegram-bot-api --save` inside `backend/`.

**How to apply:** Any new npm package used in `backend/index.js` or `backend/scraper.js` must be added to `backend/package.json`.
