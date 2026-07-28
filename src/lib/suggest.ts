/**
 * "Did you mean…" for the search no-results state. Misspellings are the
 * common case for a child at a keyboard, so the correction is offered as a
 * button, not just a link (wireframe 4b).
 */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

/** Suggest the closest vocabulary word within 2 edits, if any. */
export function suggestQuery(
  query: string,
  vocabulary: Iterable<string>,
): string | undefined {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return undefined;

  let best: { word: string; distance: number } | undefined;
  for (const raw of vocabulary) {
    const word = raw.toLowerCase();
    if (word === q) return undefined;
    const distance = editDistance(q, word);
    if (distance <= 2 && (!best || distance < best.distance)) {
      best = { word, distance };
    }
  }
  return best?.word;
}
