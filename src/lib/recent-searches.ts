/* ============================================================
   MODULE ISOLÉ — Historique des recherches récentes
   ------------------------------------------------------------
   · Clé localStorage dédiée : aucune interaction avec la base de
     simulation (comptes, achats, wallets, messages).
   · Les entrées sont dédupliquées (insensible à la casse), plafonnées
     à 6 et ordonnées de la plus récente à la plus ancienne.
   · `useRecentSearches` utilise useSyncExternalStore : la liste se
     rafraîchit sans rechargement et reste synchronisée entre onglets.
   ============================================================ */
import { useSyncExternalStore } from "react";

export const RECENT_KEY = "solde.gallery.recent-searches.v1";
const EVENT = "solde:recent-searches";
const MAX = 6;

let cache: string[] | null = null;

function parse(raw: string | null): string[] {
  try {
    const v = JSON.parse(raw ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function readRecentSearches(): string[] {
  if (!cache) {
    try {
      cache = parse(localStorage.getItem(RECENT_KEY));
    } catch {
      cache = [];
    }
  }
  return cache;
}

/** Enregistre un terme soumis (jamais appelé pendant la saisie : évite les écritures et le gel). */
export function pushRecentSearch(term: string) {
  const clean = term.trim();
  if (!clean) return;
  try {
    const next = [clean, ...readRecentSearches().filter((x) => x.toLowerCase() !== clean.toLowerCase())].slice(0, MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    cache = next;
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* stockage indisponible : la recherche reste fonctionnelle */
  }
}

export function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* ignore */
  }
  cache = [];
  window.dispatchEvent(new CustomEvent(EVENT));
}

const EMPTY: string[] = [];

export function useRecentSearches(): string[] {
  return useSyncExternalStore(
    (cb) => {
      const onLocal = () => cb();
      const onStorage = (e: StorageEvent) => {
        if (e.key !== RECENT_KEY) return;
        cache = null;
        cb();
      };
      window.addEventListener(EVENT, onLocal);
      window.addEventListener("storage", onStorage);
      return () => {
        window.removeEventListener(EVENT, onLocal);
        window.removeEventListener("storage", onStorage);
      };
    },
    readRecentSearches,
    () => EMPTY,
  );
}
