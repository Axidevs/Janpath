# JanPath — Test the Journey, Not Just the Website

> **A deterministic public-service citizen journey auditor.**  
> JanPath verifies whether a citizen can actually complete a public-service task (such as applying for a scholarship or certificate) using official website information. It produces dual evidence-backed findings for **citizens** (Citizen Mode) and **portal engineers** (Owner Mode).

---

## 🌟 Core Differentiator: Evidence Verification Engine

Most AI scrapers hallucinate or claim facts without proof. JanPath implements an independent, deterministic **Evidence Verification Engine**:

1. **Autonomous Exploration**: A TinyFish agent explores official portals following citizen goals (eligibility, required documents, deadlines, submission links).
2. **Independent Backend Retrieval**: The JanPath backend directly re-fetches each cited page via HTTP (with `ttl: 0` to bypass caches) and computes its SHA-256 cryptographic hash.
3. **Verbatim Quote Verification**: The engine checks whether claimed quotes exist in the retrieved page text using Unicode NFKC normalization, whitespace collapsing, and redirect scope guards.
4. **Deterministic Rules Engine**: Zero second LLM. Pure, unit-tested deterministic rules evaluate conflicts across pages, expired deadlines in IST, scattered requirements, and broken next steps (HTTP 404/410).

> [!IMPORTANT]
> **Mandatory Evidence Disclaimer:**  
> *A match proves the quote exists in the retrieved text, not that the claim is true, current or applicable.*  
> JanPath never overstates evidence and never generates fake confidence scores.

---

## 🏗️ Architecture & Project Structure

```
janpath/
├── client/                     # React + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/         # Header, AuditForm, AuditProgress, JourneyGraph,
│   │   │                       # CitizenMode, OwnerMode, EvidenceExplorer,
│   │   │                       # ComparisonView, AuditHistory
│   │   ├── data/               # Pre-bundled offline sample audit
│   │   ├── api.js              # Express API client adapter
│   │   ├── App.jsx             # Main dashboard shell & state manager
│   │   └── main.jsx            # React root mount
│   ├── index.html
│   └── vite.config.js          # Proxies /api to Express backend (port 3001)
│
├── server/                     # Express ES-Module Backend & Verifier
│   ├── src/
│   │   ├── engine/             # Verifier, dateParser, compare, & deterministic rules
│   │   ├── lib/                # URL guard, text normalizer, in-memory limiter
│   │   ├── models/             # Mongoose schemas (Audit, RunEvent)
│   │   ├── routes/             # REST endpoints (POST /api/audits, /compare, etc.)
│   │   ├── services/           # runAudit orchestration worker
│   │   ├── store/              # memoryStore (default) & mongoStore (Atlas)
│   │   ├── tinyfish/           # agentClient (SSE/polling), fetchClient, outputSchema
│   │   ├── app.js              # Express app factory with CORS & health check
│   │   └── index.js            # Server bootstrap
│   └── test/                   # 96 automated tests across 25 suites
│
├── fixture/                    # Controlled Local Test Fixture Microsite
│   ├── content.js              # Defective variant (6 planted defects) & clean variant
│   └── server.js               # Standalone microserver with POST /admin/toggle
│
├── shared/                     # Shared taxonomy, enums, & schemas
│   ├── constants.js            # AuditStatus, EvidenceStatus, FindingStatus, etc.
│   ├── schemas.js              # Zod validation schemas
│   └── sample-audit.json       # Golden sample audit dataset
│
└── docs/                       # Progress documentation & demo checklists
    ├── DEMO_CHECKLIST.md       # Step-by-step hackathon demo runbook
    └── PROGRESS.md             # Full phase verification log
```

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- Node.js v20+ or v22+
- npm v10+

### 1. Install Dependencies
```bash
# Install root/server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install

# Install fixture dependencies
cd ../fixture && npm install
```

### 2. Run All Automated Backend & E2E Tests
```bash
cd server
npm test
```
*Current test suite status:* **96 passing, 0 failing across 25 test suites** in ~400 ms.

