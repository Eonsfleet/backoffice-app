# Rebuild browser QA

These screenshots show **isolated QA fixtures**, not live platform/customer data. Application code does not import these fixtures. The browser script intercepts API requests; unmatched external requests are not forwarded to the real API.

The final run covers 13 viewport/state scenarios at 390, 768, 1024, 1280 and 1440 pixels in light/dark themes, with long names/emails, large counts, unavailable relationships, an unhealthy HTTP 503 response, empty results and failed requests. Additional interactions cover URL search/reset with retained focus, lazy sensor tabs, saved sidebar collapse, template save failure with preserved edits, discard confirmation, failed reset confirmation, mobile navigation and mobile template editing.

Results: `browser-results.json`; screenshots in this directory. The final run records no page overflow or browser page errors. Eight semantic text/surface pairs meet 4.5:1 in both themes; the minimum measured ratio is 4.65:1. This is a token check, not a complete WCAG certification of legacy screens.

The script uses Playwright installed in a temporary tooling directory and the installed Microsoft Edge browser. From PowerShell, prepare tooling with:

```powershell
npm install --prefix "$env:TEMP\eonsfleet-ui-qa" --no-save --no-package-lock --ignore-scripts playwright
npm run build
node node_modules/next/dist/bin/next start -p 3100
```

With the local preview running, use another terminal:

```powershell
node scripts/qa/rebuild-browser.mjs
```

The local preview checks compiled pages. Deployment must follow the repository's existing standalone output configuration. Real authentication/permissions, backend database state, template catalogue synchronization and notification delivery remain live integration checks.
