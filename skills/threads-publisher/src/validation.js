// Validation for normalized Threads publishing payloads (v1).

const ALLOWED_MODES = ['now', 'schedule', 'reply'];
const ALLOWED_MEDIA_TYPES = ['TEXT', 'IMAGE', 'VIDEO', 'CAROUSEL'];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function assert(condition, message, path = '') {
  if (!condition) {
    const prefix = path ? `${path}: ` : '';
    throw new Error(prefix + message);
  }
}

export function validateNormalizedPayload(payload) {
  assert(payload && typeof payload === 'object', 'payload must be an object');

  const {
    mode,
    media_type,
    text,
    image_url,
    video_url,
    children,
    reply_to_id,
    topic_tag,
    link_attachment,
    gif_attachment,
    location_id,
    text_entities,
    is_spoiler_media,
    scheduledAt,
  } = payload;

  assert(ALLOWED_MODES.includes(mode), `mode must be one of ${ALLOWED_MODES.join(', ')}`);
  assert(ALLOWED_MEDIA_TYPES.includes(media_type), `media_type must be one of ${ALLOWED_MEDIA_TYPES.join(', ')}`);

  if (mode === 'reply') {
    assert(isNonEmptyString(reply_to_id), 'reply_to_id is required when mode=reply', 'reply_to_id');
  }

  if (mode === 'schedule') {
    assert(isNonEmptyString(scheduledAt), 'scheduledAt is required when mode=schedule', 'scheduledAt');
  }

  if (media_type === 'TEXT') {
    assert(!image_url && !video_url && !children, 'media_type=TEXT cannot have image_url, video_url, or children');
  }

  if (media_type === 'IMAGE') {
    assert(isNonEmptyString(image_url), 'image_url is required when media_type=IMAGE', 'image_url');
    assert(!video_url && !children, 'media_type=IMAGE cannot have video_url or children');
  }

  if (media_type === 'VIDEO') {
    assert(isNonEmptyString(video_url), 'video_url is required when media_type=VIDEO', 'video_url');
    assert(!image_url && !children, 'media_type=VIDEO cannot have image_url or children');
  }

  if (media_type === 'CAROUSEL') {
    assert(Array.isArray(children) && children.length >= 2, 'children (>=2) is required when media_type=CAROUSEL', 'children');
    children.forEach((child, index) => {
      const path = `children[${index}]`;
      assert(child && typeof child === 'object', 'child must be an object', path);
      assert(ALLOWED_MEDIA_TYPES.includes(child.media_type) && child.media_type !== 'CAROUSEL', 'child media_type must be TEXT/IMAGE/VIDEO (no nested CAROUSEL)', path);
      if (child.media_type === 'IMAGE') {
        assert(isNonEmptyString(child.image_url), 'image_url is required for IMAGE child', path + '.image_url');
      }
      if (child.media_type === 'VIDEO') {
        assert(isNonEmptyString(child.video_url), 'video_url is required for VIDEO child', path + '.video_url');
      }
    });
  }

  if (link_attachment) {
    assert(typeof link_attachment === 'object', 'link_attachment must be an object', 'link_attachment');
    assert(isNonEmptyString(link_attachment.url), 'link_attachment.url is required', 'link_attachment.url');
  }

  if (gif_attachment) {
    assert(typeof gif_attachment === 'object', 'gif_attachment must be an object', 'gif_attachment');
    assert(isNonEmptyString(gif_attachment.url) || isNonEmptyString(gif_attachment.id), 'gif_attachment.url or gif_attachment.id is required', 'gif_attachment');
  }

  if (text_entities) {
    assert(Array.isArray(text_entities), 'text_entities must be an array if provided', 'text_entities');
  }

  if (typeof is_spoiler_media !== 'undefined') {
    assert(typeof is_spoiler_media === 'boolean', 'is_spoiler_media must be a boolean', 'is_spoiler_media');
  }

  return payload;
}
