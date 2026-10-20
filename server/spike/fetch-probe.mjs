/**
 * Diagnostic probe for TinyFish Fetch on myScheme scheme pages.
 *
 * Tests only options documented at:
 *   https://docs.tinyfish.ai/fetch-api/reference
 *
 * Usage:
 *   TINYFISH_API_KEY must be set in the environment or in server/.env
 *     (never commit .env; this script never prints the key).
 *   node server/spike/fetch-probe.mjs
 *
 * Writes sanitized JSON to server/spike/spike-output/fetch/
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(__dirname, "..");
const repoRoot = join(serverRoot, "..");
const outputDir = join(__dirname, "spike-output", "fetch");

loadEnv({ path: join(serverRoot, ".env"), quiet: true });
loadEnv({ path: join(repoRoot, ".env"), quiet: true });

const FETCH_ENDPOINT = "https://api.fetch.tinyfish.ai";
const CLIENT_TIMEOUT_MS = 150_000;
const API_KEY = process.env.TINYFISH_API_KEY?.trim() ?? "";

const TARGET_URLS = [
  "https://www.myscheme.gov.in/schemes/rtif",
  "https://www.myscheme.gov.in/schemes/pm-vikas",
];

const FOOTER_MARKERS = [
  "Get in touch",
  "Electronics Niketan",
  "support-myscheme",
  "6 CGO Complex",
  "Lodhi Road",
];

const SCHEME_MARKERS = [
  "eligibility",
  "benefits",
  "documents required",
  "how to apply",
  "pm vikas",
  "pm-vikas",
  "rtif",
  "rural talent",
  "scheme details",
  "application process",
];

const VARIANTS = [
  {
    id: "default",
    note: "Documented default: markdown format, ttl omitted (any cached entry is acceptable).",
    body: {},
  },
  {
    id: "ttl-0",
    note: "Documented live-fetch preference: ttl 0.",
    body: { ttl: 0 },
  },
  {
    id: "include-selectors",
    note: "Documented CSS scoping; bypasses automatic boilerplate removal. Tag selectors from the official reference.",
    body: {
      ttl: 0,
      include_selectors: ["main", "article", '[role="main"]'],
    },
  },
  {
    id: "html-format",
    note: "Documented format=html for semantic HTML instead of markdown.",
    body: { format: "html", ttl: 0 },
  },
  {
    id: "increased-timeout",
    note: "Documented per_url_timeout_ms max is 110000. Client wait is 150s per TinyFish CDN guidance.",
    body: { ttl: 0, per_url_timeout_ms: 110000 },
  },
  {
    id: "D_json_ttl0",
    note: "Documented format=json (structured document tree) with ttl 0 live-fetch preference.",
    body: { format: "json", ttl: 0 },
  },
  {
    id: "G_links_iframes",
    note: "Documented links + iframe_links to list page hyperlinks and iframe src URLs. Iframes injected only by JavaScript appear after browser rendering, which this probe does not do.",
    body: { ttl: 0, links: true, iframe_links: true },
  },
];

function outputPath(variantId) {
  return join(outputDir, `${variantId}.json`);
}

function isValidSavedResult(payload) {
  if (!payload || payload.http_status !== 200 || !payload.body) {
    return false;
  }
  return Array.isArray(payload.body.results) || Array.isArray(payload.body.errors);
}

async function loadSavedPayload(variantId) {
  try {
    const parsed = JSON.parse(await readFile(outputPath(variantId), "utf8"));
    return isValidSavedResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function redactSecrets(value) {
  if (typeof value === "string") {
    let next = value;
    if (API_KEY) {
      next = next.split(API_KEY).join("[redacted]");
    }
    next = next.replace(
      /(?:api[_-]?key|x-api-key|bearer)\s*[:=]\s*["']?[^\s"'\\]+/gi,
      "[redacted]"
    );
    return next;
  }
  if (Array.isArray(value)) {
    return value.map(redactSecrets);
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      if (/authorization|api[_-]?key|x-api-key|secret|token|password/i.test(key)) {
        out[key] = "[redacted]";
      } else {
        out[key] = redactSecrets(nested);
      }
    }
    return out;
  }
  return value;
}

function analyzeText(text) {
  if (text == null) {
    return {
      present: false,
      type: "null",
      length: 0,
      footer_marker_hits: [],
      scheme_marker_hits: [],
      likely_footer_only: false,
      preview: null,
    };
  }

  const serialized = typeof text === "string" ? text : JSON.stringify(text, null, 2);
  const lower = serialized.toLowerCase();
  const footerHits = FOOTER_MARKERS.filter((marker) =>
    lower.includes(marker.toLowerCase())
  );
  const schemeHits = SCHEME_MARKERS.filter((marker) => lower.includes(marker));

  return {
    present: true,
    type: typeof text,
    length: serialized.length,
    footer_marker_hits: footerHits,
    scheme_marker_hits: schemeHits,
    likely_footer_only:
      footerHits.length >= 2 && serialized.length < 2000 && schemeHits.length === 0,
    preview: serialized.slice(0, 1200),
  };
}

function summarizePayload(payload) {
  return {
    http_status: payload.http_status,
    ok: payload.ok,
    duration_ms: payload.duration_ms,
    error: payload.error ?? null,
    results: (payload.body?.results ?? []).map((result) => ({
      url: result.url,
      final_url: result.final_url ?? null,
      title: result.title ?? null,
      description: result.description ?? null,
      language: result.language ?? null,
      format: result.format ?? null,
      latency_ms: result.latency_ms ?? null,
      unmatched_selectors: result.unmatched_selectors ?? null,
      links_count: Array.isArray(result.links) ? result.links.length : null,
      iframe_links_count: Array.isArray(result.iframe_links)
        ? result.iframe_links.length
        : null,
      iframe_links: result.iframe_links ?? null,
      links: result.links ?? null,
      text: analyzeText(result.text),
    })),
    errors: payload.body?.errors ?? payload.body?.error ?? [],
  };
}

async function fetchVariant(variant) {
  const requestBody = { urls: TARGET_URLS, ...variant.body };
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const response = await fetch(FETCH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    const rawText = await response.text();
    let parsed = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { unparsed_text: rawText.slice(0, 4000) };
    }

    return redactSecrets({
      variant: variant.id,
      note: variant.note,
      request: requestBody,
      http_status: response.status,
      ok: response.ok,
      duration_ms: Date.now() - started,
      body: parsed,
    });
  } catch (error) {
    return redactSecrets({
      variant: variant.id,
      note: variant.note,
      request: requestBody,
      http_status: null,
      ok: false,
      duration_ms: Date.now() - started,
      error: error instanceof Error ? error.name + ": " + error.message : String(error),
      body: null,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const ranAt = new Date().toISOString();

  if (!API_KEY) {
    const skipped = {
      ran_at: ranAt,
      skipped: true,
      reason:
        "TINYFISH_API_KEY is not set in the environment or server/.env. Live Fetch tests were not sent.",
      endpoint: FETCH_ENDPOINT,
      urls: TARGET_URLS,
      planned_variants: VARIANTS.map((variant) => ({
        id: variant.id,
        note: variant.note,
        body: variant.body,
      })),
    };
    await writeFile(
      join(outputDir, "skipped.json"),
      JSON.stringify(skipped, null, 2) + "\n"
    );
    console.log(
      "TINYFISH_API_KEY is not configured locally. Skipping live TinyFish Fetch tests."
    );
    console.log(`Wrote ${join(outputDir, "skipped.json")}`);
    return;
  }

  const summary = {
    ran_at: ranAt,
    skipped: false,
    endpoint: FETCH_ENDPOINT,
    urls: TARGET_URLS,
    variants: [],
  };

  const pending = [];
  for (const variant of VARIANTS) {
    const saved = await loadSavedPayload(variant.id);
    if (!saved) {
      pending.push(variant.id);
    }
  }
  console.log(
    `Pending live Fetch requests: ${pending.length} (${TARGET_URLS.length} URLs each). Skipping ${VARIANTS.length - pending.length} variant(s) with valid saved results.`
  );

  for (const variant of VARIANTS) {
    const fileName = `${variant.id}.json`;
    const saved = await loadSavedPayload(variant.id);
    let payload = saved;
    if (payload) {
      console.log(`Skipping variant: ${variant.id} (valid saved result)`);
    } else {
      console.log(`Running variant: ${variant.id}`);
      payload = await fetchVariant(variant);
      await writeFile(join(outputDir, fileName), JSON.stringify(payload, null, 2) + "\n");
    }

    const variantSummary = {
      id: variant.id,
      note: variant.note,
      file: fileName,
      ...summarizePayload(payload),
    };
    summary.variants.push(variantSummary);

    const footerOnlyCount = variantSummary.results.filter(
      (result) => result.text.likely_footer_only
    ).length;
    console.log(
      `  http=${variantSummary.http_status} duration_ms=${variantSummary.duration_ms} results=${variantSummary.results.length} errors=${Array.isArray(variantSummary.errors) ? variantSummary.errors.length : "n/a"} footer_only=${footerOnlyCount}`
    );
  }

  await writeFile(join(outputDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
  console.log(`Wrote sanitized results to ${outputDir}`);
}

await main();
