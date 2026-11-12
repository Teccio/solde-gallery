/* ============================================================
   MODULE ISOLÉ — Comptage analytique de provenance des clics
   ------------------------------------------------------------
   · Le suivi est invisible pour le public : il est déclenché au
     moment où une fiche d'œuvre s'ouvre (point d'entrée unique
     `useUI().open`), sans modifier le catalogue ni la grille.
   · Deux provenances :
       "grid"      → grille Bento classique et toute surface de
                     catalogue (compteur normal) ;
       "billboard" → œuvre ouverte depuis le Billboard « À la une »
                     (provenance enregistrée séparément) ;
       "none"      → ouverture interne (ex. preuve de mérite) :
                     ignorée pour ne pas fausser les statistiques.
   · Stockage dans une clé localStorage DÉDIÉE, indépendante de la
     base de simulation : aucune migration ni altération du schéma
     principal (comptes, achats, wallets, messages).
   · Les données sont privées au navigateur et persistent tant que
     le local storage n'est pas effacé.
   ============================================================ */
import { useSyncExternalStore } from "react";

export type ClickSource = "grid" | "billboard" | "none";

export interface WorkClicks {
  total: number;
  grid: number;
  billboard: number;
  lastAt: string;
}

export type ClickStats = Record<string, WorkClicks>;

export const CLICK_STORAGE_KEY = "solde.gallery.clicks.v1";
export const CLICK_EVENT = "solde:clicks-changed";

let cache: ClickStats | null = null;

function parse(raw: string | null): ClickStats {
  try {
    const v = JSON.parse(raw ?? "{}") as ClickStats;
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

/** Lecture avec cache : `getSnapshot` de useSyncExternalStore doit renvoyer une référence stable. */
export function readClickStats(): ClickStats {
  if (!cache) {
    try {
      cache = parse(localStorage.getItem(CLICK_STORAGE_KEY));
    } catch {
      cache = {};
    }
  }
  return cache;
}

export function trackWorkClick(workId: string, source: ClickSource = "grid") {
  if (!workId || source === "none") return;
  try {
    const all = { ...readClickStats() };
    const cur = all[workId] ?? { total: 0, grid: 0, billboard: 0, lastAt: "" };
    const next: WorkClicks = {
      total: cur.total + 1,
      grid: cur.grid + (source === "grid" ? 1 : 0),
      billboard: cur.billboard + (source === "billboard" ? 1 : 0),
      lastAt: new Date().toISOString(),
    };
    all[workId] = next;
    localStorage.setItem(CLICK_STORAGE_KEY, JSON.stringify(all));
    cache = all;
    window.dispatchEvent(new CustomEvent(CLICK_EVENT));
  } catch {
    /* Stockage indisponible (mode privé / quota) : le suivi reste silencieux */
  }
}

/** Réinitialisation manuelle des statistiques (outil de démonstration). */
export function resetClickStats() {
  try {
    localStorage.removeItem(CLICK_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  cache = {};
  window.dispatchEvent(new CustomEvent(CLICK_EVENT));
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== CLICK_STORAGE_KEY) return;
    cache = null;
    cb();
  };
  const onLocal = () => {
    cb();
  };
  window.addEventListener(CLICK_EVENT, onLocal);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CLICK_EVENT, onLocal);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY_STATS: ClickStats = {};

/** Hook réactif : le Studio se met à jour sans rechargement, y compris depuis un autre onglet. */
export function useClickStats(): ClickStats {
  return useSyncExternalStore(subscribe, readClickStats, () => EMPTY_STATS);
}
