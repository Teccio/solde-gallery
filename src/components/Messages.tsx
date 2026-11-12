/* ============================================================
   MODULE ISOLÉ — Messages privés (tableau de bord de chaque compte)
   · onglet « Messages » pour les comptes Basique et Créateur
   · simulation d'échanges (Option A) : réponse fictive différée
   · chaque message est horodaté
   · RÈGLE MÉTIER : auto-suppression locale au-delà de 30 jours
     calendaires (purgation effectuée dans le store au chargement)
   ============================================================ */
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui-context";
import type { Message } from "../lib/types";
import type { Lang } from "../lib/types";
import { Avatar, Icon, Modal, Tag, inputCls } from "./ui";
import { cn } from "../utils/cn";

const REPLY_TEMPLATES: Record<Lang, string[]> = {
  fr: [
    "Bien reçu ! Je te reviens ce soir avec le détail.",
    "Merci pour ton message, on s'appelle pour en parler ?",
    "Parfait, je note. On se cale ça cette semaine.",
  ],
  ht: [
    "Mwen resev li ! Mwen ap tounen pou ou aswè a.",
    "Mèsi pou mesaj ou a, n ap rele pou pale l ?",
    "Pafè, mwen nòte l. N ap kòdone sa a semèn sa a.",
  ],
  en: [
    "Got it! I'll get back to you tonight with the details.",
    "Thanks for the message — shall we call about it?",
    "Great, noted. Let's set it up this week.",
  ],
  es: [
    "¡Recibido! Te respondo esta noche con los detalles.",
    "Gracias por el mensaje, ¿lo hablamos por teléfono?",
    "Perfecto, anotado. Lo programamos esta semana.",
  ],
};

/* ------------------------------------------------------------------
   MODULE Message Direct — fenêtre de chat privée ouverte depuis le
   bouton « Message » d'un profil public. Les messages envoyés ici
   alimentent le même registre (donc le même onglet Messages et la
   même purge à 30 jours calendaires) que le reste de la messagerie.
   ------------------------------------------------------------------ */
