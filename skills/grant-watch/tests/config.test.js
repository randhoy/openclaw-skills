import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { loadConfig } from '../src/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('loadConfig loads and validates basic config', () => {
  const tmpPath = path.join(__dirname, 'tmp-config.json');
  const configObj = {
    feeds: ['https://example.org/feed.rss'],
    filters: {
      keywords: ['AI'],
      max_deadline_days: 30
    }
  };
  fs.writeFileSync(tmpPath, JSON.stringify(configObj), 'utf8');

  const cfg = loadConfig(tmpPath);
  assert.deepEqual(cfg.feeds, configObj.feeds);
  assert.deepEqual(cfg.filters.keywords, ['AI']);
  assert.strictEqual(cfg.filters.max_deadline_days, 30);

  fs.unlinkSync(tmpPath);
});

test('loadConfig throws on missing feeds', () => {
  const tmpPath = path.join(__dirname, 'tmp-config-invalid.json');
  fs.writeFileSync(tmpPath, JSON.stringify({}), 'utf8');

  assert.throws(() => loadConfig(tmpPath));

  fs.unlinkSync(tmpPath);
});
