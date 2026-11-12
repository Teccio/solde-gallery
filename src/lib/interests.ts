import type { CategoryId, User } from "./types";
import { CATEGORIES } from "./types";

/* Priorité stable : l'ordre initial du catalogue reste intact dans chaque
   univers. Les catégories cochées passent avant les autres, sans supprimer
   ni modifier le contenu des œuvres. */
export function prioritizeByInterests<T extends CategoryId | { category: CategoryId }>(
  items: T[],
  interests?: readonly CategoryId[],
): T[] {
  if (!interests?.length) return [...items];
  const rank = new Map(interests.map((id, index) => [id, index] as const));
  const fallback = interests.length;
  const categoryOf = (item: T): CategoryId =>
    typeof item === "string" ? item : item.category;
  return [...items].sort((a, b) =>
    (rank.get(categoryOf(a)) ?? fallback) - (rank.get(categoryOf(b)) ?? fallback),
  );
}

/** Les intérêts sont dans l'ordre choisi par le membre, suivis des autres
 * univers dans leur ordre habituel. */
export function orderedCategories(interests?: readonly CategoryId[]): CategoryId[] {
  return prioritizeByInterests(CATEGORIES.map((category) => category.id), interests);
}

export function hasInterestSelection(user?: User | null): boolean {
  return Boolean(user?.interests?.length);
}
