import { MUSEUM_ADMIN_RATE } from "./types";
import type { LedgerEntry, User } from "./types";

/** Lecture du registre uniquement : aucune commission n'est recalculée
 * pour un paiement passé et aucun portefeuille n'est modifié. */
export function transactionBreakdown(entry: LedgerEntry, viewer: User) {
  const museum = entry.museumShare ?? (entry.museumId
    ? Math.min(entry.commission, Math.round(entry.amount * MUSEUM_ADMIN_RATE * 100) / 100)
    : 0);
  const platform = Math.max(0, entry.commission - museum);
  const authorNet = entry.amount - entry.commission;
  const net = viewer.isAdmin
    ? platform
    : (entry.creatorId === viewer.id ? authorNet : 0) + (entry.museumOwnerId === viewer.id ? museum : 0);
  return { museum, platform, authorNet, net };
}

export function feePercent(part: number, total: number): string {
  return total > 0
    ? `${((part / total) * 100).toFixed(2).replace(/\.00$/, "").replace(".", ",")} %`
    : "0 %";
}