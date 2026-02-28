import fetch from 'node-fetch';
import RSSParser from 'rss-parser';

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
