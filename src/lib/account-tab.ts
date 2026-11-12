/* ============================================================
   Canal d'ouverture ciblée des onglets de l'espace personnel.
   Permet à l'en-tête (portefeuille, menu du profil) d'ouvrir
   directement « Bibliothèque » ou « Messages » :
   · si la page du compte est déjà affichée → évènement DOM ;
   · sinon → intention mémorisée, lue au montage de la page.
   ============================================================ */
export type AccountTab = "library" | "messages";

export const ACCOUNT_TAB_EVENT = "solde:account-tab";

let pending: AccountTab | null = null;

export function requestAccountTab(tab: AccountTab) {
  pending = tab;
  window.dispatchEvent(new CustomEvent<AccountTab>(ACCOUNT_TAB_EVENT, { detail: tab }));
}

export function consumeAccountTab(): AccountTab | null {
  const t = pending;
  pending = null;
  return t;
}
