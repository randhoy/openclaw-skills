import test from 'node:test';
import assert from 'node:assert/strict';
import { validateNormalizedPayload } from '../src/validation.js';

const basePayload = {
  mode: 'now',
  media_type: 'TEXT',
  text: 'hello world',
};

test('validateNormalizedPayload accepts minimal TEXT payload', () => {
  const result = validateNormalizedPayload(basePayload);
  assert.equal(result, basePayload);
});

test('validateNormalizedPayload rejects missing mode', () => {
  assert.throws(() => validateNormalizedPayload({ media_type: 'TEXT' }), /mode must be one of/);
});

test('validateNormalizedPayload requires reply_to_id for replies', () => {
  assert.throws(
    () => validateNormalizedPayload({ ...basePayload, mode: 'reply' }),
    /reply_to_id is required when mode=reply/
  );
});

test('validateNormalizedPayload requires scheduledAt for schedule', () => {
  assert.throws(
    () => validateNormalizedPayload({ ...basePayload, mode: 'schedule' }),
    /scheduledAt is required when mode=schedule/
  );
});

test('validateNormalizedPayload enforces IMAGE requirements', () => {
  assert.throws(
    () => validateNormalizedPayload({ ...basePayload, media_type: 'IMAGE', image_url: '' }),
    /image_url is required when media_type=IMAGE/
  );

  const ok = validateNormalizedPayload({ ...basePayload, media_type: 'IMAGE', image_url: 'https://example.com/img.jpg' });
  assert.equal(ok.media_type, 'IMAGE');
});


test('validateNormalizedPayload enforces VIDEO requirements', () => {
  assert.throws(
    () => validateNormalizedPayload({ ...basePayload, media_type: 'VIDEO', video_url: '' }),
    /video_url is required when media_type=VIDEO/
  );

  const ok = validateNormalizedPayload({ ...basePayload, media_type: 'VIDEO', video_url: 'https://example.com/video.mp4' });
  assert.equal(ok.media_type, 'VIDEO');
});


test('validateNormalizedPayload enforces CAROUSEL children', () => {
  assert.throws(
    () => validateNormalizedPayload({ ...basePayload, media_type: 'CAROUSEL', children: [] }),
    /children \(>=2\) is required when media_type=CAROUSEL/
  );

  const ok = validateNormalizedPayload({
    ...basePayload,
    media_type: 'CAROUSEL',
    children: [
      { media_type: 'IMAGE', image_url: 'https://example.com/1.jpg' },
      { media_type: 'IMAGE', image_url: 'https://example.com/2.jpg' },
    ],
  });
  assert.equal(ok.media_type, 'CAROUSEL');
});
