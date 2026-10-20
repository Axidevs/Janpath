/**
 * server/src/lib/urlGuard.js
 *
 * Security guard for URL validation and domain allowlisting.
 *
 * CRITICAL SECURITY CONSTRAINTS:
 * 1. Allow http/https only.
 * 2. Allowlist *.gov.in, *.nic.in, *.ac.in, plus optional FIXTURE_HOST.
 * 3. Disallow credentials (username:password@host) in URLs.
 * 4. Reject IP literals (IPv4 and IPv6) and localhost (unless localhost is explicitly FIXTURE_HOST).
 */

const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

/**
 * Normalizes a hostname by lowercasing and stripping leading 'www.'
 * @param {string} host
 * @returns {string}
 */
export function normalizeHost(host) {
  if (!host || typeof host !== 'string') return '';
  let h = host.trim().toLowerCase();
  // Strip port if present
  if (h.includes(':') && !h.startsWith('[')) {
    h = h.split(':')[0];
  }
  if (h.startsWith('www.')) {
    h = h.slice(4);
  }
  return h;
}

/**
 * Checks if a normalized hostname is allowed.
 *
 * @param {string} rawHost - Host to evaluate
 * @param {string} [fixtureHost] - Optional fixture host from env
 * @returns {boolean}
 */
export function isHostAllowed(rawHost, fixtureHost) {
  const host = normalizeHost(rawHost);
  if (!host) return false;

  // Check fixture host override first (allows configured fixture host such as localhost or 127.0.0.1)
  if (fixtureHost) {
    const normFixture = normalizeHost(fixtureHost);
    if (normFixture && (host === normFixture || host.endsWith(`.${normFixture}`))) {
      return true;
    }
  }

  // Reject IPv4 literal
  if (IPV4_REGEX.test(host)) {
    return false;
  }

  // Reject IPv6 literal
  if (host.startsWith('[') || host.includes(':')) {
    return false;
  }

  // Reject localhost if not explicitly the fixture host
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return false;
  }

  // Allowed official Indian public sector suffixes
  if (host === 'gov.in' || host.endsWith('.gov.in')) {
    return true;
  }
  if (host === 'nic.in' || host.endsWith('.nic.in')) {
    return true;
  }
  if (host === 'ac.in' || host.endsWith('.ac.in')) {
    return true;
  }

  return false;
}

/**
 * Validates a full URL string against security boundaries.
 *
 * @param {string} urlStr - Raw input URL
 * @param {string} [fixtureHost] - Optional fixture host
 * @returns {{
 *   allowed: boolean,
 *   reason?: string,
 *   normalizedUrl?: string,
 *   hostname?: string
 * }}
 */
export function validateUrl(urlStr, fixtureHost) {
  if (!urlStr || typeof urlStr !== 'string') {
    return { allowed: false, reason: 'missing_url' };
  }

  let parsed;
  try {
    parsed = new URL(urlStr.trim());
  } catch {
    return { allowed: false, reason: 'malformed_url' };
  }

  // 1. Protocol check: http/https only
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      allowed: false,
      reason: `disallowed_protocol_${parsed.protocol.replace(':', '')}`
    };
  }

  // 2. Credentials check: disallow username / password in URL
  if (parsed.username || parsed.password) {
    return { allowed: false, reason: 'credentials_in_url' };
  }

  // 3. Domain allowlist and IP/localhost checks
  const rawHostname = parsed.hostname;
  if (!isHostAllowed(rawHostname, fixtureHost)) {
    return {
      allowed: false,
      reason: 'domain_not_allowlisted',
      hostname: rawHostname
    };
  }

  return {
    allowed: true,
    normalizedUrl: parsed.toString(),
    hostname: parsed.hostname
  };
}
