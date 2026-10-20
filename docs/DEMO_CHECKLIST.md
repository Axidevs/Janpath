# JanPath — Hackathon Demo Checklist & Runbook

This runbook guides presenters through a complete, flawless demonstration of JanPath. It provides an offline path (using the pre-bundled dev sample), a local fixture path (with zero API spend), and an optional live portal path.

---

## 📋 1. Pre-Demo Health Verification

Run these three commands before starting the presentation:

```bash
# 1. Verify all 96 backend and E2E lifecycle tests pass
npm --prefix server test

# 2. Verify clean production compilation of the React frontend
npm --prefix client run build

# 3. Check that no stale processes occupy ports 3000, 3001, or 3002
lsof -i :3000 -i :3001 -i :3002
```

---

## 🚀 2. Start the Demo Services

Open three terminal tabs:

```bash
# Tab 1: Scholarship Fixture Microsite
cd fixture && npm start
# -> Runs on http://localhost:3002 (active variant: defective)

# Tab 2: JanPath Backend API
cd server && npm start
# -> Runs on http://localhost:3001 (in-memory store fallback active)

# Tab 3: JanPath Frontend
cd client && npm run dev
# -> Opens http://localhost:3000
```

---

## 🎬 3. Demonstration Script (3–5 Minutes)

### Act I: The Problem & The Solution (30s)
1. **Explain the Pain**:
   > *"Citizens visiting government portals often get lost: deadlines are expired, documents are scattered across 4 different pages, and the 'Apply Now' button leads to an HTTP 404 error. Generic AI chatbots hallucinate policies that don't exist. JanPath tests the journey, not just the website."*
2. **Open http://localhost:3000**:
   - Show the clean JanPath dashboard shell.
   - Highlight the 3 pillars: Citizen Mode, Owner Mode, and Evidence Verification Engine.

---

### Act II: Instant Walkthrough with Dev Sample (60s)
1. **Click "Dev Sample" in the top header**:
   - The application instantly loads the verified golden sample audit.
2. **Citizen Mode**:
   - Point out the **Citizen Journey Verdict**: *"Citizen Cannot Complete Online Submission (Broken Link)"*.
   - Point out the **Key Facts Grid**: Age (18–25), Fee (₹0 Free), Deadline (15/03/2026), CTA (Broken Link 404).
   - Point out the **Document Preparation Checklist** with click-to-inspect citations.
3. **Owner Mode**:
   - Switch to the **Owner Mode** tab.
   - Show the technical breakdown: Rule violations for `broken_next_step` (HTTP 404) and `scattered_requirements`.
   - Highlight the **Concrete Repair Suggestion** box showing web teams exact remediation steps.
   - Show the **Page Inventory & Cryptographic Hashes** proving SHA-256 integrity.
4. **Evidence Verification Explorer**:
   - Scroll down to the Evidence Explorer.
   - Emphasize the **Mandatory Evidence Disclaimer**:  
     *"A match proves the quote exists in the retrieved text, not that the claim is true, current or applicable."*
   - Show the verbatim quote card and the exact highlighted context snippet from the page.

---

### Act III: The Controlled Fixture Demonstration (The "Before & After") (90s)
1. **Launch Audit on Defective Fixture**:
   - Click **"New Audit"** button.
   - Click the preset: **"Scholarship Microsite (Local Fixture)"** (`http://localhost:3002/`).
   - Click **"Launch Journey Audit"**.
   - Show the live **AuditProgress** terminal polling events in real time.
2. **Inspect Defects Caught**:
   - JanPath flags all planted defects:
     - `conflict`: Age 18–45 on Guidelines vs. Age 18–60 on FAQs.
     - `past_deadline`: Expired closing date (15/03/2024).
     - `broken_next_step`: `/apply` returns HTTP 404.
     - `scattered_requirements`: Mandatory certificates spread across multiple pages.
3. **The "Fix" (Toggle Fixture to Clean)**:
   - In your terminal, flip the fixture to the clean variant:
     ```bash
     curl -X POST http://localhost:3002/admin/toggle \
       -H "Authorization: Bearer janpath-admin-secret" \
       -H "Content-Type: application/json" \
       -d '{"variant":"clean"}'
     ```
   - *Terminal responds: `{"activeVariant":"clean"}`.*
4. **Trigger Re-Audit & Comparison**:
   - On the web app, click the **"History"** tab.
   - Click the **"Re-audit"** button on the fixture audit.
   - When the re-audit completes, switch to the **"Compare Audits"** tab.
   - Select Base (defective run) and Target (clean run).
   - Click **"Compare Audits Deterministically"**.
5. **Show the Resolution Transition**:
   - Show the **Resolved Issues** card showing issues transitioned to `RESOLVED`!
   - Highlight: *"Zero LLM hallucination. Deterministic rules proved that the bugs were fixed."*

---

### Act IV: Security & Guardrails (30s)
1. **Show URL Guard Protection**:
   - Click **"New Audit"**.
   - Type a commercial URL (e.g., `https://commercial-scam.com`).
   - Show that JanPath rejects it immediately with HTTP 400:  
     `URL rejected by security guard: domain_not_allowlisted`.
   - Point out that only `.gov.in`, `.nic.in`, `.ac.in`, and designated test fixtures can ever be queried.

---

## ❓ Frequently Asked Questions & Answers for Judges

**Q: Why not just use an LLM to read the website and summarize it?**  
> *A: LLMs hallucinate dates, confuse applicant criteria with hostel or dependent criteria, and cannot verify whether links actually work. JanPath uses an agent only to navigate and retrieve candidate quotes, and then independently re-fetches the page text and executes deterministic, pure-function code to verify quotes, parse calendar dates in IST, and check HTTP status codes.*

**Q: What does "SOURCE_MATCHED" mean? Does it mean the scholarship is approved?**  
> *A: Absolutely not. As stated in our mandatory disclaimer, SOURCE_MATCHED proves strictly that the verbatim quote exists in the retrieved page content at the moment of fetch. It does not prove the claim is current, legally binding, or applicable to every citizen.*

**Q: Can this handle Hindi or regional languages?**  
> *A: Yes. Our Unicode NFKC text normalizer strictly preserves Devanagari Hindi characters and supports English and Hindi keyword scans without altering non-Latin scripts.*

**Q: What happens if a re-audit visits fewer pages? Does it falsely say bugs were resolved?**  
> *A: No. JanPath enforces a strict scope guard: if a re-audit had a smaller page scope or failed, old issues are marked INCONCLUSIVE, never RESOLVED.*
