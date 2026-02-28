import fetch from 'node-fetch';
import RSSParser from 'rss-parser';

// rss-parser can handle both RSS and Atom, but some feeds may be picky.
// We add a small content-type/shape detection layer so we can log clearer
// errors and potentially adapt behaviour for Atom-like feeds.

const parser = new RSSParser();

export async function fetchAndParseFeeds(feedUrls) {
  const allItems = [];

  for (const url of feedUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const text = await res.text();

      // Naive detection of Atom vs RSS vs non-XML
      if (!/^\s*</.test(text)) {
        throw new Error('Response does not look like XML');
      }

      const isAtom = /<feed[\s>]/i.test(text) && /<entry[\s>]/i.test(text);
      const isRss = /<rss[\s>]/i.test(text) || /<channel[\s>]/i.test(text);

      if (!isAtom && !isRss) {
        throw new Error('Feed not recognized as RSS or Atom XML');
      }

      const feed = await parser.parseString(text);

      if (Array.isArray(feed.items)) {
        for (const item of feed.items) {
          allItems.push(normalizeItem(item, url));
        }
      }
    } catch (err) {
      console.error(`Failed to fetch or parse feed ${url}: ${err.message}`);
    }
  }

  return allItems;
}

function normalizeItem(item, sourceUrl) {
  return {
    title: item.title || '',
    link: item.link || '',
    description: item.contentSnippet || item.content || '',
    pubDate: item.isoDate || item.pubDate || null,
    raw: item,
    source: sourceUrl
  };
}
