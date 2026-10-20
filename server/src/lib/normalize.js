/**
 * server/src/lib/normalize.js
 *
 * Deterministic text normalizer for JanPath verifier and rules engine.
 * Unifies quotes, dashes, whitespace, markdown, and unicode across both
 * agent-reported quotes and retrieved page contents.
 */

/**
 * Normalizes text for reliable substring matching.
 *
 * Steps:
 * 1. Convert to string and handle null/undefined
 * 2. Unicode NFKC normalization
 * 3. Lowercase
 * 4. Unify curly quotes and apostrophes to standard ASCII ' and "
 * 5. Unify en dash, em dash, minus sign to standard hyphen -
 * 6. Strip common markdown artifacts (pipes, bold/italics, headers, links)
 * 7. Collapse all unicode whitespace and non-breaking spaces into single spaces
 * 8. Trim ends
 *
 * @param {string} text - Raw text to normalize
 * @returns {string} Normalized text
 */
export function normalizeText(text) {
  if (typeof text !== 'string') {
    return '';
  }

  let normalized = text
    .normalize('NFKC')
    .toLowerCase();

  // Unify single curly quotes and prime symbols to standard apostrophe
  normalized = normalized.replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'");

  // Unify double curly quotes to standard double quote
  normalized = normalized.replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"');

  // Unify dashes (figure dash, en dash, em dash, horizontal bar, unicode minus) to ASCII hyphen
  normalized = normalized.replace(/[\u2012\u2013\u2014\u2015\u2212]/g, '-');

  // Strip markdown link and image syntax, preserving the visible label/alt text
  normalized = normalized.replace(/!\[([^\]]*)\]\([^)]*\)/g, ' $1 ');
  normalized = normalized.replace(/\[([^\]]+)\]\([^)]*\)/g, ' $1 ');

  // Strip markdown headings (e.g. #, ##)
  normalized = normalized.replace(/(?:^|\n)\s*#{1,6}\s+/g, ' ');
  normalized = normalized.replace(/#/g, ' ');

  // Strip markdown table pipes, replacing with space to prevent words joining
  normalized = normalized.replace(/\|/g, ' ');

  // Strip markdown emphasis asterisks and underscores
  normalized = normalized.replace(/[*_]{1,3}/g, '');

  // Strip markdown list markers at beginning of lines
  normalized = normalized.replace(/(?:^|\n)\s*[-*+]\s+/g, ' ');
  normalized = normalized.replace(/(?:^|\n)\s*\d+\.\s+/g, ' ');

  // Replace unicode non-breaking spaces and tabs with standard space
  normalized = normalized.replace(/[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\t\r\n]/g, ' ');

  // Collapse consecutive whitespace to single space and trim
  return normalized.replace(/\s+/g, ' ').trim();
}
