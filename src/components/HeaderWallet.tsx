import { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui-context";
import { MIN_WITHDRAWAL } from "../lib/types";
import { requestAccountTab } from "../lib/account-tab";
import { Button, Icon } from "./ui";
import { cn } from "../utils/cn";

/* ============================================================
   MODULE ISOLÉ — Solde du portefeuille dans l'en-tête global
   · affiché en permanence, en haut à droite, sur TOUTES les pages
     et tous les univers dès qu'un utilisateur est connecté
     (Basique, Créateur ou Premium) ;
   · lit directement `user.wallet` dans le store : chaque crédit
     (vente, don, affiliation musée) ou débit (retrait) se reflète
     instantanément, avec un indicateur éphémère « +X HTG » ;
   · au clic : panneau « Mon Portefeuille SOLDE » (retrait,
     bibliothèque, derniers mouvements).
   ============================================================ */

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export function HeaderWallet() {
  const { user, db, t } = useStore();
  const { open, navigate, route } = useUI();
  const [panel, setPanel] = useState(false);
  const [delta, setDelta] = useState<{ v: number; k: number } | null>(null);
  const prev = useRef<{ id: string; wallet: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  /* Variation en temps réel — uniquement pour le même compte
     (un changement de profil de test ne déclenche pas d'animation). */
  useEffect(() => {
    if (!user) {
      prev.current = null;
      return;
    }
    const p = prev.current;
    prev.current = { id: user.id, wallet: user.wallet };
    if (p && p.id === user.id && Math.abs(user.wallet - p.wallet) >= 0.01) {
      setDelta({ v: user.wallet - p.wallet, k: Date.now() });
      const id = window.setTimeout(() => setDelta(null), 2600);
      return () => window.clearTimeout(id);
    }
  }, [user?.id, user?.wallet]);

  /* Fermeture : clic extérieur, Échap, ou changement de page */
  useEffect(() => {
    if (!panel) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setPanel(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [panel]);
  useEffect(() => setPanel(false), [route]);

  if (!user) return null;

  /* Derniers mouvements du portefeuille : ventes et dons nets de commission,
     parts d'affiliation de musée (administrateur Premium), retraits. */
  const moves = [
    ...db.ledger
      .filter((e) => e.creatorId === user.id)
      .map((e) => ({
        id: e.id,
        label: e.type === "don" ? t("wallet.don") : (e.workTitle ?? t("wallet.sale")),
        v: e.amount - e.commission,
        date: e.date,
      })),
    ...db.ledger
      .filter((e) => e.museumOwnerId === user.id && (e.museumShare ?? 0) > 0)
      .map((e) => ({ id: `${e.id}-m`, label: `${t("wallet.museum")} · ${e.workTitle ?? ""}`, v: e.museumShare ?? 0, date: e.date })),
    ...db.withdrawals
      .filter((w) => w.userId === user.id)
      .map((w) => ({ id: w.id, label: t("wallet.withdrawal"), v: -w.amount, date: w.date })),
  ]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 3);

  const go = (fn: () => void) => {
    setPanel(false);
    fn();
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setPanel((v) => !v)}
        aria-expanded={panel}
        aria-label={`${t("wallet.title")} — ${t("wallet.balance")} ${fmt(user.wallet)} HTG`}
        data-testid="header-wallet"
        className={cn(
          "focus-ring flex h-10 shrink-0 items-center gap-1 rounded-full border px-2.5 transition-colors duration-200 sm:gap-1.5 sm:px-3",
          panel ? "border-accent bg-accentsoft" : "border-accent/35 bg-surface hover:border-accent hover:bg-accentsoft",
          delta && "wallet-bump",
        )}
      >
        <Icon name="wallet" className="h-[17px] w-[17px] text-accent" />
        <span className="hidden text-[10.5px] font-bold tracking-[0.12em] text-muted uppercase sm:inline">{t("wallet.balance")}</span>
        <span className="truncate font-display text-[14px] font-semibold text-ink tabular-nums">
          {fmt(user.wallet)}
          <span className="hidden xs:inline sm:inline"> HTG</span>
        </span>
      </button>

      {delta && (
        <span
          key={delta.k}
          className="wallet-delta pointer-events-none absolute top-full right-1 mt-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap shadow-[var(--shadow-sm)]"
          style={{
            color: delta.v > 0 ? "var(--success)" : "var(--danger)",
            background: "var(--overlay)",
            borderColor: `color-mix(in srgb, ${delta.v > 0 ? "var(--success)" : "var(--danger)"} 35%, transparent)`,
          }}
        >
          {delta.v > 0 ? "+" : "−"}
          {fmt(Math.abs(delta.v))} HTG
        </span>
      )}

      {panel && (
        <div className="pop fixed top-[68px] right-3 left-3 z-[90] rounded-2xl border border-line bg-overlay p-4 shadow-[var(--shadow-lg)] sm:left-auto sm:w-[330px]">
          <p className="flex items-center gap-2 text-[10.5px] font-bold tracking-[0.18em] text-muted uppercase">
            <Icon name="wallet" className="h-4 w-4 text-accent" /> {t("wallet.title")}
          </p>
          <p className="mt-3 font-display text-[34px] leading-none font-semibold text-ink tabular-nums">
            {fmt(user.wallet)} <span className="text-[18px] text-accent">HTG</span>
          </p>
          <p className="mt-1.5 text-[12px] text-muted">{t("wallet.hint")}</p>

          <div className="mt-4 space-y-2">
            <Button
              className="w-full"
              icon="walletArrow"
              disabled={user.wallet < MIN_WITHDRAWAL}
              onClick={() => go(() => open({ type: "withdraw" }))}
            >
              {t("action.withdraw")}
            </Button>
            {user.wallet < MIN_WITHDRAWAL && <p className="text-center text-[11.5px] text-muted">{t("wallet.min")}</p>}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                icon="library"
                onClick={() =>
                  go(() => {
                    navigate(`/profil/${user.id}`);
                    requestAccountTab("library");
                  })
                }
              >
                {t("nav.library")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={user.isCreator ? "grid" : "bag"}
                onClick={() => go(() => navigate(user.isCreator ? "/studio" : "/achats"))}
              >
                {user.isCreator ? t("nav.studio") : t("nav.purchases")}
              </Button>
            </div>
          </div>

          <div className="mt-4 border-t border-line pt-3">
            <p className="mb-1.5 text-[10.5px] font-bold tracking-[0.16em] text-muted uppercase">{t("wallet.moves")}</p>
            {moves.length === 0 ? (
              <p className="text-[12px] text-muted">{t("wallet.none")}</p>
            ) : (
              moves.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 py-1.5 text-[12.5px]">
                  <span className="min-w-0 truncate text-inksoft">{m.label}</span>
                  <span className={cn("shrink-0 font-semibold tabular-nums", m.v >= 0 ? "text-success" : "text-danger")}>
                    {m.v >= 0 ? "+" : "−"}
                    {fmt(Math.abs(m.v))} HTG
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
