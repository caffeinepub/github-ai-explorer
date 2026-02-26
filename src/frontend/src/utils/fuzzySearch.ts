export interface FuzzyResult<T> {
  item: T;
  score: number;
}

export function fuzzySearch<T extends { text: string }>(
  query: string,
  items: T[],
): FuzzyResult<T>[] {
  if (!query.trim()) {
    return items.map((item) => ({ item, score: 1 }));
  }

  const q = query.toLowerCase();
  const results: FuzzyResult<T>[] = [];

  for (const item of items) {
    const text = item.text.toLowerCase();
    let score = 0;

    // Exact match
    if (text === q) {
      score = 100;
    } else if (text.startsWith(q)) {
      score = 80;
    } else if (text.includes(q)) {
      score = 60;
    } else {
      // Fuzzy: all chars of query appear in order
      let qi = 0;
      let consecutive = 0;
      let lastMatch = -1;
      for (let i = 0; i < text.length && qi < q.length; i++) {
        if (text[i] === q[qi]) {
          if (lastMatch === i - 1) consecutive++;
          lastMatch = i;
          qi++;
        }
      }
      if (qi === q.length) {
        score = 20 + consecutive * 5;
      }
    }

    if (score > 0) {
      results.push({ item, score });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
