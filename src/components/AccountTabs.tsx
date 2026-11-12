import { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { ACCOUNT_TAB_EVENT, consumeAccountTab } from "../lib/account-tab";
import type { AccountTab } from "../lib/account-tab";
import { Icon } from "./ui";
import { Reveal } from "./Reveal";
import { LibraryPanel } from "./Library";
import { MessagesPanel } from "./Messages";
import { cn } from "../utils/cn";

/* ============================================================
   MODULE ISOLÉ — Onglets de l'espace personnel (compte connecté)
   · « Bibliothèque » : ouverte par défaut, cartes des œuvres
     acquises (stockage local) ;
   · « Messages » : boîte privée MASQUÉE par défaut ; elle ne se
     déroule qu'au clic sur son bouton (re-clic = repli) ;
   · un seul panneau ouvert à la fois (comportement d'onglet).
   ============================================================ */
export function AccountTabs() {
  const { user, messagesOf, purchasesOf, t } = useStore();
  const [tab, setTab] = useState<AccountTab | null>(() => consumeAccountTab() ?? "library");
  const ref = useRef<HTMLElement>(null);

  /* Ouverture ciblée depuis l'en-tête (portefeuille / menu du profil) */
  useEffect(() => {
    const onTab = (e: Event) => {
      consumeAccountTab();
      setTab((e as CustomEvent<AccountTab>).detail);
      window.setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    };
    window.addEventListener(ACCOUNT_TAB_EVENT, onTab);
    return () => window.removeEventListener(ACCOUNT_TAB_EVENT, onTab);
  }, []);

  if (!user) return null;

  const libraryCount = new Set(purchasesOf(user.id).map((e) => e.workId).filter(Boolean)).size;
  const threadCount = new Set(messagesOf(user.id).map((m) => (m.fromId === user.id ? m.toId : m.fromId))).size;
  const toggle = (k: AccountTab) => setTab((cur) => (cur === k ? null : k));

  const tabs: { k: AccountTab; icon: string; label: string; count: number; panel: string }[] = [
    { k: "library", icon: "library", label: t("nav.library"), count: libraryCount, panel: "account-library" },
    { k: "messages", icon: "chat", label: t("profile.messages"), count: threadCount, panel: "account-messages" },
  ];

  return (
    <section ref={ref} className="mt-6 scroll-mt-[120px]" aria-label={t("account.private")}>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface/80 p-1.5 shadow-[var(--shadow-sm)] backdrop-blur-sm">
        {tabs.map((x) => {
          const active = tab === x.k;
          return (
            <button
              key={x.k}
              onClick={() => toggle(x.k)}
              aria-expanded={active}
              aria-controls={x.panel}
              data-testid={`account-tab-${x.k}`}
              className={cn(
                "focus-ring inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold transition-all duration-200",
                active ? "bg-accent text-accentink shadow-[var(--shadow-sm)]" : "text-inksoft hover:bg-accentsoft hover:text-ink",
              )}
            >
              <Icon name={x.icon} className="h-[18px] w-[18px]" />
              {x.label}
              <span
                className={cn(
                  "min-w-[22px] rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums",
                  active ? "bg-black/15" : "bg-surface2 text-muted",
                )}
              >
                {x.count}
              </span>
              <Icon name="chevronDown" className={cn("h-3.5 w-3.5 transition-transform duration-300", active && "rotate-180")} />
            </button>
          );
        })}
        <span className="ml-auto hidden items-center gap-1.5 pr-2 text-[11.5px] text-muted sm:flex">
          <Icon name="shield" className="h-3.5 w-3.5 text-accent" /> {t("account.private")}
        </span>
      </div>

      <Reveal open={tab === "library"} id="account-library">
        <div className="pt-5">
          <LibraryPanel />
        </div>
      </Reveal>
      <Reveal open={tab === "messages"} id="account-messages">
        <MessagesPanel embedded />
      </Reveal>
    </section>
  );
}
