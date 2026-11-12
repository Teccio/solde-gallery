/* ============================================================
   MODULE ISOLÉ — Cloche de notifications du Header global
   ------------------------------------------------------------
   · Icône cloche filaire dorée, placée à côté du solde.
   · Au clic : panneau des flux récents du registre local —
       · don (Mécénat) : « X a fait un don de 250 HTG »
       · achat : « Y a acheté l'œuvre Z » + montant
   · Badge discret des flux non lus (repère localStorage dédié).
   · Aucune modification du lecteur, des filtres, de la bibliothèque
     ou de la messagerie.
   ============================================================ */
import { useEffect, useRef } from "react";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui-context";
import { makeTr } from "../lib/l10n";
import { countUnread, markAllSeen, saleProvenance, privateNotifications, useNotificationSeen } from "../lib/notifications";
import { isHeaderToggle } from "../lib/header-interactions";
import { htg } from "../lib/types";
import type { LedgerEntry } from "../lib/types";
import { Button, Icon, Tag } from "./ui";
import { Avatar } from "./ui";
import { cn } from "../utils/cn";

const LOCALES: Record<string, string> = { fr: "fr-FR", ht: "fr-FR", en: "en-US", es: "es-ES" };

function shortDate(iso: string, lang: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now.getTime() - 864e5).toDateString() === d.toDateString();
  if (sameDay) return lang === "ht" ? "Jodi a" : lang === "en" ? "Today" : lang === "es" ? "Hoy" : "Aujourd'hui";
  if (yesterday) return lang === "ht" ? "Yè" : lang === "en" ? "Yesterday" : lang === "es" ? "Ayer" : "Hier";
  return d.toLocaleDateString(LOCALES[lang] ?? "fr-FR", { day: "2-digit", month: "short" });
}

/** Bouton cloche (avec badge) — inséré dans le Header global.
    Le compteur ne compte QUE les flux privés du compte connecté (vendeur
    ou administrateur) : un tiers ne voit jamais de badge pour un achat
    d'autrui. */
