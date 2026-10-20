# JanPath Build Progress

## Current Status & Summary
- **Mode**: Autonomous Build Mode
- **Current Phase**: Phase C Completed (Moving to Phase D)
- **Test Suite Results**: 58 tests passing, 0 failing across 13 test suites.

---

## Phase Status Checklist
- [x] **Phase A**: Status model (`shared/constants.js`), normalizer (`server/src/lib/normalize.js`), evidence verifier (`server/src/engine/verifier.js`), and unit tests (`server/test/verifier.test.js`).
- [x] **Phase B**: Schemas (`shared/schemas.js` with Zod, `server/src/tinyfish/outputSchema.js` hand-crafted JSON Schema), sample audit data (`shared/sample-audit.json`), and schema tests (`server/test/schemas.test.js`).
- [x] **Phase C**: Deterministic rules engine (`server/src/engine/rules/*`, `compare.js`) with positive/negative/uncertain unit tests (`server/test/rules.test.js`, `server/test/compare.test.js`).
- [ ] **Phase D**: Backend foundation (config, urlGuard, in-memory limiter, Mongoose models, Express app & routes, route/guard tests).
- [ ] **Phase E**: TinyFish clients & orchestration (agentClient, fetchClient, goal generator, runAudit service with mock injection for tests).
- [ ] **Phase F**: Fixture site (`fixture/`) with 6 planted defects, clean variant, admin toggle, and verification tests.
- [ ] **Phase G**: Frontend in `client/` (React + Vite + Tailwind, Citizen & Owner modes, Journey Graph, Evidence Explorer, comparison).
- [ ] **Phase H**: Final documentation, cleanup, demo checklist (`README.md`, `docs/DEMO_CHECKLIST.md`).

---

## How to Run Everything
### Run Backend Tests (from repo root)
```bash
npm --prefix server test
```
*Current real output:*
```
ℹ tests 58
ℹ suites 13
ℹ pass 58
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

---

## Key Decisions Made
1. **Short Page Guard**: If page text is under 300 characters, returns `COULD_NOT_VERIFY` with reason `insufficient_page_text` (handles JS-only shells like MyScheme detail pages).
2. **Short Quote Guard**: If normalized quote is under 15 characters, returns `COULD_NOT_VERIFY` with reason `quote_too_short`.
3. **Redirect Scope Guard**: If the final URL's host differs from the requested URL's host (ignoring `www.`) or fails `isHostAllowed`, returns `COULD_NOT_VERIFY` with reason `redirected_out_of_scope`.
4. **Shared Module**: Added `shared/package.json` with `"type": "module"` so ES imports work cleanly across backend and shared definitions.
5. **Normalizer Coverage**: Standardized Unicode NFKC, lowercase, quotes (`‘ ’ “ ”`), dashes (`– — −`), markdown (`|`, `*`, `#`, `[text](url)`), and unicode spaces/newlines while strictly preserving Devanagari Hindi text.

---

## Known Issues / Open Questions
None currently for Phase A.
