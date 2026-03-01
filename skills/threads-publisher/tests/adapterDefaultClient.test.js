import test from "node:test";
import assert from "node:assert/strict";

import { ThreadsClient } from "../src/threadsClient.js";

// This test ensures that a ThreadsClient constructed with explicit
// accessToken/userId and a custom transport can publish in real mode
// without touching any global HTTP state.

test("ThreadsClient with custom transport performs two calls in real mode", async () => {
  const calls = [];

  const transport = {
    async request(method, url, options = {}) {
      calls.push({ method, url, body: options.body?.toString?.() ?? "" });

      if (calls.length === 1) {
        return { id: "container-123" };
      }
      return { id: "publish-456" };
    },
  };

  const client = new ThreadsClient({
    accessToken: "TEST_ACCESS_TOKEN",
    userId: "TEST_USER_ID",
    transport,
  });

  const result = await client.publish(
    {
      mode: "now",
      media_type: "TEXT",
      text: "Hello from adapter client",
    },
    { dryRun: false },
  );

  assert.equal(calls.length, 2);
  assert.ok(calls[0].url.includes("/TEST_USER_ID/threads"));
  assert.ok(calls[1].url.includes("/TEST_USER_ID/threads_publish"));

  assert.equal(result.dryRun, false);
  assert.deepEqual(result.container, { id: "container-123" });
  assert.deepEqual(result.publish, { id: "publish-456" });
});