export function DirectMessageModal({ userId }: { userId: string }) {
  const { close } = useUI();
  const { user, userById, messagesOf, sendMessage, addMessage, lang, t } = useStore();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const target = userById(userId);
  const list = user ? messagesOf(user.id) : [];
  const thread = useMemo(
    () =>
      list
        .filter((m) => m.fromId === userId || m.toId === userId)
        .sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    [list, userId],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread.length]);
  useEffect(() => () => timers.current.forEach((h) => window.clearTimeout(h)), []);

  if (!user || !target) return null;

  /* Envoi + réponse fictive différée, dans la langue active (Option A) */
  const send = () => {
    const body = text.trim();
    if (!body) return;
    sendMessage(userId, body);
    setText("");
    timers.current.push(
      window.setTimeout(() => {
        const pool = REPLY_TEMPLATES[lang];
        addMessage({
          toId: user.id,
          fromId: userId,
          fromName: target.name,
          text: pool[Math.floor(Math.random() * pool.length)],
        });
      }, 1600),
    );
  };

  const locale = lang === "en" ? "en" : lang === "es" ? "es" : "fr-FR";

  return (
    <Modal
      open
      onClose={close}
      width="max-w-lg"
      title={target.name}
      subtitle={`${target.city} · ${t("msg.keep")}`}
    >
      <div className="mb-3 flex items-center gap-3 rounded-2xl border border-line bg-surface2 p-3">
        <Avatar name={target.name} hue={target.hue} size={40} />
        <p className="text-[12px] leading-relaxed text-muted">{t("msg.simulated")}</p>
      </div>

      <div className="h-[260px] space-y-3 overflow-y-auto rounded-2xl border border-line p-3">
        {thread.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <Icon name="chat" className="mx-auto h-7 w-7 text-muted" />
              <p className="mt-2 text-[13px] text-muted">{t("msg.empty")}</p>
            </div>
          </div>
        ) : (
          thread.map((m) => {
            const mine = m.fromId === user.id;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[82%] rounded-2xl px-3.5 py-2", mine ? "bg-accent text-accentink" : "border border-line bg-surface2 text-inksoft")}>
                  <p className="text-[13px] leading-relaxed">{m.text}</p>
                  <p className={cn("mt-1 text-[10px] tabular-nums", mine ? "text-accentink/70" : "text-muted")}>
                    {new Date(m.date).toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-3 flex items-center gap-2"
      >
        <input autoFocus className={cn(inputCls, "h-11")} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("msg.placeholder")} />
        <button type="submit" aria-label="Envoyer" className="focus-ring btn-accent grid h-11 w-11 shrink-0 place-items-center rounded-full">
          <Icon name="send" className="h-4 w-4" />
        </button>
      </form>
    </Modal>
  );
}

/* `embedded` : rendu à l'intérieur de l'onglet « Messages » du compte
   (espacement réduit) — la boîte reste masquée tant que l'onglet est fermé. */
export function MessagesPanel({ embedded = false }: { embedded?: boolean } = {}) {
  const { user, userById, messagesOf, sendMessage, addMessage, t, lang, db } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const list = user ? messagesOf(user.id) : [];

  /* Regroupement par contact (l'autre partie de chaque message) */
  const threads = useMemo(() => {
    if (!user) return [];
    const map = new Map<string, { last: Message; count: number; otherName: string }>();
    list.forEach((m) => {
      const other = m.fromId === user.id ? m.toId : m.fromId;
      const name = userById(other)?.name ?? (m.fromId === user.id ? m.fromName : "Contact");
      const cur = map.get(other);
      const lastDate = cur ? +new Date(cur.last.date) : 0;
      if (!cur || +new Date(m.date) >= lastDate) map.set(other, { last: m, count: (cur?.count ?? 0) + 1, otherName: name });
      else map.set(other, { ...cur, count: cur.count + 1 });
    });
    return [...map.entries()].sort((a, b) => +new Date(b[1].last.date) - +new Date(a[1].last.date));
  }, [list, user, userById]);

  const thread = useMemo(
    () =>
      activeId
        ? list
            .filter((m) => (user ? (m.fromId === user.id ? m.toId : m.fromId) : "") === activeId)
            .sort((a, b) => +new Date(a.date) - +new Date(b.date))
        : [],
    [list, activeId, user],
  );

  if (!user) return null;

  /* Simulation d'échanges (Option A) : le contact répond de façon
     fictive, dans la langue active, après un court délai. */
  const send = () => {
    const body = text.trim();
    if (!body || !activeId) return;
    sendMessage(activeId, body);
    setText("");
    const to = activeId;
    window.setTimeout(() => {
      const pool = REPLY_TEMPLATES[lang];
      addMessage({
        toId: user.id,
        fromId: to,
        fromName: userById(to)?.name ?? "Contact",
        text: pool[Math.floor(Math.random() * pool.length)],
      });
    }, 1600);
  };

  const activeUser = activeId ? userById(activeId) : undefined;

  return (
    <section className={embedded ? "pt-5" : "mt-9"}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* En mode onglet, le bouton « Messages » sert déjà de titre */}
        {!embedded && (
          <div>
            <p className="mb-1 text-[10.5px] font-bold tracking-[0.18em] text-accent uppercase">Privé</p>
            <h2 className="font-display text-[24px] leading-tight font-semibold tracking-tight text-ink">{t("profile.messages")}</h2>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Tag color="var(--clock-color, var(--muted))">{t("msg.keep")}</Tag>
          <Tag color="var(--info)">{t("msg.simulated")}</Tag>
        </div>
      </div>

      <div className="card grid overflow-hidden md:grid-cols-[260px_minmax(0,1fr)]">
        {/* Colonne contacts */}
        <div className="max-h-[420px] overflow-y-auto border-b border-line md:border-r md:border-b-0">
          {threads.length === 0 ? (
            <p className="p-5 text-[13px] text-muted">{t("msg.empty")}</p>
          ) : (
            threads.map(([id, th]) => {
              const u = userById(id);
              const unread = th.last.fromId !== user.id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveId(id)}
                  className={cn(
                    "focus-ring flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition",
                    activeId === id ? "border-accent bg-accentsoft" : "border-transparent hover:bg-surface2",
                  )}
                >
                  <Avatar name={th.otherName} hue={u?.hue ?? 210} size={38} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-ink">{th.otherName}</span>
                    <span className="block truncate text-[12px] text-muted">
                      {unread ? "· " : ""}
                      {th.last.text}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10.5px] text-muted">
                    {new Date(th.last.date).toLocaleDateString(lang === "en" ? "en" : lang === "es" ? "es" : "fr-FR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Colonne conversation */}
        <div className="flex min-h-[320px] flex-col">
          {!activeId ? (
            <div className="grid flex-1 place-items-center p-8 text-center">
              <div>
                <Icon name="chat" className="mx-auto h-8 w-8 text-muted" />
                <p className="mt-3 text-[13px] text-muted">{t("msg.empty")}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <Avatar name={activeUser?.name ?? "?"} hue={activeUser?.hue ?? 210} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{activeUser?.name}</p>
                  <p className="text-[11px] text-muted">{activeUser?.city}</p>
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: 260 }}>
                {thread.map((m) => {
                  const mine = m.fromId === user.id;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-3.5 py-2",
                          mine ? "bg-accent text-accentink" : "border border-line bg-surface2 text-inksoft",
                        )}
                      >
                        <p className="text-[13px] leading-relaxed">{m.text}</p>
                        {/* Marqueur de date obligatoire sur chaque message */}
                        <p className={cn("mt-1 text-[10px] tabular-nums", mine ? "text-accentink/70" : "text-muted")}>
                          {new Date(m.date).toLocaleString(lang === "en" ? "en" : lang === "es" ? "es" : "fr-FR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex items-center gap-2 border-t border-line p-3"
              >
                <input
                  className={cn(inputCls, "h-10")}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t("msg.placeholder")}
                />
                <button type="submit" aria-label="Envoyer" className="focus-ring btn-accent grid h-10 w-10 shrink-0 place-items-center rounded-full">
                  <Icon name="send" className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      <p className="mt-2 text-[11.5px] text-muted">
        {db.messages.length} message{db.messages.length > 1 ? "s" : ""} en mémoire locale · purge automatique à 30 jours.
      </p>
    </section>
  );
}
