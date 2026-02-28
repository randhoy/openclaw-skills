export function filterGrants(items, filters) {
  const keywords = (filters.keywords || []).map(k => k.toLowerCase());
  const maxDeadlineDays = filters.max_deadline_days;
  const now = new Date();

  return items.filter(item => {
    const text =
      (item.title || '') +
      ' ' +
      (item.description || '');

    if (keywords.length > 0) {
      const lower = text.toLowerCase();
      const hasKeyword = keywords.some(k => lower.includes(k));
      if (!hasKeyword) return false;
    }

    if (typeof maxDeadlineDays === 'number') {
      const deadlineDate = inferDeadline(item);
      if (deadlineDate) {
        const diffMs = deadlineDate.getTime() - now.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays > maxDeadlineDays) {
          return false;
        }
      }
    }

    return true;
  });
}

function inferDeadline(item) {
  const raw = item.raw || {};
  const possible = raw.deadline || raw.dateEnd || raw['dc:date'];

  if (possible) {
    const d = new Date(possible);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}
