import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCreateThreadRequest,
  createMetaThreadsHttpClient,
  __setTransportForTesting,
  __resetTransportForTesting,
  __DEFAULT_BASE_URL,
} from "../src/httpClient.js";

const BASE_URL = "https://example.test";

function makeConfig() {
  return {
    appId: "app-id",
    appSecret: "app-secret",
    accessToken: "access-token",
    accountId: "account-id",
    dryRun: false,
    hasRequiredConfig: true,
  };
}

function makePayload() {
  return {
    profile: "main",
    mode: "now",
    text: "Hello from Threads",
    parts: [],
    media: [],
    scheduledAt: null,
  };
}

test("buildCreateThreadRequest constructs expected request", () => {
  const config = makeConfig();
  const payload = makePayload();

  const { url, method, headers, body } = buildCreateThreadRequest({
    config,
    payload,
    baseUrl: BASE_URL,
  });

  assert.equal(url, `${BASE_URL}/v1.0/threads`);
  assert.equal(method, "POST");
  assert.equal(headers["Content-Type"], "application/json");

  const parsedBody = JSON.parse(body);
  assert.equal(parsedBody.account_id, config.accountId);
  assert.equal(parsedBody.message, payload.text);
  assert.equal(parsedBody.access_token, config.accessToken);
});

test("createMetaThreadsHttpClient uses injected transport and returns normalized result", async () => {
  const config = makeConfig();
  const payload = makePayload();

  const calls = [];
  __setTransportForTesting(async ({ method, url, headers, body }) => {
    calls.push({ method, url, headers, body });

    return {
      status: 200,
      body: JSON.stringify({
        id: "threads:123",
        permalink: "https://threads.net/@account/123",
      }),
    };
  });

  const client = createMetaThreadsHttpClient({ baseUrl: BASE_URL });
  const result = await client({ config, payload });

  assert.equal(result.id, "threads:123");
  assert.equal(result.permalink, "https://threads.net/@account/123");
  assert.equal(calls.length, 1);

  const [{ url }] = calls;
  assert.equal(url, `${BASE_URL}/v1.0/threads`);

  __resetTransportForTesting();
});

test("HTTP error status maps to structured error without leaking body", async () => {
  const config = makeConfig();
  const payload = makePayload();

  __setTransportForTesting(async () => ({
    status: 400,
    body: "{\"error\":\"details not exposed\"}",
  }));

  const client = createMetaThreadsHttpClient({ baseUrl: BASE_URL });

  await assert.rejects(
    () => client({ config, payload }),
    (err) => {
      assert.equal(err.code, "HTTP_ERROR");
      assert.equal(err.status, 400);
      assert.match(err.message, /status 400/);
      return true;
    },
  );

  __resetTransportForTesting();
});

test("network error maps to structured error", async () => {
  const config = makeConfig();
  const payload = makePayload();

  __setTransportForTesting(async () => {
    const e = new Error("socket hang up");
    throw e;
  });

  const client = createMetaThreadsHttpClient({ baseUrl: BASE_URL });

  await assert.rejects(
    () => client({ config, payload }),
    (err) => {
      assert.equal(err.code, "NETWORK_ERROR");
      assert.match(err.message, /Threads API request failed/);
      return true;
    },
  );

  __resetTransportForTesting();
});

