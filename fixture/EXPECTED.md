# JanPath Test Fixture: Expected Findings & Defects

The JanPath Test Fixture is a server-rendered microsite specifically designed to test whether an autonomous agent and the deterministic verification engine correctly detect known accessibility/completeness hurdles on government scheme portals.

---

## 1. Defective Variant (Default) &mdash; Exactly 6 Planted Defects

### Defect 1: Conflicting Age Requirements across Pages
- **Location 1**: `/guidelines` states: `"Applicants must be between 18 and 45 years of age at the time of application."`
- **Location 2**: `/faq` states: `"Applicants must be between 18 and 60 years of age at the time of application."`
- **Expected Finding**: Both quotes independently verify as `SOURCE_MATCHED`.
- **Expected Issue**: `conflict` rule triggers an error: `"Contradictory age_max requirements across pages"`.

### Defect 2: Missing Document on Checklist
- **Location**: `/guidelines` states: `"state Domicile Certificate is mandatory for all applicants under this state quota scheme."`
- **Missing On**: `/documents` checklist explicitly omits Domicile Certificate.
- **Expected Finding**: Citizen following the checklist will not be informed of the mandatory domicile proof until rejection or deep reading.

### Defect 3: Expired Past Deadline
- **Location**: `/guidelines` states: `"The last date for online submission of completed application forms is 15/03/2024."`
- **Expected Finding**: Date parses deterministically as `15/03/2024` without `Date.parse`.
- **Expected Issue**: `past_deadline` rule triggers a warning labeled `"potentially outdated"`.

### Defect 4: Broken Next Step Application Link (HTTP 404)
- **Location**: Primary CTA button links to `/apply`.
- **Behavior**: `/apply` returns HTTP 404 (Not Found).
- **Expected Finding**: Evidence verification evaluates to `COULD_NOT_VERIFY` (`http_404`).
- **Expected Issue**: `broken_next_step` rule triggers an error: `"Primary application link is broken (HTTP 404)"`.

### Defect 5: Requirements Scattered Across Multiple Pages
- **Distribution**:
  - `/guidelines`: `"Income Certificate issued by Tehsildar is required for all applicants."`
  - `/documents`: `"Caste Certificate verified by sub-divisional magistrate is required"`
  - `/faq`: `"Bank Passbook with Aadhaar linkage is required"`
- **Behavior**: No single page lists all three mandatory requirements.
- **Expected Issue**: `scattered_requirements` rule triggers a warning: `"Mandatory requirements scattered across multiple pages"`.

### Defect 6: Missing Deadline on Specific Scheme Section
- **Location**: `/special-incentive`
- **Behavior**: The page describes the grant but omits any submission date, schedule, or deadline keywords entirely.
- **Expected Finding**: Two-signal rule reports `NOT_FOUND_IN_SCOPE` for deadline on this scheme.

---

## 2. Clean Variant &mdash; Zero Defects + Look-Alike Decoy

When toggled via `POST /admin/toggle`, all 6 defects are resolved:
1. **Age Consistency**: `/guidelines` and `/faq` both state 18 to 45 years.
2. **Unified Checklist**: `/documents` contains a consolidated checklist with all documents (Income, Caste, Domicile, Bank Passbook).
3. **Active Future Deadline**: `/guidelines` states `31/12/2027`.
4. **Working Application Link**: `/apply` returns HTTP 200 with active submission page.
5. **Consolidated Overview**: Landing page and checklist consolidate all proofs.
6. **Look-Alike Decoy**:
   - Location: `/hostel-guidelines` states: `"Children admitted to the associated welfare hostel must be between 6 and 14 years of age."`
   - Decoy Behavior: Relates to children's hostel admission, NOT applicant age. The conflict rule must **NOT** trigger a false positive against the 18-45 applicant age rule.
