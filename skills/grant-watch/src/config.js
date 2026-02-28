import fs from 'fs';
import path from 'path';

export function loadConfig(configPath) {
  const resolved = path.resolve(process.cwd(), configPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Config file not found: ${resolved}`);
  }

  const raw = fs.readFileSync(resolved, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON in config file: ${e.message}`);
  }

  if (!Array.isArray(parsed.feeds) || parsed.feeds.length === 0) {
    throw new Error('Config must contain non-empty "feeds" array');
  }

  const filters = parsed.filters || {};
  if (filters.keywords && !Array.isArray(filters.keywords)) {
    throw new Error('"filters.keywords" must be an array of strings if provided');
  }

  if (
    filters.min_amount !== undefined &&
    typeof filters.min_amount !== 'number'
  ) {
    throw new Error('"filters.min_amount" must be a number if provided');
  }

  if (
    filters.max_deadline_days !== undefined &&
    typeof filters.max_deadline_days !== 'number'
  ) {
    throw new Error('"filters.max_deadline_days" must be a number if provided');
  }

  return {
    feeds: parsed.feeds,
    filters
  };
}
