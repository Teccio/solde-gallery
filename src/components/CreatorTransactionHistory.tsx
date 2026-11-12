import { useState } from "react";
import { useStore } from "../lib/store";
import { htg } from "../lib/types";
import type { User } from "../lib/types";
import { makeTr } from "../lib/l10n";
import { saleProvenance } from "../lib/notifications";
import { transactionBreakdown, feePercent as percent } from "../lib/transaction-details";
import { Icon } from "./ui";
import { cn } from "../utils/cn";

/* Historique strictement privé : ce composant n'est monté que dans le
   Studio du créateur connecté. Les pourcentages sont calculés à partir
   des montants réellement enregistrés, sans modifier la répartition. */
export function CreatorTransactionHistory({ user }: { user: User }) {
  const { db, lang } = useStore();
  const tr = makeTr(lang);
  const [expanded, setExpanded] = useState<string | null>(null);
  const entries = db.ledger
    .filter((e) => e.creatorId === user.id || (e.museumOwnerId === user.id && (e.museumShare ?? 0) > 0))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return (
    <section className="card p-5" data-testid="creator-transaction-history">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[17px] font-semibold text-ink">
            {tr("Historique privé des transactions", "Istorik prive tranzaksyon yo", "Private transaction history", "Historial privado de transacciones")}
          </h3>
          <p className="mt-1 text-[11.5px] text-muted">
            {tr("Détail des frais réservé au bénéficiaire", "Detay frè yo rezève pou moun ki resevwa lajan an", "Fee details visible only to the recipient", "Detalle de comisiones solo para el beneficiario")}
          </p>
        </div>
        <Icon name="lock" className="h-4 w-4 shrink-0 text-accent" />
      </div>

      {entries.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-muted">
          {tr("Aucune transaction pour l'instant.", "Poko gen tranzaksyon.", "No transactions yet.", "Aún no hay transacciones.")}
        </p>
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {entries.map((e) => {
            const fees = transactionBreakdown(e, user);
            const open = expanded === e.id;
            const affiliationOnly = e.creatorId !== user.id;
            const origin = affiliationOnly
              ? null
              : saleProvenance(e, e.museumId ? db.museums.find((m) => m.id === e.museumId)?.title : undefined, lang);
            const label = affiliationOnly
              ? tr("Affiliation musée", "Afilyasyon mize", "Museum affiliation", "Afiliación de museo")
              : e.type === "don"
                ? tr("Don reçu", "Don resevwa", "Donation received", "Donación recibida")
                : tr("Vente de votre œuvre", "Vant zèv ou", "Sale of your work", "Venta de su obra");
            return (
              <div key={e.id} className="overflow-hidden rounded-xl border border-line">
                <button
                  onClick={() => setExpanded(open ? null : e.id)}
                  aria-expanded={open}
                  className="focus-ring flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-surface2"
                >
                  <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", e.type === "don" ? "bg-hibiscus/12 text-hibiscus" : "bg-accentsoft text-accent")}>
                    <Icon name={affiliationOnly ? "globe" : e.type === "don" ? "heart" : "bag"} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{e.workTitle ?? label}</span>
                    <span className="block truncate text-[11.5px] text-muted">{label} · {e.buyerName} · {new Date(e.date).toLocaleDateString(lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "fr-FR")}</span>
                    {origin && (
                      <span className="mt-0.5 flex w-fit items-center gap-1 text-[11px] font-medium text-sea">
                        <Icon name={e.museumId ? "globe" : "flame"} className="h-3 w-3 shrink-0" /> <span className="truncate">{origin}</span>
                      </span>
                    )}
                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-accent">
                      {tr("Détail des frais", "Detay frè yo", "Fee details", "Detalle de comisiones")}
                      <Icon name="chevronDown" className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[13px] font-semibold text-ink">{htg(e.amount)}</span>
                    <span className="block text-[11px] font-semibold text-success">+{htg(fees.net)}</span>
                  </span>
                </button>
                {open && (
                  <dl className="space-y-2 border-t border-line bg-surface2 px-3 py-3 text-[12px]" data-testid="creator-fee-details">
                    <div className="flex justify-between gap-3"><dt className="text-muted">{tr("Montant envoyé", "Montan voye", "Amount sent", "Monto enviado")}</dt><dd className="font-semibold text-ink">{htg(e.amount)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted">{tr("Plateforme", "Platfòm", "Platform", "Plataforma")} · {percent(fees.platform, e.amount)}</dt><dd className="font-semibold text-ink">−{htg(fees.platform)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted">{tr("Musée", "Mize", "Museum", "Museo")} · {percent(fees.museum, e.amount)}</dt><dd className="font-semibold text-ink">−{htg(fees.museum)}</dd></div>
                    <div className="flex justify-between gap-3 border-t border-line pt-2"><dt className="font-semibold text-ink">{tr("Crédité sur votre wallet", "Kredite sou wallet ou", "Credited to your wallet", "Acreditado en su billetera")}</dt><dd className="font-semibold text-success">{htg(fees.net)}</dd></div>
                  </dl>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
