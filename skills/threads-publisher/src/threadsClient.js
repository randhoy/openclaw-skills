// High-level client that maps normalized payloads to Threads Graph API calls.
// This intentionally mirrors the behavior of threads-publisher v1.

import { validateNormalizedPayload } from './validation.js';

/**
 * @typedef {Object} ThreadsClientOptions
 * @property {string} accessToken - Threads/Instagram Graph API access token.
 * @property {string} userId - Threads user id to post as.
 * @property {import('./transport.js').ThreadsTransport} transport - HTTP transport abstraction.
 * @property {string} [graphBaseUrl] - Base URL for the Graph API, default https://graph.threads.net
 */

export class ThreadsClient {
  constructor(options) {
    if (!options) throw new Error('ThreadsClient options are required');
    const { accessToken, userId, transport, graphBaseUrl } = options;
    if (!accessToken) throw new Error('accessToken is required');
    if (!userId) throw new Error('userId is required');
    if (!transport || typeof transport.request !== 'function') {
      throw new Error('transport with request(method, url, options) is required');
    }
    this.accessToken = accessToken;
    this.userId = userId;
    this.transport = transport;
    this.graphBaseUrl = graphBaseUrl || 'https://graph.threads.net';
  }

  buildUrl(path) {
    return `${this.graphBaseUrl.replace(/\/$/, '')}${path}`;
  }

  async publish(normalized, { dryRun = false } = {}) {
    const payload = validateNormalizedPayload(normalized);

    if (dryRun) {
      const { threadParams, publishParams, endpoint } = this._buildRequest(payload);
      return {
        dryRun: true,
        endpoint,
        threadParams,
        publishParams,
      };
    }

    const { endpoint, threadParams, publishParams } = this._buildRequest(payload);

    // Create container
    const createUrl = this.buildUrl(endpoint);
    const containerRes = await this.transport.request('POST', createUrl, {
      body: new URLSearchParams(threadParams),
    });

    const containerId = containerRes.id || containerRes.container_id;
    if (!containerId) {
      throw new Error('Invalid response from Threads API: missing container id');
    }

    // Publish container
    const publishUrl = this.buildUrl(publishParams.endpoint);
    const publishBody = new URLSearchParams({
      ...publishParams.body,
      creation_id: containerId,
    });

    const publishRes = await this.transport.request('POST', publishUrl, {
      body: publishBody,
    });

    return {
      dryRun: false,
      container: containerRes,
      publish: publishRes,
    };
  }

  _buildRequest(payload) {
    // Map normalized payload to Threads Graph API params.
    const common = {
      access_token: this.accessToken,
    };

    const threadParams = { ...common };

    if (payload.text) threadParams.text = payload.text;
    if (payload.topic_tag) threadParams.topic_tag = payload.topic_tag;
    if (payload.location_id) threadParams.location_id = payload.location_id;
    if (payload.is_spoiler_media) threadParams.is_spoiler_media = 'true';
    if (Array.isArray(payload.text_entities) && payload.text_entities.length > 0) {
      threadParams.text_formatting_entities = JSON.stringify(payload.text_entities);
    }

    if (payload.link_attachment) {
      threadParams.link_attachment = JSON.stringify(payload.link_attachment);
    }

    if (payload.gif_attachment) {
      threadParams.gif_attachment = JSON.stringify(payload.gif_attachment);
    }

    // Media mapping
    switch (payload.media_type) {
      case 'IMAGE':
        threadParams.image_url = payload.image_url;
        break;
      case 'VIDEO':
        threadParams.video_url = payload.video_url;
        break;
      case 'CAROUSEL':
        // For v1 we assume children already represent media URLs and types.
        threadParams.children = JSON.stringify(payload.children);
        break;
      case 'TEXT':
      default:
        break;
    }

    let endpoint = `/${this.userId}/threads`;

    if (payload.mode === 'reply') {
      endpoint = `/me/threads`;
      threadParams.reply_to_id = payload.reply_to_id;
    }

    if (payload.mode === 'schedule') {
      threadParams.scheduled_publish_time = payload.scheduledAt;
    }

    const publishParams = {
      endpoint: `/${this.userId}/threads_publish`,
      body: {
        access_token: this.accessToken,
      },
    };

    return { endpoint, threadParams, publishParams };
  }
}
