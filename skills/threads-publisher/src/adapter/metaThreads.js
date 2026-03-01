// Meta Threads adapter
//
// This module defines a small interface for publishing a thread/post to
// Meta Threads. The actual HTTP details are intentionally abstracted behind
// an injectable HTTP client so that real Graph API integration can be wired
// later without changing the skill's core logic.

import { createMetaThreadsHttpClient } from "../httpClient.js";

/**
 * @typedef {Object} PublishConfig
 * @property {string} appId
 * @property {string} appSecret
 * @property {string} accessToken
 * @property {string} accountId
 */

/**
 * @typedef {Object} NormalizedPayload
 * @property {string} profile
 * @property {"now"|"schedule"} mode
 * @property {string} text
 * @property {string[]} parts
 * @property {Array} media
 * @property {string|null} scheduledAt
 */

/**
 * @typedef {Object} PublishResult
 * @property {string} id
 * @property {string|null} permalink
 */

/**
 * Publish a thread/post to Meta Threads using an injectable HTTP client.
 *
 * In production, when no httpClient is provided, a default client
 * backed by the Meta Threads Graph API is used. In tests, callers can
 * inject a custom httpClient to avoid real network calls.
 *
 * @param {Object} params
 * @param {PublishConfig} params.config
 * @param {NormalizedPayload} params.payload
 * @param {Function} [params.httpClient] - Async HTTP client function. The concrete
 *   implementation is provided by the caller (tests or runtime) and is
 *   responsible for performing the actual network request.
 * @returns {Promise<PublishResult>}
 */
export async function publishThread({ config, payload, httpClient }) {
  const client = httpClient || createMetaThreadsHttpClient();

  // The exact shape of the request is delegated to the HTTP client.
  const response = await client({
    config,
    payload,
  });

  if (!response || typeof response !== "object") {
    const error = new Error("Adapter HTTP client returned an invalid response");
    error.code = "ADAPTER_ERROR";
    throw error;
  }

  const { id, permalink = null } = response;

  if (typeof id !== "string" || id.trim() === "") {
    const error = new Error("Adapter response must include a non-empty 'id'");
    error.code = "ADAPTER_ERROR";
    throw error;
  }

  return { id, permalink: typeof permalink === "string" ? permalink : null };
}

