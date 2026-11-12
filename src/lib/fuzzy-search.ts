import type { Lang, User, Work } from "./types";
import { catLabel, tradeLabel } from "./l10n";

export function normalizeSearch(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/œ/g, "oe")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// Distance de Damerau-Levenshtein : insertion, suppression, remplacement
// et inversion de deux lettres. Le texte original n'est jamais modifié.
export function characterDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) rows[i][0] = i;
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
}

type SearchField = { text: string; weight: number };

export function fuzzyScore(query: string, fields: SearchField[]): number | null {
  const normalized = normalizeSearch(query);
  if (!normalized) return 0;
  const words = normalized.split(/\s+/).slice(0, 24);
  const prepared = fields.map((field) => ({
    ...field,
    text: normalizeSearch(field.text),
    tokens: normalizeSearch(field.text).split(/\s+/).filter(Boolean),
  }));
  const exact = prepared.reduce((best, field) => {
    const normalizedText = field.text;
    if (!normalizedText.includes(normalized)) return best;
    return Math.max(best, 100 + field.weight * 20 + (normalizedText === normalized ? 10 : 0));
  }, 0);
  if (exact) return exact;

  const scores: number[] = [];
  for (const word of words) {
    let best = 0;
    const tolerance = word.length < 3 ? 0 : Math.min(2, Math.max(1, Math.floor(word.length / 4)));
    for (const field of prepared) {
      for (const token of field.tokens) {
        if (token.includes(word)) {
          best = Math.max(best, (token === word ? 95 : 88) + field.weight * 5);
          continue;
        }
        if (!tolerance || word.length > 64 || token.length > 64 || Math.abs(word.length - token.length) > tolerance) continue;
        const distance = characterDistance(word, token);
        if (distance <= tolerance) {
          const closeness = (1 - distance / Math.max(word.length, token.length)) * 20;
          best = Math.max(best, 60 + closeness + field.weight * 5);
        }
      }
    }
    if (!best) return null;
    scores.push(best);
  }
  if (scores.length !== words.length) return null;
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

/** Les filtres sont appliqués avant ce classement. Un tri de prix explicite
 * reste prioritaire ; par défaut, les correspondances les plus proches passent en tête. */
export function fuzzySearchWorks(
  works: Work[],
  query: string,
  creatorFor: (id: string) => User | undefined,
  lang: Lang,
  relevance = true,
): Work[] {
  const matches = works.map((work, index) => {
    const creator = creatorFor(work.creatorId);
    const score = fuzzyScore(query, [
      { text: work.title, weight: 1 },
      { text: creator?.name ?? "", weight: 0.9 },
      { text: work.tags.join(" "), weight: 0.8 },
      { text: catLabel(work.category, lang), weight: 0.7 },
      { text: (creator?.trades ?? []).flatMap((trade) => [trade, tradeLabel(trade, lang)]).join(" "), weight: 0.6 },
      { text: work.description, weight: 0.4 },
    ]);
    return { work, score, index };
  }).filter((match): match is { work: Work; score: number; index: number } => match.score !== null);
  if (relevance) matches.sort((a, b) => b.score - a.score || a.index - b.index);
  return matches.map(({ work }) => work);
}

export function fuzzyRecentSearches(recent: string[], query: string): string[] {
  if (!query.trim()) return recent.slice(0, 6);
  return recent.map((text, index) => ({ text, index, score: fuzzyScore(query, [{ text, weight: 1 }]) }))
    .filter((entry): entry is { text: string; index: number; score: number } => entry.score !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 6)
    .map(({ text }) => text);
}