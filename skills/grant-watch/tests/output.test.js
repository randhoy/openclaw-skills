import test from 'node:test';
import assert from 'node:assert';
import { formatResults } from '../src/output.js';

test('formatResults returns JSON by default', () => {
  const items = [
    { title: 'A', link: 'http://a', description: 'desc', pubDate: '2025-01-01', source: 'feed' }
  ];
  const out = formatResults(items, { format: 'json' });
  const parsed = JSON.parse(out);
  assert.strictEqual(parsed.length, 1);
  assert.strictEqual(parsed[0].title, 'A');
});

test('formatResults returns markdown when requested', () => {
  const items = [
    { title: 'A', link: 'http://a', description: 'desc', pubDate: '2025-01-01', source: 'feed' }
  ];
  const out = formatResults(items, { format: 'markdown' });
  assert.ok(out.includes('# Grant Watch Results'));
  assert.ok(out.includes('## A'));
});
