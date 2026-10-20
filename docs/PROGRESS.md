# JanPath Build Progress

## Current Status & Summary
- **Mode**: Autonomous Build Mode — **All Phases Completed & Verified**
- **Test Suite Results**: **96 tests passing, 0 failing across 25 test suites** in ~400 ms.
- **Frontend Build Results**: **Vite production bundle built successfully** in ~920 ms (0 errors).
- **E2E Integration Status**: Full lifecycle verified against local scholarship fixture and mock orchestration clients.

---

## Phase Status Checklist
- [x] **Phase A**: Status model (`shared/constants.js`), normalizer (`server/src/lib/normalize.js`), evidence verifier (`server/src/engine/verifier.js`), and unit tests (`server/test/verifier.test.js`).
- [x] **Phase B**: Schemas (`shared/schemas.js` with Zod, `server/src/tinyfish/outputSchema.js` hand-crafted JSON Schema), sample audit data (`shared/sample-audit.json`), and schema tests (`server/test/schemas.test.js`).
- [x] **Phase C**: Deterministic rules engine (`server/src/engine/rules/*`, `compare.js`) with positive/negative/uncertain unit tests (`server/test/rules.test.js`, `server/test/compare.test.js`).
- [x] **Phase D**: Backend foundation (config, urlGuard, in-memory limiter, Mongoose models, Express app & routes, route/guard tests: `server/test/urlGuard.test.js`, `server/test/limiter.test.js`, `server/test/routes.test.js`).
- [x] **Phase E**: TinyFish clients & orchestration (agentClient with SSE and polling recovery, fetchClient with ttl:0 batching and sha256 hashing, goal generator, runAudit service: `server/test/orchestration.test.js`).
- [x] **Phase F / Phase 1 Backend Verification**: Fixture site (`fixture/`) with 6 planted defects, clean variant, admin toggle, server execution guard fix, server bootstrap worker wiring, cleanly exiting test suite, and integration tests (`server/test/fixture.test.js`, `server/test/serverIntegration.test.js`).
- [x] **Phase 2 (Frontend)**: React 18, Vite, and Tailwind CSS client in `client/` (`AuditForm`, `AuditProgress`, `Header`, `JourneyGraph`, `CitizenMode`, `OwnerMode`, `EvidenceExplorer` with mandatory disclaimer, `ComparisonView`, `AuditHistory`). Clean production build verified.
- [x] **Phase 3 (Integration & Verification)**: Full end-to-end integration test (`server/test/e2eWorkflow.test.js`) exercising real HTTP page fetches, evidence verification against fixture, defect detection, variant toggle, re-audit, and `RESOLVED` comparison diffing.
- [x] **Phase 4 (Documentation & Final Demo Prep)**: Root `README.md`, `docs/DEMO_CHECKLIST.md`, and complete local runbook.

---

## How to Run Everything

### 1. Run Automated Backend & E2E Test Suite (from repo root)
```bash
npm --prefix server test
```
*Actual output:*
```
ℹ tests 96
ℹ suites 25
ℹ pass 96
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 437.559334
```

### 2. Build Frontend Production Bundle
```bash
npm --prefix client run build
```
*Actual output:*
```
vite v6.4.4 building for production...
✓ 1951 modules transformed.
dist/index.html                   1.26 kB │ gzip:  0.72 kB
dist/assets/index-bB_C60ZJ.css   30.14 kB │ gzip:  5.83 kB
dist/assets/index-2JrNgFY1.js   233.36 kB │ gzip: 66.16 kB
✓ built in 926ms
```

### 3. Local Multi-Service Execution
- **Fixture Microsite**: `cd fixture && npm start` (Port 3002)
- **Backend Express API**: `cd server && npm start` (Port 3001)
- **Frontend Vite Dev**: `cd client && npm run dev` (Port 3000 -> proxies `/api` to 3001)

---

## Key Decisions Made
1. **Short Page Guard**: If page text is under 300 characters, returns `COULD_NOT_VERIFY` with reason `insufficient_page_text` (handles JS-only shells like MyScheme detail pages).
2. **Short Quote Guard**: If normalized quote is under 15 characters, returns `COULD_NOT_VERIFY` with reason `quote_too_short`.
3. **Redirect Scope Guard**: If the final URL's host differs from the requested URL's host (ignoring `www.`) or fails `isHostAllowed`, returns `COULD_NOT_VERIFY` with reason `redirected_out_of_scope`.
4. **Mandatory Disclaimer**: Prominently displayed in UI and documented: *"A match proves the quote exists in the retrieved text, not that the claim is true, current or applicable"*.
5. **Deterministic Rules Engine**: Zero second LLM. Pure deterministic checks for conflicts, past deadlines in IST, scattered requirements, and broken next steps (HTTP 404/410).
6. **Strict Re-audit Scope Guard**: If a re-audit visits fewer pages than the baseline audit or fails, old issues are marked `INCONCLUSIVE`, never `RESOLVED`.
7. **Offline Dev Sample**: Self-contained `sampleAudit.js` embedded in client allows instantaneous demonstration without waiting for network calls.
8. **Server Execution Guard**: Standalone servers in `server/src/index.js` and `fixture/server.js` execute `app.listen()` only when invoked directly from CLI (`process.argv[1] === fileURLToPath(import.meta.url)`), preventing hanging during automated test imports.

---

## Known Issues / Open Questions
None. All components, rules, and integration workflows are verified and passing.
