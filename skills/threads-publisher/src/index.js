// Entry point for the Threads publishing skill.
// Exposes a single async `run` function that the skill runner can call.

import { ThreadsClient } from './threadsClient.js';

/**
 * @typedef {Object} SkillInput
 * @property {string} accessToken
 * @property {string} userId
 * @property {Object} payload - Normalized payload
 * @property {boolean} [dryRun]
 */

/**
 * Main entry point.
 * @param {SkillInput} input
 */
export async function run(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('input must be an object');
  }

  const { accessToken, userId, payload, dryRun = false, transport, graphBaseUrl } = input;

  if (!accessToken) throw new Error('accessToken is required');
  if (!userId) throw new Error('userId is required');
  if (!payload) throw new Error('payload is required');

  const client = new ThreadsClient({ accessToken, userId, transport, graphBaseUrl });

  const result = await client.publish(payload, { dryRun });
  return result;
}

export { ThreadsClient } from './threadsClient.js';
export { validateNormalizedPayload } from './validation.js';
