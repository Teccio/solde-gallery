import { useStore } from "../lib/store";
import { useUI } from "../lib/ui-context";
import { makeTr } from "../lib/l10n";
import { htg } from "../lib/types";
import { scopedLedger, saleProvenance } from "../lib/notifications";
import { feePercent, transactionBreakdown } from "../lib/transaction-details";
import { Button, EmptyState, Icon } from "../components/ui";

/** Route privée ouverte depuis une notification. Le droit d'accès est
 * vérifié à chaque rendu, y compris après rechargement ou changement de profil. */
export function TransactionHistoryPage({ transactionId }: { transactionId?: string }) {
  const { db, user, lang, userById } = useStore();
  const { open, openPrivateHistory } = useUI();
  const tr = makeTr(lang);
  const locale = lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "fr-FR";

  if (!user) return (
    <EmptyState
      icon="lock"
      title={tr("Historique privé", "Istorik prive", "Private history", "Historial privado")}
      hint={tr("Connectez-vous pour consulter vos revenus.", "Konekte pou wè revni ou yo.", "Sign in to view your income.", "Inicia sesión para consultar tus ingresos.")}
      action={
        <Button onClick={() => open({ type: "auth", mode: "login" })}>{tr("Se connecter", "Konekte", "Sign in", "Iniciar sesión")}</Button>
      }
    />
  );

  const entries = scopedLedger(db.ledger, user).slice().sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const entry = entries.find((item) => item.id === transactionId || encodeURIComponent(item.id) === transactionId);
  if (transactionId && !entry) return (
    <EmptyState
      icon="lock"
      title={tr("Transaction privée ou indisponible", "Tranzaksyon prive oswa pa disponib", "Private or unavailable transaction", "Transacción privada o no disponible")}
      hint={tr("Seuls l'artiste bénéficiaire et l'administrateur du site peuvent consulter cette fiche.", "Se sèlman atis benefisyè a ak administratè sit la ki ka wè fich sa a.", "Only the recipient artist and the site administrator may view these details.", "Solo el artista beneficiario y el administrador pueden ver esta ficha.")}
    />
  );

  const fees = entry ? transactionBreakdown(entry, user) : null;
  const origin = entry ? saleProvenance(entry, db.museums.find((m) => m.id === entry.museumId)?.title, lang) : null;
  const donation = entry?.type === "don";
  const date = entry ? new Date(entry.date).toLocaleString(locale, {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }) : "";

  return (
    <section className="mx-auto max-w-4xl" data-testid="private-income-history">
      <p className="mb-2 flex items-center gap-2 text-[11px] font-bold tracking-[0.16em] text-accent uppercase">
        <Icon name="lock" className="h-4 w-4" /> {tr("Votre espace privé", "Espas prive ou", "Your private space", "Tu espacio privado")}
      </p>
      <h1 className="font-display text-[30px] font-semibold leading-tight text-ink sm:text-[36px]">
        {donation
          ? tr("Historique des gains", "Istorik revni", "Income history", "Historial de ingresos")
          : tr("Historique des ventes", "Istorik vant", "Sales history", "Historial de ventas")}
      </h1>
      <p className="mt-2 text-[13px] text-muted">
        {tr("Les détails des transactions restent réservés au vendeur et à l'administration.", "Detay tranzaksyon yo rezève pou vandè a ak administrasyon an.", "Transaction details are private to the seller and site administration.", "Los detalles son privados para el vendedor y la administración.")}
      </p>

      {entry && fees ? (
        <div className="card mt-6 overflow-hidden" data-testid="transaction-detail" data-transaction-id={entry.id}>
          <div className="flex flex-wrap items-start gap-4 border-b border-line px-5 py-5 sm:px-7">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accentsoft text-accent">
              <Icon name={donation ? "heart" : "bag"} className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                {donation ? tr("Don reçu", "Don resevwa", "Donation received", "Donación recibida") : tr("Vente confirmée", "Vant konfime", "Sale confirmed", "Venta confirmada")}
              </p>
              <h2 className="mt-1 break-words font-display text-[23px] font-semibold text-ink">
                {entry.workTitle ?? (donation ? tr("Mécénat", "Don", "Donation", "Mecenazgo") : entry.snapshot?.title)}
              </h2>
              {origin && <p className="mt-1 text-[12px] text-sea">{origin}</p>}
            </div>
            <span className="w-full pl-16 font-display text-[27px] font-semibold tabular-nums text-accent sm:w-auto sm:pl-0">{htg(entry.amount)}</span>
          </div>

          <div className="px-5 py-5 sm:px-7">
            <dl className="grid gap-5 border-b border-line pb-5 text-[13px] sm:grid-cols-2">
              <div><dt className="mb-1 text-muted">{tr("Date de la transaction", "Dat tranzaksyon an", "Transaction date", "Fecha de la transacción")}</dt><dd className="font-semibold text-ink"><time dateTime={entry.date}>{date}</time></dd></div>
              <div><dt className="mb-1 text-muted">{donation ? tr("Donateur", "Donatè", "Donor", "Donante") : tr("Acheteur", "Achtè", "Buyer", "Comprador")}</dt><dd className="font-semibold text-ink">{entry.buyerName}</dd></div>
              <div><dt className="mb-1 text-muted">{tr("Artiste bénéficiaire", "Atis benefisyè", "Recipient artist", "Artista beneficiario")}</dt><dd className="font-semibold text-ink">{userById(entry.creatorId)?.name ?? entry.snapshot?.creatorName}</dd></div>
              <div><dt className="mb-1 text-muted">{tr("Référence", "Referans", "Reference", "Referencia")}</dt><dd className="break-all font-mono text-[12px] text-inksoft">{entry.id}</dd></div>
            </dl>
            <h3 className="mt-5 mb-3 font-display text-[19px] font-semibold text-ink">{tr("Détail des frais déduits", "Detay frè yo retire", "Deducted fee breakdown", "Detalle de comisiones deducidas")}</h3>
            <dl className="space-y-3 text-[13px]" data-testid="transaction-fees">
              <div className="flex justify-between gap-3"><dt className="text-muted">{donation ? tr("Montant du don", "Montan don an", "Donation amount", "Monto de la donación") : tr("Prix de l'œuvre", "Pri zèv la", "Work price", "Precio de la obra")}</dt><dd className="font-semibold text-ink">{htg(entry.amount)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">{tr("Plateforme", "Platfòm", "Platform", "Plataforma")} · {feePercent(fees.platform, entry.amount)}</dt><dd className="font-semibold text-ink">−{htg(fees.platform)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">{tr("Musée", "Mize", "Museum", "Museo")} · {feePercent(fees.museum, entry.amount)}</dt><dd className="font-semibold text-ink">−{htg(fees.museum)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">{tr("Frais opérateur simulés", "Frè operatè simile", "Simulated operator fees", "Tarifas simuladas del operador")}</dt><dd className="font-semibold text-ink">{htg(entry.operatorFee)}</dd></div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-4"><dt className="font-semibold text-ink">{tr("Montant net reçu par l'artiste", "Montan nèt atis la resevwa", "Net amount received by the artist", "Monto neto recibido por el artista")}</dt><dd className="font-display text-[24px] font-semibold text-success">{htg(fees.authorNet)}</dd></div>
            </dl>
            <p className="mt-5 text-[11.5px] text-muted">{tr("Transaction simulée. Aucun paiement réel.", "Tranzaksyon simile. Okenn peman reyèl.", "Simulated transaction. No real payment.", "Transacción simulada. Ningún pago real.")}</p>
          </div>
        </div>
      ) : entries.length ? (
        <div className="card mt-6 divide-y divide-line overflow-hidden">
          {entries.map((item) => (
            <button key={item.id} onClick={() => openPrivateHistory(item.id)} className="focus-ring flex w-full items-center gap-3 p-4 text-left transition hover:bg-surface2">
              <Icon name={item.type === "don" ? "heart" : "bag"} className="h-5 w-5 text-accent" />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{item.workTitle ?? tr("Don reçu", "Don resevwa", "Donation received", "Donación recibida")}</span><span className="block text-[12px] text-muted">{item.buyerName} · {new Date(item.date).toLocaleDateString(locale)}</span></span>
              <span className="font-semibold text-ink">{htg(item.amount)}</span>
              <Icon name="chevronRight" className="h-4 w-4 text-muted" />
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-6"><EmptyState icon="bag" title={tr("Aucun revenu pour l'instant", "Poko gen revni", "No income yet", "Aún no hay ingresos")} /></div>
      )}
    </section>
  );
}