# Threads Publisher Skill

A self-contained Threads publishing skill compatible with the `threads-publisher v1` normalized payload.

This implementation focuses on:

- Strict validation of the normalized input payload.
- A small, testable `ThreadsClient` that maps normalized fields → Threads Graph API fields.
- An injectable transport abstraction so tests can run with **no real HTTP**.
- Simple `node:test` based tests.

## Layout

```text
skills/threads-publisher/
  package.json
  SKILL.md        # Skill contract + mapping documentation
  README.md       # This file
  src/
    index.js      # Skill entrypoint (run())
    threadsClient.js
    validation.js
    transport.js
  tests/
    validation.test.js
    threadsClient.test.js
```

## Usage

From this directory:

```bash
node -e "import('./src/index.js').then(async ({ run }) => { console.log(await run({ accessToken: 'AT', userId: '123', dryRun: true, payload: { mode: 'now', media_type: 'TEXT', text: 'Hello' } })); })"
```

The skill expects **already-normalized** payloads as described in `SKILL.md`.

### Entry API

```ts
// src/index.js
export async function run({ accessToken, userId, payload, dryRun, transport, graphBaseUrl }): Promise<any>
```

- `accessToken` (string, required): Threads Graph API access token.
- `userId` (string, required): Threads user id used in `/{user-id}/threads` and `/{user-id}/threads_publish`.
- `payload` (object, required): Normalized payload (see `SKILL.md`).
- `dryRun` (boolean, optional): If `true`, compute and return the mapping without doing HTTP.
- `transport` (object, required in real mode): must expose `request(method, url, { body })`.
- `graphBaseUrl` (string, optional): For tests / non-prod environments, defaults to `https://graph.threads.net`.

## Tests

From `skills/threads-publisher`:

```bash
npm test
```

This runs `node --test tests` using the built-in Node.js test runner.

No real HTTP calls are made; `threadsClient.test.js` uses a mock transport implementation.

## Notes / Assumptions

- Carousel support is **basic**: the `children` array is passed through as JSON to the `children` field on the Graph API container request, matching the v1 behavior assumption.
- Text formatting entities, link attachments and gif attachments are simply JSON-stringified and forwarded to the corresponding fields (`text_formatting_entities`, `link_attachment`, `gif_attachment`).
- Scheduling uses the normalized `scheduledAt` string as `scheduled_publish_time`.
- Replies go to `POST /me/threads` with `reply_to_id`.

## TODO for Builder (when porting to openclaw-skills)

- Wire this skill into the shared HTTP / transport utilities used by other skills.
- Replace the simple `URLSearchParams` bodies with whatever encoding is standard for the main repo (if different).
- Align error handling and logging with the repo conventions.
- Add integration tests that run against a Threads sandbox, guarded behind a feature flag / env var, if desired.
