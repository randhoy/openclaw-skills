// Meta Threads HTTP client helper
//
// This module centralizes all HTTP/Graph-API specific behavior for
// talking to the Meta Threads Graph API. The goal is to keep the
// adapter (src/adapter/metaThreads.js) free from transport details
// and make it easy to adjust URLs/parameters later.
//
// NOTE: The exact Threads Graph API paths and fields are still
// evolving. This implementation intentionally keeps them
// configurable and marks places that may need adjustment.

import https from "node:https";
import { URL } from "node:url";

const DEFAULT_BASE_URL = "https://graph.threads.net"; // TODO: confirm official base URL

/**
 * Default low-level HTTPS transport.
 *
 * It performs a single request and returns a small, non-sensitive
 * response object. It never logs or exposes headers, and the caller
 * is responsible for interpreting the body.
 *
 * @param {Object} options
 * @param {string} options.method
 * @param {string} options.url - fully qualified URL
 * @param {Object} [options.headers]
 * @param {string|Buffer|undefined} [options.body]
 * @returns {Promise<{ status: number, body: string }>}
 */
async function realHttpsTransport({ method, url, headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    const requestOptions = {
      method,
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      headers,
    };

    const req = https.request(requestOptions, (res) => {
      const chunks = [];

      res.on("data", (chunk) => {
        chunks.push(chunk);
      });

      res.on("end", () => {
        const bodyStr = Buffer.concat(chunks).toString("utf8");
        resolve({
          status: res.statusCode || 0,
          body: bodyStr,
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (body != null) {
      req.write(body);
    }

    req.end();
  });
}

// Mutable reference so tests can override the low-level transport
// without making any real network calls.
let currentTransport = realHttpsTransport;

/**
 * Testing helper: override the low-level HTTPS transport.
 *
 * NEVER use this in production code; it is exported only so that
 * tests can inject a mock implementation that avoids real HTTP.
 *
 * @param {Function} fn
 */
export function __setTransportForTesting(fn) {
  currentTransport = typeof fn === "function" ? fn : realHttpsTransport;
}

/**
 * Testing helper: reset the transport back to the real HTTPS
 * implementation.
 */
export function __resetTransportForTesting() {
  currentTransport = realHttpsTransport;
}

/**
 * Build the URL and body for creating a Threads post.
 *
 * This keeps all Meta-specific details in one place so it is easy
 * to adjust later.
 *
 * @param {Object} params
 * @param {Object} params.config - loaded Threads config
 * @param {Object} params.payload - normalized payload from validation
 * @param {string} [params.baseUrl]
 * @returns {{ url: string, method: string, headers: Object, body: string }}
 */
export function buildCreateThreadRequest({ config, payload, baseUrl = DEFAULT_BASE_URL }) {
  const { accessToken, accountId } = config;
  const { text } = payload;

  // TODO: Confirm the exact path, query params and body fields for the
  // Threads Graph API. This currently assumes a JSON POST payload to a
  // placeholder endpoint.
  const url = new URL("/v1.0/threads", baseUrl);

  const bodyObj = {
    // TODO: adjust field names to match the real API contract.
    account_id: accountId,
    message: text,
    access_token: accessToken,
  };

  const body = JSON.stringify(bodyObj);

  const headers = {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body).toString(),
  };

  return {
    url: url.toString(),
    method: "POST",
    headers,
    body,
  };
}

/**
 * Create a high-level HTTP client for Meta Threads.
 *
 * The returned function matches the adapter's expected signature:
 *   async httpClient({ config, payload }) => { id, permalink? }
 *
 * @param {Object} [options]
 * @param {string} [options.baseUrl]
 * @returns {Function}
 */
export function createMetaThreadsHttpClient(options = {}) {
  const { baseUrl = DEFAULT_BASE_URL } = options;

  return async function metaThreadsHttpClient({ config, payload }) {
    const { url, method, headers, body } = buildCreateThreadRequest({
      config,
      payload,
      baseUrl,
    });

    let response;
    try {
      response = await currentTransport({ method, url, headers, body });
    } catch (err) {
      const message =
        err && typeof err.message === "string"
          ? err.message
          : "Unknown network error";
      const error = new Error(`Threads API request failed: ${message}`);
      error.code = "NETWORK_ERROR";
      throw error;
    }

    const status = response.status || 0;
    const rawBody = response.body || "";

    // Do not expose raw body in error messages; it might contain
    // sensitive details. Only include high-level status info.
    if (status < 200 || status >= 300) {
      const error = new Error(`Threads API request failed with status ${status}`);
      error.code = "HTTP_ERROR";
      error.status = status;
      throw error;
    }

    let parsed;
    try {
      parsed = rawBody ? JSON.parse(rawBody) : {};
    } catch (_ignored) {
      const error = new Error("Threads API returned a non-JSON response");
      error.code = "PARSE_ERROR";
      throw error;
    }

    // The exact fields are subject to the real API; for now, we
    // normalize into { id, permalink? }.
    const id = typeof parsed.id === "string" ? parsed.id : null;
    const permalink = typeof parsed.permalink === "string" ? parsed.permalink : null;

    if (!id) {
      const error = new Error("Threads API response missing required 'id' field");
      error.code = "RESPONSE_ERROR";
      throw error;
    }

    return { id, permalink };
  };
}

export const __DEFAULT_BASE_URL = DEFAULT_BASE_URL;

