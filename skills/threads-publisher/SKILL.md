# Threads Publisher Skill (v1-compatible)

This skill publishes posts to Meta Threads using the normalized payload format used by `threads-publisher v1`.

## Inputs

The skill expects a JSON object with the following shape:

```jsonc
{
  "accessToken": "<GRAPH_API_ACCESS_TOKEN>",
  "userId": "<THREADS_USER_ID>",
  "dryRun": false,
  "graphBaseUrl": "https://graph.threads.net", // optional, mostly for tests
  "payload": {
    "mode": "now" | "schedule" | "reply",
    "media_type": "TEXT" | "IMAGE" | "VIDEO" | "CAROUSEL",

    "text": "Post text",

    // Single-media fields
    "image_url": "https://...",    // required when media_type=IMAGE
    "video_url": "https://...",    // required when media_type=VIDEO

    // Carousel
    "children": [                    // required (>=2) when media_type=CAROUSEL
      {
        "media_type": "TEXT" | "IMAGE" | "VIDEO", // no nested CAROUSEL
        "text": "optional caption",
        "image_url": "https://...",               // for IMAGE
        "video_url": "https://..."                // for VIDEO
      }
    ],

    // Replies
    "reply_to_id": "<existing-thread-id>", // required when mode=reply

    // Thread metadata
    "topic_tag": "topic-tag",             // optional
    "location_id": "<graph-location-id>", // optional
    "is_spoiler_media": false,             // optional, boolean

    // Rich text
    "text_entities": [                      // optional
      { "offset": 0, "length": 4, "type": "bold" }
    ],

    // Attachments
    "link_attachment": {                    // optional
      "url": "https://example.com",
      "title": "Example",
      "description": "Optional"
    },
    "gif_attachment": {                     // optional
      "url": "https://giphy.com/..." ,
      "id": "optional-gif-id"
    },

    // Scheduling
    "scheduledAt": "1730000000"           // required when mode=schedule; unix timestamp (string)
  }
}
```

## Behavior

1. **Validation**
   - `mode` must be one of: `now`, `schedule`, `reply`.
   - `media_type` must be one of: `TEXT`, `IMAGE`, `VIDEO`, `CAROUSEL`.
   - `reply_to_id` is required when `mode = reply`.
   - `scheduledAt` is required when `mode = schedule`.
   - `IMAGE` requires non-empty `image_url` and forbids `video_url` / `children`.
   - `VIDEO` requires non-empty `video_url` and forbids `image_url` / `children`.
   - `CAROUSEL` requires `children` array with **at least 2** items.
   - Each child in `children` must be an object with `media_type` in `TEXT|IMAGE|VIDEO` (no nested carousels) and the appropriate `image_url`/`video_url` when needed.
   - If `link_attachment` is present, it must be an object with a non-empty `url`.
   - If `gif_attachment` is present, it must be an object with a non-empty `url` **or** `id`.
   - `text_entities` (if present) must be an array.
   - `is_spoiler_media` (if present) must be boolean.

2. **Mapping to Threads API**

   After validation, the payload is transformed into Graph API requests.

   - Container creation endpoint:
     - `mode=now` or `schedule` → `POST /{user-id}/threads`
     - `mode=reply` → `POST /me/threads` (with `reply_to_id`)

   - Common params:
     - `access_token`
     - `text` (if provided)
     - `topic_tag`, `location_id`, `is_spoiler_media`
     - `text_formatting_entities` (JSON-stringified `text_entities` if present)
     - `link_attachment`, `gif_attachment` (JSON-stringified if present)

   - Media params:
     - `IMAGE` → `image_url`
     - `VIDEO` → `video_url`
     - `CAROUSEL` → `children` (JSON-stringified array of child descriptors)

   - Scheduling:
     - `mode=schedule` → `scheduled_publish_time = payload.scheduledAt`

   - Publish endpoint:
     - Always `POST /{user-id}/threads_publish`
     - Body: `{ access_token, creation_id: <container-id> }`

3. **Dry Run**

   When `dryRun: true`, **no HTTP calls are made**. Instead, the skill returns the computed mapping:

   ```jsonc
   {
     "dryRun": true,
     "endpoint": "/{user-id}/threads",
     "threadParams": { /* container creation params */ },
     "publishParams": {
       "endpoint": "/{user-id}/threads_publish",
       "body": { "access_token": "..." }
     }
   }
   ```

4. **Real Mode**

   When `dryRun: false`, the skill:

   1. Calls the injected `transport.request('POST', baseUrl + endpoint, { body })` to create a container.
   2. Extracts `id` (or `container_id`) from the response.
   3. Calls `transport.request('POST', baseUrl + '/{user-id}/threads_publish', { body: { access_token, creation_id } })`.

   Returns:

   ```jsonc
   {
     "dryRun": false,
     "container": { "id": "..." },
     "publish": { "id": "..." }
   }
   ```

## Outputs

- On **success** (dry run or real): a JSON object describing the calls or API responses (see above).
- On **validation or API errors**: the skill throws (the runner should surface the error).

## Examples

### 1. Simple text post (now)

```jsonc
{
  "accessToken": "AT",
  "userId": "123",
  "dryRun": true,
  "payload": {
    "mode": "now",
    "media_type": "TEXT",
    "text": "Hello Threads!"
  }
}
```

### 2. Image post with topic tag and link

```jsonc
{
  "accessToken": "AT",
  "userId": "123",
  "dryRun": true,
  "payload": {
    "mode": "now",
    "media_type": "IMAGE",
    "text": "Check this out",
    "image_url": "https://example.com/img.jpg",
    "topic_tag": "launch",
    "link_attachment": { "url": "https://example.com" }
  }
}
```

### 3. Scheduled carousel

```jsonc
{
  "accessToken": "AT",
  "userId": "123",
  "dryRun": true,
  "payload": {
    "mode": "schedule",
    "media_type": "CAROUSEL",
    "scheduledAt": "1730000000",
    "children": [
      { "media_type": "IMAGE", "image_url": "https://example.com/1.jpg" },
      { "media_type": "IMAGE", "image_url": "https://example.com/2.jpg" }
    ]
  }
}
```

### 4. Reply to an existing thread

```jsonc
{
  "accessToken": "AT",
  "userId": "123",
  "dryRun": true,
  "payload": {
    "mode": "reply",
    "media_type": "TEXT",
    "text": "Replying here",
    "reply_to_id": "1789..."
  }
}
```
