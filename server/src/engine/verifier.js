/**
 * server/src/engine/verifier.js
 *
 * Evidence Verification Engine for JanPath.
 * Independently verifies whether a verbatim quote exists in the text of a
 * retrieved page.
 *
 * CRITICAL BOUNDARY:
 * A SOURCE_MATCHED status proves ONLY that the quote was found in the retrieved text.
 * It does NOT prove the claim is true, current, complete, or applicable.
 */

import { EvidenceStatus } from '../../../shared/constants.js';
import { normalizeText } from '../lib/normalize.js';

const DEFAULT_MIN_QUOTE_CHARS = 15;
const DEFAULT_MIN_PAGE_CHARS = 300;
const DEFAULT_CONTEXT_PADDING = 60;

/**
 * Extracts and normalizes the hostname, stripping any leading 'www.'
 * @param {string} urlStr
 * @returns {string|null}
 */
function getNormalizedHost(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return null;
  try {
    const parsed = new URL(urlStr);
    let hostname = parsed.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }
    return hostname;
  } catch {
    return null;
  }
}

/**
 * Pure verification function.
 *
 * @param {Object|string} input - Input object or quote string
 * @param {string} [input.quote] - The claimed quote to verify
 * @param {Object} [input.retrievedPage] - Retrieved page object { url, text, status }
 * @param {Object|string|null} [input.fetchError] - Fetch error if retrieval failed
 * @param {string} [input.requestedUrl] - The URL that was requested
 * @param {Object} [input.options] - Configuration options
 * @param {number} [input.options.minQuoteChars=15] - Minimum normalized quote length
 * @param {number} [input.options.minPageChars=300] - Minimum raw page text length
 * @param {Function} [input.options.isHostAllowed] - Predicate (host: string) => boolean
 * @param {number} [input.options.contextPadding=60] - Characters of context around match
 * @returns {{
 *   status: string,
 *   reason: string,
 *   matchedSnippet: string|null,
 *   matchedContext: string|null,
 *   finalUrl: string|null,
 *   error?: any
 * }}
 */
export function verifyEvidence(input, retrievedPageArg, fetchErrorArg, requestedUrlArg, optionsArg) {
  // Support both object parameter and positional parameters
  let quote, retrievedPage, fetchError, requestedUrl, options;

  if (typeof input === 'object' && input !== null && !('text' in input && retrievedPageArg === undefined)) {
    quote = input.quote;
    retrievedPage = input.retrievedPage;
    fetchError = input.fetchError;
    requestedUrl = input.requestedUrl;
    options = input.options || {};
  } else {
    quote = input;
    retrievedPage = retrievedPageArg;
    fetchError = fetchErrorArg;
    requestedUrl = requestedUrlArg;
    options = optionsArg || {};
  }

  const minQuoteChars = options.minQuoteChars ?? DEFAULT_MIN_QUOTE_CHARS;
  const minPageChars = options.minPageChars ?? DEFAULT_MIN_PAGE_CHARS;
  const contextPadding = options.contextPadding ?? DEFAULT_CONTEXT_PADDING;
  const isHostAllowed = options.isHostAllowed;

  const finalUrl = retrievedPage?.url || requestedUrl || null;

  // 1. Guard against invalid quote input
  if (typeof quote !== 'string') {
    return {
      status: EvidenceStatus.COULD_NOT_VERIFY,
      reason: 'invalid_input',
      matchedSnippet: null,
      matchedContext: null,
      finalUrl
    };
  }

  // 2. Check for retrieval errors
  if (fetchError) {
    return {
      status: EvidenceStatus.COULD_NOT_VERIFY,
      reason: 'retrieval_error',
      matchedSnippet: null,
      matchedContext: null,
      finalUrl,
      error: fetchError
    };
  }

  // 3. Guard against missing retrieved page
  if (!retrievedPage || typeof retrievedPage !== 'object') {
    return {
      status: EvidenceStatus.COULD_NOT_VERIFY,
      reason: 'retrieval_error',
      matchedSnippet: null,
      matchedContext: null,
      finalUrl
    };
  }

  // If HTTP status is an error (e.g. 404, 500)
  if (typeof retrievedPage.status === 'number' && retrievedPage.status >= 400) {
    return {
      status: EvidenceStatus.COULD_NOT_VERIFY,
      reason: 'retrieval_error',
      matchedSnippet: null,
      matchedContext: null,
      finalUrl,
      httpStatus: retrievedPage.status
    };
  }

  // 4. Host redirect and scope checks
  if (requestedUrl && finalUrl) {
    const reqHost = getNormalizedHost(requestedUrl);
    const finHost = getNormalizedHost(finalUrl);

    if (!reqHost || !finHost) {
      return {
        status: EvidenceStatus.COULD_NOT_VERIFY,
        reason: 'invalid_url',
        matchedSnippet: null,
        matchedContext: null,
        finalUrl
      };
    }

    // If final host is different from requested host (ignoring "www.")
    if (reqHost !== finHost) {
      return {
        status: EvidenceStatus.COULD_NOT_VERIFY,
        reason: 'redirected_out_of_scope',
        matchedSnippet: null,
        matchedContext: null,
        finalUrl
      };
    }

    // If custom host validator is provided, check final host
    if (typeof isHostAllowed === 'function' && !isHostAllowed(finHost)) {
      return {
        status: EvidenceStatus.COULD_NOT_VERIFY,
        reason: 'redirected_out_of_scope',
        matchedSnippet: null,
        matchedContext: null,
        finalUrl
      };
    }
  }

  // 5. Page text length guard (e.g. JS-only site returning only footer or empty DOM)
  const rawPageText = typeof retrievedPage.text === 'string' ? retrievedPage.text : '';
  if (rawPageText.length < minPageChars) {
    return {
      status: EvidenceStatus.COULD_NOT_VERIFY,
      reason: 'insufficient_page_text',
      matchedSnippet: null,
      matchedContext: null,
      finalUrl
    };
  }

  // 6. Quote length check after normalization
  const normQuote = normalizeText(quote);
  if (normQuote.length < minQuoteChars) {
    return {
      status: EvidenceStatus.COULD_NOT_VERIFY,
      reason: 'quote_too_short',
      matchedSnippet: null,
      matchedContext: null,
      finalUrl
    };
  }

  // 7. Substring verification in normalized text
  const normPage = normalizeText(rawPageText);
  const matchIndex = normPage.indexOf(normQuote);

  if (matchIndex === -1) {
    return {
      status: EvidenceStatus.QUOTE_NOT_FOUND,
      reason: 'quote_not_in_text',
      matchedSnippet: null,
      matchedContext: null,
      finalUrl
    };
  }

  // 8. Extract context snippet around match
  const start = Math.max(0, matchIndex - contextPadding);
  const end = Math.min(normPage.length, matchIndex + normQuote.length + contextPadding);
  const snippet = `${start > 0 ? '... ' : ''}${normPage.slice(start, end)}${end < normPage.length ? ' ...' : ''}`;

  return {
    status: EvidenceStatus.SOURCE_MATCHED,
    reason: 'exact_or_normalized_match',
    matchedSnippet: snippet,
    matchedContext: snippet,
    finalUrl
  };
}
