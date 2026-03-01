import test from "node:test";
import assert from "node:assert/strict";

import { run } from "../src/index.js";

function makeInput(overrides = {}) {
  return {
    accessToken: "TEST_ACCESS_TOKEN",
    userId: "TEST_USER_ID",
    dryRun: true,
    transport: {
      // In dryRun mode transport MUST NOT be called.
      request() {
        throw new Error("transport.request should not be called in dryRun mode");
      },
    },
    payload: {
      mode: "now",
      media_type: "TEXT",
      text: "Hello",
      ...overrides.payload,
    },
    ...overrides,
  };
}

test("valid now TEXT payload → dryRun mapping matches expected shape", async () => {
  const input = makeInput({
    payload: {
      mode: "now",
      media_type: "TEXT",
      text: "Hello",
      topic_tag: "openclaw",
      link_attachment: { url: "https://example.com" },
    },
  });

  const result = await run(input);

  assert.equal(result.dryRun, true);
  assert.equal(result.endpoint, "/TEST_USER_ID/threads");
  assert.equal(result.threadParams.access_token, "TEST_ACCESS_TOKEN");
  assert.equal(result.threadParams.text, "Hello");
  assert.equal(result.threadParams.topic_tag, "openclaw");
  assert.equal(
    result.threadParams.link_attachment,
    JSON.stringify({ url: "https://example.com" })
  );
  assert.equal(result.publishParams.endpoint, "/TEST_USER_ID/threads_publish");
  assert.equal(result.publishParams.body.access_token, "TEST_ACCESS_TOKEN");
});

test("schedule mode adds scheduled_publish_time to thread params", async () => {
  const scheduledAt = "1730000000";
  const input = makeInput({
    payload: {
      mode: "schedule",
      media_type: "TEXT",
      text: "Scheduled post",
      scheduledAt,
    },
  });

  const result = await run(input);

  assert.equal(result.dryRun, true);
  assert.equal(result.endpoint, "/TEST_USER_ID/threads");
  assert.equal(result.threadParams.scheduled_publish_time, scheduledAt);
});

test("reply mode targets /me/threads and includes reply_to_id", async () => {
  const input = makeInput({
    payload: {
      mode: "reply",
      media_type: "TEXT",
      text: "Replying here",
      reply_to_id: "1789",
    },
  });

  const result = await run(input);

  assert.equal(result.dryRun, true);
  assert.equal(result.endpoint, "/me/threads");
  assert.equal(result.threadParams.reply_to_id, "1789");
});
