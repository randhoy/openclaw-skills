import test from 'node:test';
import assert from 'node:assert';
import { filterGrants } from '../src/filter.js';

test('filterGrants filters by keyword', () => {
  const items = [
    { title: 'AI grant', description: 'Funding for AI research', raw: {} },
    { title: 'Other grant', description: 'Something else', raw: {} }
  ];

  const filtered = filterGrants(items, { keywords: ['ai'] });
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].title, 'AI grant');
});
