export function formatResults(items, { format }) {
  if (format === 'markdown') {
    return formatMarkdown(items);
  }

  return JSON.stringify(
    items.map(simplifyItem),
    null,
    2
  );
}

function simplifyItem(item) {
  return {
    title: item.title,
    link: item.link,
    description: item.description,
    pubDate: item.pubDate,
    source: item.source
  };
}

function formatMarkdown(items) {
  if (items.length === 0) {
    return '# Grant Watch Results\n\n_No matching grants found._\n';
  }

  const lines = ['# Grant Watch Results', ''];

  for (const item of items) {
    lines.push(`## ${item.title || '(no title)'}`);
    if (item.link) {
      lines.push(`- **Link:** ${item.link}`);
    }
    if (item.pubDate) {
      lines.push(`- **Published:** ${item.pubDate}`);
    }
    if (item.source) {
      lines.push(`- **Source feed:** ${item.source}`);
    }
    if (item.description) {
      lines.push('');
      lines.push(item.description);
    }
    lines.push('');
  }

  return lines.join('\n');
}