export function NotificationBell({ active, onClick }: { active: boolean; onClick: () => void }) {
  const { db, t, user } = useStore();
  const seen = useNotificationSeen(user?.id);
  const unread = countUnread(privateNotifications(db, user), seen);

  return (
    <button
      onClick={onClick}
      aria-label={t("notif.title")}
      aria-expanded={active}
      data-testid="notification-bell"
      data-header-toggle="notifications"
      aria-controls="notifications-panel"
      className={cn(
        "focus-ring relative grid h-10 w-10 shrink-0 place-items-center rounded-full border transition",
        active ? "border-accent bg-accentsoft" : "border-line text-inksoft hover:border-accent hover:bg-accentsoft",
      )}
      style={{ color: "var(--gold)" }}
    >
      <Icon name="bell" className="h-[18px] w-[18px]" />
      {unread > 0 && (
        <span
          data-testid="notification-unread"
          className="absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-ivory px-1 text-[10px] font-bold tabular-nums text-accentink"
          style={{ background: "var(--accent-color)" }}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}

/** Panneau déroulant des flux récents. */
export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { db, lang, t, user, userById } = useStore();
  const { navigate, open, openPrivateHistory } = useUI();
  const tr = makeTr(lang);
  /* CONFIDENTIALITÉ : le panneau n'affiche que les flux privés du compte
     connecté (ses propres ventes/dons) — l'administrateur voit tout,
     un tiers ou un visiteur ne voit rien. */
  const allFlows = privateNotifications(db, user);
  const flows = allFlows.slice(0, 8);
  const seen = useNotificationSeen(user?.id);
  const ref = useRef<HTMLDivElement>(null);
  const { route } = useUI();

  /* Cohérence avec les autres panneaux d'en-tête : fermeture au clic
     extérieur, à Échap et à chaque changement de page. */
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (isHeaderToggle(e.target)) return;
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  const initialRoute = useRef(route);
  useEffect(() => {
    if (route === initialRoute.current) return;
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  const markRead = () => {
    markAllSeen(user?.id);
  };

  const flowText = (e: LedgerEntry) => {
    const amount = htg(e.amount).replace(/\u202f|\u00a0/g, " ");
    if (e.type === "don") {
      const recipient = userById(e.creatorId)?.name ?? tr("un créateur", "yon kreyatè", "a creator", "un creador");
      if (user?.id === e.buyerId) {
        return tr(
          `Vous venez de faire un don de ${amount} à l'artiste ${recipient}`,
          `Ou fèk fè yon don ${amount} bay atis ${recipient}`,
          `You just donated ${amount} to artist ${recipient}`,
          `Acabas de donar ${amount} al artista ${recipient}`,
        );
      }
      if (user?.id === e.creatorId) {
        return tr(
          `${e.buyerName} t'a fait un don de ${amount}`,
          `${e.buyerName} fè w yon don ${amount}`,
          `${e.buyerName} donated ${amount} to you`,
          `${e.buyerName} te donó ${amount}`,
        );
      }
      const tpl = {
        fr: `${e.buyerName} a fait un don de ${amount}`,
        ht: `${e.buyerName} fè yon don ${amount}`,
        en: `${e.buyerName} made a donation of ${amount}`,
        es: `${e.buyerName} hizo una donación de ${amount}`,
      }[lang];
      return tpl;
    }
    const title = e.workTitle ?? e.snapshot?.title ?? tr("une œuvre", "yon zèv", "a work", "una obra");
    if (user?.id === e.buyerId) {
      return tr(
        `Vous venez d'acheter l'œuvre « ${title} »`,
        `Ou fèk achte zèv « ${title} »`,
        `You just bought the work “${title}”`,
        `Acabas de comprar la obra «${title}»`,
      );
    }
    const base = {
      fr: `${e.buyerName} a acheté « ${title} »`,
      ht: `${e.buyerName} achte zèv « ${title} »`,
      en: `${e.buyerName} bought the work “${title}”`,
      es: `${e.buyerName} compró la obra «${title}»`,
    }[lang];
    /* Provenance ajoutée uniquement pour le créateur qui reçoit le revenu. */
    if (user?.id === e.creatorId) {
      const origin = saleProvenance(e, e.museumId ? db.museums.find((m) => m.id === e.museumId)?.title : undefined, lang);
      if (origin) return `${base} — ${origin}`;
    }
    return base;
  };

  return (
    <div
      ref={ref}
      id="notifications-panel"
      data-testid="notifications-panel"
      className="pop fixed top-[68px] right-3 left-3 z-[90] max-h-[calc(100vh-120px)] overflow-y-auto rounded-2xl border border-line bg-overlay p-4 shadow-[var(--shadow-lg)] sm:left-auto sm:w-[380px]"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[10.5px] font-bold tracking-[0.18em] text-muted uppercase">
          <Icon name="bell" className="h-4 w-4 text-accent" /> {t("notif.title")}
        </p>
        {countUnread(allFlows, seen) > 0 && (
          <button onClick={markRead} className="focus-ring rounded-full px-2 py-1 text-[11px] font-semibold text-accent hover:bg-accentsoft">
            {t("notif.markRead")}
          </button>
        )}
      </div>

      {flows.length === 0 ? (
        <div className="py-6 text-center">
          <Icon name="lock" className="mx-auto h-6 w-6 text-muted" />
          <p className="mt-2 text-[13px] text-muted">
            {user ? t("notif.private") : t("notif.login")}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {flows.map((flow) => {
            const entry = flow.kind === "transaction" ? flow.entry : null;
            const favorite = flow.kind === "favorite" ? flow.event : null;
            const actorName = favorite?.actorName ?? entry!.buyerName;
            const actor = userById(favorite?.actorId ?? entry!.buyerId);
            const isDon = entry?.type === "don";
            const icon = favorite || isDon ? "heart" : "bag";
            const color = favorite || isDon ? "var(--hibiscus)" : "var(--accent-color)";
            const unread = +new Date(flow.date) > seen;
            const text = favorite ? tr(
              `${actorName} a ajouté votre œuvre « ${favorite.workTitle} » à ses favoris`,
              `${actorName} ajoute zèv ou « ${favorite.workTitle} » nan favori li`,
              `${actorName} added your work “${favorite.workTitle}” to their favorites`,
              `${actorName} añadió tu obra «${favorite.workTitle}» a sus favoritos`,
            ) : flowText(entry!);
            return (
              <button
                key={flow.id}
                data-notification-id={flow.id}
                data-notification-type={favorite ? "favorite" : isDon ? "donation" : "sale"}
                onClick={() => {
                  onClose();
                  if (entry) {
                    const maySeeSellerHistory = user?.isAdmin || entry.creatorId === user?.id || entry.museumOwnerId === user?.id;
                    if (maySeeSellerHistory) openPrivateHistory(entry.id);
                    else navigate("/achats");
                  } else if (favorite) open({ type: "work", id: favorite.workId, source: "none" });
                }}
                className={cn(
                  "focus-ring flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-surface2",
                  unread && "bg-accentsoft/60",
                )}
              >
                <span className="relative shrink-0">
                  <Avatar name={actorName} hue={actor?.hue ?? 40} size={34} />
                  <span
                    className="absolute -right-1 -bottom-1 grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-overlay"
                    style={{ background: color }}
                  >
                    <Icon name={icon} className="h-2.5 w-2.5 text-white" strokeWidth={2.2} />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] leading-relaxed text-inksoft">{text}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Tag color={color}>
                      {favorite ? t("nav.favorites") : isDon ? t("notif.don") : t("notif.purchase")}
                    </Tag>
                    {entry && !isDon && <span className="font-display text-[13px] font-semibold text-ink">{htg(entry.amount)}</span>}
                    <span className="text-[11px] text-muted">· {shortDate(flow.date, lang)}</span>
                  </span>
                </span>
                {unread && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
              </button>
            );
          })}
        </div>
      )}

      {user && <div className="mt-3 border-t border-line pt-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          icon="bag"
          onClick={() => {
            onClose();
            openPrivateHistory();
          }}
        >
          {tr("Historique de mes revenus", "Istorik revni mwen", "My income history", "Historial de mis ingresos")}
        </Button>
      </div>}
    </div>
  );
}
