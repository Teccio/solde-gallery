/* ============================================================
   MODULE ISOLÉ — Flux de notifications (lecture / non-lus)
   ------------------------------------------------------------
   · Source unique : `db.ledger` (achats et dons simulés). Aucune
     duplication de données, aucune modification du schéma principal.
   · Le repère « dernière consultation » vit dans une clé
     localStorage dédiée par compte : il ne touche ni aux wallets
     ni aux messages.
   · Une notification est « non lue » si sa date est postérieure au
     repère. Sans repère, les notifications de ce compte sont non lues.
   ============================================================ */
import { useCallback, useSyncExternalStore } from "react";
import type { DB, FavoriteEvent, LedgerEntry, Lang, User } from "./types";

export const NOTIF_SEEN_KEY = "solde.gallery.notifications.seen.v1";
export const NOTIF_EVENT = "solde:notifications-seen";
const readKey = (userId?: string) => `${NOTIF_SEEN_KEY}:${userId ?? "visitor"}`;

export function getSeenAt(userId?: string): number {
  try {
    const raw = localStorage.getItem(readKey(userId));
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }
  } catch {
    /* stockage indisponible */
  }
  return 0;
}

export function markAllSeen(userId?: string) {
  const now = Date.now();
  try {
    localStorage.setItem(readKey(userId), String(now));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(NOTIF_EVENT));
  return now;
}

/** Chaque compte possède son repère de lecture : consulter les notifications
 * de Milo ne marque pas celles de Nadia comme lues. */
export function useNotificationSeen(userId?: string) {
  const subscribe = useCallback((callback: () => void) => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === readKey(userId)) callback();
    };
    window.addEventListener(NOTIF_EVENT, callback);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(NOTIF_EVENT, callback);
      window.removeEventListener("storage", onStorage);
    };
  }, [userId]);
  return useSyncExternalStore(subscribe, () => getSeenAt(userId), () => 0);
}

export function countUnread(ledger: { date: string }[], seenAt: number): number {
  return ledger.filter((e) => +new Date(e.date) > seenAt).length;
}

/** Flux récents, du plus récent au plus ancien. */
export function recentFlows(ledger: LedgerEntry[], limit = 8): LedgerEntry[] {
  return [...ledger].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, limit);
}

/* Traçabilité des revenus pour le créateur : mention de provenance d'une vente.
   Priorité au musée (vente en vitrine), puis Billboard ; sinon vente simple
   (aucune mention). Renvoie null pour les dons et les ventes sans provenance. */
export function saleProvenance(e: LedgerEntry, museumTitle: string | undefined, lang: Lang): string | null {
  if (e.type !== "vente") return null;
  if (e.museumId) {
    const name = museumTitle ?? "Musée";
    return {
      fr: `provenant du musée ${name}`,
      ht: `ki soti nan mize ${name}`,
      en: `from the ${name} museum`,
      es: `procedente del museo ${name}`,
    }[lang];
  }
  if (e.via === "billboard") {
    return {
      fr: "provenant de Billboard",
      ht: "ki soti nan Billboard",
      en: "from Billboard",
      es: "procedente de Billboard",
    }[lang];
  }
  return null;
}

/* ------------------------------------------------------------
   CONFIDENTIALITÉ TOTALE DES NOTIFICATIONS D'ACHAT / TÉLÉCHARGEMENT
   ------------------------------------------------------------
   L'historique des achats d'autres personnes n'apparaît jamais chez un
   tiers. Chaque compte voit uniquement :
     · SES ACHATS / DONS (buyerId), formulés à la deuxième personne ;
     · SES VENTES / DONS REÇUS (creatorId), formulés comme revenus ;
     · l'intégralité pour l'administrateur du site (isAdmin).
   Un visiteur ne voit aucune transaction. Le gérant de musée conserve
   l'affichage de sa part dans son historique privé du studio.
   ------------------------------------------------------------ */
export function scopedLedger(ledger: LedgerEntry[], user: User | null | undefined): LedgerEntry[] {
  if (!user) return [];
  if (user.isAdmin) return ledger;
  return ledger.filter((e) => e.creatorId === user.id || e.buyerId === user.id);
}

export type PrivateNotification =
  | { kind: "transaction"; id: string; date: string; entry: LedgerEntry }
  | { kind: "favorite"; id: string; date: string; event: FavoriteEvent };

/** Filtrage AVANT le tri et le comptage : aucun titre, montant ou badge
 * d'une notification appartenant à un tiers ne fuit dans l'interface. */
export function privateNotifications(db: DB, user: User | null): PrivateNotification[] {
  if (!user) return [];
  const transactions: PrivateNotification[] = scopedLedger(db.ledger, user)
    .map((entry) => ({ kind: "transaction", id: entry.id, date: entry.date, entry }));
  const favorites: PrivateNotification[] = (db.favoriteEvents ?? [])
    .filter((event) => event.creatorId === user.id || user.isAdmin)
    .map((event) => ({ kind: "favorite", id: event.id, date: event.date, event }));
  return [...transactions, ...favorites].sort((a, b) => +new Date(b.date) - +new Date(a.date));
}