### 3. Build Frontend for Production
```bash
cd client
npm run build
```

---

## 🖥️ Running the Complete Stack

To run the full hackathon application locally, start the three services in separate terminal windows:

### Terminal 1: Start the Local Scholarship Fixture (Port 3002)
```bash
cd fixture
npm start
```
*Visits http://localhost:3002 with the 6 planted defects (clean variant toggleable via `/admin/toggle`).*

### Terminal 2: Start the JanPath Backend (Port 3001)
```bash
cd server
npm start
```
*Listens on `http://localhost:3001` with `/health` and `/api/audits`.*

### Terminal 3: Start the JanPath Frontend (Port 3000)
```bash
cd client
npm run dev
```
*Open **http://localhost:3000** in your browser.*

---

## 🧭 Application Features & Modes

### 1. Citizen Mode
- **Plain-Language Journey Verdict**: Informs citizens immediately whether they can complete their submission online.
- **Key Facts Card Grid**: Displays verified eligibility thresholds (age limits, fees, deadline date, and application link status).
- **Document Checklist**: Provides a clear list of proofs to assemble before starting the application, with direct links to view the verified source quote.
- **Step-by-Step Next Steps**: Numbered procedure guiding the citizen from registration to submission.

### 2. Owner Mode
- **Technical Finding Cards**: Categorized by severity (Error, Warning, Info).
- **Rule Violations**: Flagged by deterministic rules:
  - `broken_next_step`: Detects HTTP 404/410 on application links.
  - `past_deadline`: Evaluates explicit dates against current IST date.
  - `conflict`: Catches contradictory facts on different pages.
  - `scattered_requirements`: Identifies proofs spread across multiple URLs.
  - `missing_information`: Detects unconfirmed steps.
- **Actionable Repair Suggestions**: Concrete guidance for portal engineers to fix the content or code.
- **Cryptographic Page Inventory**: Logs SHA-256 hashes and character counts for every retrieved URL.

### 3. Interactive Journey Graph
- Visual pipeline tracking the 5 citizen journey milestones:
  `Eligibility` &rarr; `Documents` &rarr; `Procedure` &rarr; `Deadline` &rarr; `Application Link`.
- Click any node to filter findings and jump directly to relevant evidence.

### 4. Evidence Verification Explorer
- Search and filter all verified citations.
- Displays the cited verbatim quote, verification status badge (`SOURCE_MATCHED`, `QUOTE_NOT_FOUND`, `COULD_NOT_VERIFY`), and exact matched context snippet from the page.
- Contains the mandatory verification disclaimer on every view.

### 5. Audit Comparator
- Deterministically diffs two audit runs:
  - `RESOLVED`: Issues fixed in the re-audit.
  - `NEW`: New regressions introduced.
  - `PERSISTENT`: Unresolved defects present in both runs.
  - `INCONCLUSIVE`: Claims that could not be evaluated due to smaller scope.

---

## 🔒 Security & Environment Configuration

Copy `server/.env.example` to `server/.env` (or configure via environment variables):

| Variable | Description | Default / Requirement |
| :--- | :--- | :--- |
| `PORT` | Express backend port | `3001` |
| `NODE_ENV` | Environment mode | `development` / `test` |
| `TINYFISH_API_KEY` | TinyFish Agent & Fetch API key | Secret (server-side only) |
| `MONGODB_URI` | MongoDB Atlas connection string | Optional (falls back to memoryStore) |
| `FIXTURE_HOST` | Hostname allowed for local testing | `localhost:3002` |
| `FIXTURE_ADMIN_TOKEN` | Secret for toggling fixture variants | `janpath-admin-secret` |
| `MAX_CONCURRENT_AUDITS` | Concurrency limit guard | `2` |

> **Security Guardrails:**
> - Non-allowlisted external or commercial domains are rejected by `urlGuard` before any agent or network activity occurs.
> - Secrets are never exposed to the client or logged in error messages.
> - Concurrency is strictly rate-limited in memory to prevent server resource starvation.
