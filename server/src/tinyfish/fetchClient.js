/**
 * server/src/tinyfish/fetchClient.js
 *
 * Official TinyFish Fetch API Client.
 *
 * OFFICIAL SPECIFICATION & CONSTRAINTS:
 * - Endpoint: POST https://api.fetch.tinyfish.ai
 * - Batches of up to 10 URLs per request.
 * - Always send ttl: 0 so cached copies never mask live website updates.
 * - Format: 'text'
 * - Per-URL errors appear in errors[] alongside HTTP 200.
 * - Computes cryptographic SHA-256 hash for every retrieved page text.
 * - Designed with a pluggable retriever interface.
 */

import crypto from 'node:crypto';

const DEFAULT_FETCH_BASE_URL = 'https://api.fetch.tinyfish.ai';
const MAX_BATCH_SIZE = 10;

/**
 * Computes deterministic SHA-256 hex digest of string content.
 * @param {string} text
 * @returns {string}
 */
export function computeSha256(text) {
  return crypto.createHash('sha256').update(text || '', 'utf8').digest('hex');
}

/**
 * Chunks array into sub-arrays of at most chunkSize.
 */
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export function createFetchClient(options = {}) {
  const apiKey = options.apiKey || '';
  const baseUrl = options.baseUrl || DEFAULT_FETCH_BASE_URL;
  const fetchFn = options.fetchFn || globalThis.fetch;

  return {
    /**
     * Retrieves pages in batches of up to 10 with ttl: 0.
     *
     * @param {string[]} urls - List of URLs to fetch
     * @returns {Promise<Map<string, { url: string, text: string, charCount: number, hash: string, status: number, error: any }>>}
     */
    async fetchUrls(urls = []) {
      const resultsMap = new Map();
      const uniqueUrls = Array.from(new Set(urls.filter((u) => typeof u === 'string' && u.trim().length > 0)));

      if (uniqueUrls.length === 0) {
        return resultsMap;
      }

      const batches = chunkArray(uniqueUrls, MAX_BATCH_SIZE);

      for (const batch of batches) {
        try {
          const response = await fetchFn(baseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': apiKey
            },
            body: JSON.stringify({
              urls: batch,
              ttl: 0, // Mandatory: never cache for verification
              format: 'text'
            })
          });

          if (!response.ok) {
            const errBody = await response.text();
            for (const url of batch) {
              resultsMap.set(url, {
                url,
                text: '',
                charCount: 0,
                hash: '',
                status: response.status,
                error: `Fetch API HTTP ${response.status}: ${errBody}`
              });
            }
            continue;
          }

          const data = await response.json();

          // Handle per-URL results
          const returnedResults = data.results || (Array.isArray(data) ? data : []);
          const returnedErrors = data.errors || [];

          const errorMap = new Map();
          for (const err of returnedErrors) {
            if (err.url) errorMap.set(err.url, err);
          }

          const resultMap = new Map();
          for (const res of returnedResults) {
            if (res.url) resultMap.set(res.url, res);
          }

          for (const url of batch) {
            if (errorMap.has(url)) {
              const err = errorMap.get(url);
              resultsMap.set(url, {
                url,
                text: '',
                charCount: 0,
                hash: '',
                status: err.status || 500,
                error: err.error || err.message || 'Page retrieval error'
              });
            } else if (resultMap.has(url)) {
              const res = resultMap.get(url);
              const text = res.text || res.content || '';
              resultsMap.set(url, {
                url,
                text,
                charCount: text.length,
                hash: computeSha256(text),
                status: res.status || 200,
                error: null
              });
            } else {
              resultsMap.set(url, {
                url,
                text: '',
                charCount: 0,
                hash: '',
                status: 404,
                error: 'URL not returned by Fetch API'
              });
            }
          }
        } catch (netErr) {
          for (const url of batch) {
            resultsMap.set(url, {
              url,
              text: '',
              charCount: 0,
              hash: '',
              status: 500,
              error: netErr.message || 'Network error contacting Fetch API'
            });
          }
        }
      }

      return resultsMap;
    }
  };
}
