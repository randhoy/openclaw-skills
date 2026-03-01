import test from 'node:test';
import assert from 'node:assert/strict';
import { ThreadsClient } from '../src/threadsClient.js';

function createMockTransport(responses = {}) {
  const calls = [];
  return {
    calls,
    async request(method, url, options = {}) {
      calls.push({ method, url, options });
      if (url.includes('/threads_publish')) {
        return responses.publish || { id: 'published-123' };
      }
      return responses.create || { id: 'container-123' };
    },
  };
}

const basePayload = {
  mode: 'now',
  media_type: 'TEXT',
  text: 'hello world',
};

const clientOptions = (transport) => ({
  accessToken: 'test-token',
  userId: 'user-1',
  transport,
  graphBaseUrl: 'https://graph.threads.test',
});


test('ThreadsClient dryRun returns mapping without HTTP calls', async () => {
  const transport = createMockTransport();
  const client = new ThreadsClient(clientOptions(transport));

  const result = await client.publish(basePayload, { dryRun: true });

  assert.equal(result.dryRun, true);
  assert.equal(transport.calls.length, 0);
  assert.equal(result.endpoint, '/user-1/threads');
  assert.equal(result.threadParams.text, 'hello world');
  assert.equal(result.publishParams.endpoint, '/user-1/threads_publish');
});


test('ThreadsClient now TEXT post makes two HTTP calls', async () => {
  const transport = createMockTransport();
  const client = new ThreadsClient(clientOptions(transport));

  const result = await client.publish(basePayload, { dryRun: false });

  assert.equal(result.dryRun, false);
  assert.equal(transport.calls.length, 2);

  const [createCall, publishCall] = transport.calls;
  assert.match(createCall.url, /https:\/\/graph\.threads\.test\/user-1\/threads$/);
  assert.match(publishCall.url, /https:\/\/graph\.threads\.test\/user-1\/threads_publish$/);
});


test('ThreadsClient reply uses /me/threads', async () => {
  const transport = createMockTransport();
  const client = new ThreadsClient(clientOptions(transport));

  const payload = {
    ...basePayload,
    mode: 'reply',
    reply_to_id: '123',
  };

  const dry = await client.publish(payload, { dryRun: true });
  assert.equal(dry.endpoint, '/me/threads');
  assert.equal(dry.threadParams.reply_to_id, '123');
});


test('ThreadsClient schedule maps scheduledAt', async () => {
  const transport = createMockTransport();
  const client = new ThreadsClient(clientOptions(transport));

  const payload = {
    ...basePayload,
    mode: 'schedule',
    scheduledAt: '1730000000',
  };

  const dry = await client.publish(payload, { dryRun: true });
  assert.equal(dry.threadParams.scheduled_publish_time, '1730000000');
});


test('ThreadsClient maps media types and attachments', async () => {
  const transport = createMockTransport();
  const client = new ThreadsClient(clientOptions(transport));

  const payload = {
    mode: 'now',
    media_type: 'IMAGE',
    text: 'with image',
    image_url: 'https://example.com/img.jpg',
    topic_tag: 'news',
    location_id: 'loc-1',
    is_spoiler_media: true,
    text_entities: [{ offset: 0, length: 4, type: 'bold' }],
    link_attachment: { url: 'https://example.com' },
    gif_attachment: { url: 'https://giphy.com/gif' },
  };

  const dry = await client.publish(payload, { dryRun: true });

  assert.equal(dry.threadParams.text, 'with image');
  assert.equal(dry.threadParams.image_url, 'https://example.com/img.jpg');
  assert.equal(dry.threadParams.topic_tag, 'news');
  assert.equal(dry.threadParams.location_id, 'loc-1');
  assert.equal(dry.threadParams.is_spoiler_media, 'true');
  assert.ok(dry.threadParams.text_formatting_entities);
  assert.ok(dry.threadParams.link_attachment);
  assert.ok(dry.threadParams.gif_attachment);
});
