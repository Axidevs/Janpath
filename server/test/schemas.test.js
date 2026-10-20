/**
 * server/test/schemas.test.js
 *
 * Unit tests for:
 * 1. Zod schemas in shared/schemas.js
 * 2. TinyFish JSON output schema constraints in server/src/tinyfish/outputSchema.js
 * 3. Validation of shared/sample-audit.json dev sample
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AgentResultSchema,
  AuditSchema,
  CreateAuditRequestSchema,
  CompareQuerySchema,
  ApiErrorSchema
} from '../../shared/schemas.js';
import { tinyfishOutputSchema } from '../src/tinyfish/outputSchema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Recursively collect all object keys in a JSON Schema tree
function collectSchemaKeys(schema, keys = new Set()) {
  if (!schema || typeof schema !== 'object') return keys;
  if (Array.isArray(schema)) {
    for (const item of schema) {
      collectSchemaKeys(item, keys);
    }
    return keys;
  }
  for (const [key, value] of Object.entries(schema)) {
    keys.add(key);
    if (typeof value === 'object' && value !== null) {
      collectSchemaKeys(value, keys);
    }
  }
  return keys;
}

describe('TinyFish Output Schema Keywords Compliance', () => {
  const ALLOWED_KEYWORDS = new Set([
    'type',
    'properties',
    'required',
    'items',
    'enum',
    'nullable',
    'format',
    'anyOf',
    'minimum',
    'maximum',
    'minLength',
    'maxLength',
    'minItems',
    'maxItems',
    'propertyOrdering'
  ]);

  const FORBIDDEN_KEYWORDS = [
    'additionalProperties',
    'const',
    'oneOf',
    '$schema',
    '$ref',
    'definitions',
    '$defs'
  ];

  test('top level must be an object type', () => {
    assert.equal(tinyfishOutputSchema.type, 'object');
    assert.ok(Array.isArray(tinyfishOutputSchema.required));
    assert.equal(typeof tinyfishOutputSchema.properties, 'object');
  });

  test('contains NO forbidden keywords anywhere in schema tree', () => {
    const allKeys = collectSchemaKeys(tinyfishOutputSchema);
    for (const forbidden of FORBIDDEN_KEYWORDS) {
      assert.ok(
        !allKeys.has(forbidden),
        `Schema contains forbidden TinyFish keyword: "${forbidden}"`
      );
    }
  });

  test('every structural keyword used is within the documented TinyFish allowed set', () => {
    // Collect keys excluding property names defined under "properties"
    function verifyAllowed(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(verifyAllowed);
        return;
      }
      for (const [key, val] of Object.entries(node)) {
        assert.ok(
          ALLOWED_KEYWORDS.has(key),
          `Found undocumented or disallowed keyword: "${key}"`
        );
        if (key === 'properties') {
          // values of properties are child schemas
          for (const childSchema of Object.values(val)) {
            verifyAllowed(childSchema);
          }
        } else if (typeof val === 'object' && val !== null && key !== 'enum') {
          verifyAllowed(val);
        }
      }
    }
    verifyAllowed(tinyfishOutputSchema);
  });
});

describe('Zod Schemas', () => {
  test('positive: parses valid agent result', () => {
    const valid = {
      steps: [
        {
          step_key: 'eligibility',
          status_claimed: 'found',
          summary: 'Age must be 18-25'
        }
      ],
      facts: [
        {
          kind: 'age_min',
          value: '18',
          url: 'https://scholarships.gov.in/rules',
          verbatim_quote: 'Applicants must have completed 18 years of age.'
        }
      ],
      pages_visited: ['https://scholarships.gov.in/rules'],
      click_path: ['Loaded portal', 'Clicked rules'],
      limitations: null
    };

    const parsed = AgentResultSchema.parse(valid);
    assert.equal(parsed.steps[0].step_key, 'eligibility');
    assert.equal(parsed.facts[0].kind, 'age_min');
  });

  test('negative: rejects agent result with invalid step_key or missing fields', () => {
    const invalidStep = {
      steps: [
        {
          step_key: 'invalid_custom_step', // not in enum
          status_claimed: 'found',
          summary: 'Some summary'
        }
      ],
      facts: [],
      pages_visited: [],
      click_path: [],
      limitations: null
    };

    assert.throws(() => AgentResultSchema.parse(invalidStep));
  });

  test('negative: rejects fact with non-url string', () => {
    const invalidUrlFact = {
      steps: [],
      facts: [
        {
          kind: 'age_min',
          value: '18',
          url: 'not-a-valid-url',
          verbatim_quote: 'valid quote text'
        }
      ],
      pages_visited: [],
      click_path: [],
      limitations: null
    };

    assert.throws(() => AgentResultSchema.parse(invalidUrlFact));
  });

  test('positive & negative: API request schemas', () => {
    // Valid audit creation
    const validReq = CreateAuditRequestSchema.parse({
      startUrl: 'https://scholarships.gov.in/apply'
    });
    assert.equal(validReq.startUrl, 'https://scholarships.gov.in/apply');

    // Invalid audit creation (malformed URL)
    assert.throws(() =>
      CreateAuditRequestSchema.parse({ startUrl: 'ftp://invalid-url' })
    );

    // Compare schema
    const validCompare = CompareQuerySchema.parse({
      base: 'audit-001',
      target: 'audit-002'
    });
    assert.equal(validCompare.base, 'audit-001');

    assert.throws(() => CompareQuerySchema.parse({ base: '' }));
  });
});

describe('Dev Sample Audit Data (shared/sample-audit.json)', () => {
  const samplePath = path.resolve(__dirname, '../../shared/sample-audit.json');
  const sampleRaw = fs.readFileSync(samplePath, 'utf8');
  const sampleData = JSON.parse(sampleRaw);

  test('sample file exists and is clearly marked as dev sample', () => {
    assert.equal(sampleData.isDevSample, true);
    assert.ok(sampleData.devSampleNotice.includes('dev sample, not real data'));
  });

  test('sample rawResult validates against AgentResultSchema', () => {
    const parsedRaw = AgentResultSchema.parse(sampleData.rawResult);
    assert.ok(parsedRaw.steps.length > 0);
    assert.ok(parsedRaw.facts.length > 0);
  });

  test('entire sample audit validates against AuditSchema', () => {
    const parsedAudit = AuditSchema.parse(sampleData);
    assert.equal(parsedAudit._id, 'audit-sample-dev-001');
    assert.equal(parsedAudit.status, 'COMPLETED');
    assert.ok(parsedAudit.findings.length > 0);
    assert.ok(parsedAudit.issues.length > 0);
  });
});
