/**
 * fixture/content.js
 *
 * Server-rendered static HTML generator for the JanPath Scholarship Test Fixture.
 * Generates both "defective" (with 6 planted defects) and "clean" (zero defects + decoy) variants.
 * Pure server-rendered HTML (zero client-side JS required).
 */

function pageLayout({ title, content, variant }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - JanPath Test Fixture</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; margin: 0; padding: 0; color: #1a202c; background: #f7fafc; }
    .fixture-banner { background: #feb2b2; color: #742a2a; padding: 12px 20px; font-weight: 600; text-align: center; border-bottom: 2px solid #fc8181; }
    .container { max-width: 900px; margin: 30px auto; background: #fff; padding: 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    header { border-bottom: 2px solid #edf2f7; padding-bottom: 20px; margin-bottom: 24px; }
    nav { margin-top: 12px; display: flex; gap: 16px; }
    nav a { color: #2b6cb0; text-decoration: none; font-weight: 500; }
    nav a:hover { text-decoration: underline; }
    .cta-btn { display: inline-block; background: #3182ce; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px; }
    .cta-btn:hover { background: #2b6cb0; }
    .tag { display: inline-block; background: #edf2f7; padding: 2px 8px; border-radius: 4px; font-size: 0.85em; }
    footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 0.9em; color: #718096; }
  </style>
</head>
<body>
  <div class="fixture-banner">
    ⚠️ JANPATH TEST FIXTURE &mdash; Version: <strong>${variant.toUpperCase()}</strong> &mdash; This is a controlled synthetic test site for journey verification. Not an official portal.
  </div>
  <div class="container">
    <header>
      <h1>National Pre-Matric & Higher Education Scholarship Scheme</h1>
      <p class="tag">Ministry of Social Welfare & Education &bull; Test Fixture</p>
      <nav>
        <a href="/">Overview</a>
        <a href="/guidelines">Guidelines</a>
        <a href="/documents">Documents Checklist</a>
        <a href="/faq">FAQs</a>
        <a href="/hostel-guidelines">Hostel Rules (Decoy)</a>
        <a href="/special-incentive">Special Incentive</a>
      </nav>
    </header>
    <main>
      ${content}
    </main>
    <footer>
      <p>&copy; 2026 National Scholarship Portal Test Harness. All rights reserved. Designed for automated journey testing.</p>
    </footer>
  </div>
</body>
</html>`;
}

export function renderHomePage(variant) {
  const content = `
    <h2>Scheme Overview & Objectives</h2>
    <p>The National Pre-Matric & Higher Education Scholarship Scheme provides direct financial assistance to eligible students from economically weaker sections. Applicants must review all guidelines prior to submitting their application online.</p>

    <h3>Application Journey:</h3>
    <ol>
      <li>Verify your eligibility criteria on the <a href="/guidelines">Guidelines page</a>.</li>
      <li>Assemble all mandatory certificates listed on the <a href="/documents">Documents Checklist</a>.</li>
      <li>Confirm questions and special quota rules on the <a href="/faq">FAQs page</a>.</li>
      <li>Click the official application submission link below.</li>
    </ol>

    <div style="margin-top: 30px;">
      <a href="/apply" class="cta-btn">Apply Now Online &rarr;</a>
    </div>
  `;
  return pageLayout({ title: 'Scheme Overview', content, variant });
}

export function renderGuidelinesPage(variant) {
  const isDefective = variant === 'defective';

  // Defect 1: Age 18-45 here vs 18-60 on FAQ
  const ageStatement = isDefective
    ? 'Applicants must be between 18 and 45 years of age at the time of application.'
    : 'Applicants must be between 18 and 45 years of age at the time of application.';

  // Defect 3: Expired deadline in 2024
  const deadlineStatement = isDefective
    ? 'The last date for online submission of completed application forms is 15/03/2024.'
    : 'The last date for online submission of completed application forms is 31/12/2027.';

  // Defect 5: Scattered requirement part 1
  const docStatement = isDefective
    ? 'Mandatory document requirement: Income Certificate issued by Tehsildar is required for all applicants.'
    : 'Mandatory document requirement: All applicants must refer to the consolidated documents checklist on the Documents page.';

  const content = `
    <h2>Scheme Guidelines & Eligibility</h2>
    <p>Please read the following eligibility terms carefully before applying.</p>

    <h3>1. Age Criteria</h3>
    <p><strong>${ageStatement}</strong> Upper age relaxation applies to reserved categories as per central government norms.</p>

    <h3>2. Submission Deadline</h3>
    <p><strong>${deadlineStatement}</strong> Incomplete applications or submissions received after this date will be summarily rejected.</p>

    <h3>3. Document Requirements</h3>
    <p>${docStatement}</p>
    <p>Also note that a state Domicile Certificate is mandatory for all applicants under this state quota scheme.</p>
  `;
  return pageLayout({ title: 'Eligibility Guidelines', content, variant });
}

export function renderDocumentsPage(variant) {
  const isDefective = variant === 'defective';

  // Defect 2: Domicile Certificate missing from checklist (despite mentioned in guidelines)
  // Defect 5: Scattered requirement part 2 (Caste Certificate only here)
  const checklist = isDefective
    ? `<ul>
        <li><strong>Caste Certificate verified by sub-divisional magistrate is required</strong> to claim category benefits.</li>
        <li>Academic mark sheets of the qualifying examination.</li>
        <li>Recent passport-size colored photographs.</li>
      </ul>
      <p><em>Notice: Domicile certificate specification is currently not listed here.</em></p>`
    : `<h3>Consolidated Mandatory Documents Checklist</h3>
      <ul>
        <li><strong>Income Certificate issued by Tehsildar is required</strong> with family income below 2.5 lakh.</li>
        <li><strong>Caste Certificate verified by sub-divisional magistrate is required</strong> for SC/ST/OBC applicants.</li>
        <li><strong>Bank Passbook with Aadhaar linkage is required</strong> for direct DBT transfer.</li>
        <li>State Domicile Certificate issued by authorized revenue authority.</li>
      </ul>`;

  const content = `
    <h2>Required Documents Checklist</h2>
    <p>Applicants must upload clear scanned copies of all required certificates. Submitting invalid documents will lead to disqualification.</p>
    ${checklist}
  `;
  return pageLayout({ title: 'Documents Checklist', content, variant });
}

export function renderFaqPage(variant) {
  const isDefective = variant === 'defective';

  // Defect 1: Age is stated as 18-60 here (conflicting with 18-45 on guidelines)
  const faqAge = isDefective
    ? 'Applicants must be between 18 and 60 years of age at the time of application.'
    : 'Applicants must be between 18 and 45 years of age at the time of application.';

  // Defect 5: Scattered requirement part 3 (Bank Passbook only here)
  const bankProof = isDefective
    ? '<p><strong>Bank Passbook with Aadhaar linkage is required</strong> to disburse the scholarship amount via DBT.</p>'
    : '<p>All scholarship disbursements are deposited directly to your bank account via Aadhaar-linked DBT as stated on the checklist.</p>';

  const content = `
    <h2>Frequently Asked Questions (FAQs)</h2>

    <h3>Q: What is the age limit for applicants?</h3>
    <p>A: <strong>${faqAge}</strong></p>

    <h3>Q: How is the scholarship disbursed?</h3>
    <p>A: ${bankProof}</p>

    <h3>Q: What is the application fee?</h3>
    <p>A: No application fee is charged from any candidate applying for this national scheme.</p>
  `;
  return pageLayout({ title: 'FAQs', content, variant });
}

export function renderHostelPage(variant) {
  // Look-alike decoy (Children's hostel age 6-14 vs applicant age 18-45)
  const content = `
    <h2>Associated Welfare Hostel Accommodation Rules</h2>
    <p>This section provides information solely for beneficiaries seeking residential hostel accommodation affiliated with educational institutions.</p>

    <h3>Hostel Admission Age:</h3>
    <p><strong>Children admitted to the associated welfare hostel must be between 6 and 14 years of age.</strong></p>
    <p>Note: This rule applies exclusively to minor dependents and hostel inmates, not to the primary scholarship applicant.</p>
  `;
  return pageLayout({ title: 'Hostel Accommodation Guidelines', content, variant });
}

export function renderSpecialIncentivePage(variant) {
  // Defect 6: Missing deadline case (no deadline keywords, no dates)
  const content = `
    <h2>Special Incentive Grant for Meritorious Students</h2>
    <p>Students who secure over 85% marks in their board examinations are eligible for an additional special incentive grant.</p>
    <p>Application instructions: Contact the institutional nodal officer at your university to apply. Merit awards are evaluated on an ongoing basis throughout the academic cycle.</p>
  `;
  return pageLayout({ title: 'Special Incentive Scheme', content, variant });
}

export function renderApplyPage(variant) {
  if (variant === 'defective') {
    // Defect 4: Broken application link (HTTP 404)
    return null; // Signals server to return 404
  }

  const content = `
    <h2>Online Scholarship Application Form</h2>
    <p>Welcome to the official online application portal. Please ensure you have your Aadhaar number and academic documents ready.</p>
    <p><strong>Application submission is currently open and active.</strong></p>
  `;
  return pageLayout({ title: 'Apply Online', content, variant });
}
