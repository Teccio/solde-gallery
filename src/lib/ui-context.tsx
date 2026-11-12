import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { trackWorkClick } from "./click-analytics";
import type { ClickSource } from "./click-analytics";

export type HeaderPanel = "none" | "palette" | "profile" | "museums" | "notifications";
type HistoryEntry = { route: string; notifications?: boolean };

/* Navigation par hash : compatible avec une intégration WordPress
   (aucune règle de réécriture serveur nécessaire). */
export type ModalState =
  | { type: "none" }
  | { type: "auth"; mode: "login" | "signup"; reason?: string }
  /* `museumId` = vitrine d'origine : déclenche la règle des 5 % à l'achat */
  /* `source` = provenance du clic pour le module analytique privé */
  | { type: "work"; id: string; museumId?: string; source?: ClickSource }
  | { type: "buy"; workId: string; museumId?: string; source?: ClickSource }
  | { type: "dm"; userId: string }
  | { type: "donate"; creatorId: string; workId?: string }
  | { type: "premium" }
  | { type: "promote"; workId: string }
  | { type: "promote-museum"; museumId: string }
  | { type: "publish"; workId?: string }
  | { type: "museum" }
  | { type: "submit"; workId: string }
  | { type: "withdraw" }
  | {
      type: "confirm";
      title: string;
      body: string;
      confirmLabel: string;
      tone?: "danger" | "default";
      onConfirm: () => void;
    };

interface UICtx {
  route: string;
  navigate: (to: string) => void;
  /* MODULE Précédent : pile interne de la maquette — la navigation
     en arrière ne démonte jamais le lecteur (monté à la racine). */
  back: () => void;
  canBack: boolean;
  headerPanel: HeaderPanel;
  setHeaderPanel: React.Dispatch<React.SetStateAction<HeaderPanel>>;
  openPrivateHistory: (transactionId?: string) => void;
  returnToNotifications: () => void;
  modal: ModalState;
  open: (m: ModalState) => void;
  close: () => void;
  chatOpen: boolean;
  setChatOpen: React.Dispatch<React.SetStateAction<boolean>>;
  routeLoading: boolean;
  query: string;
  setQuery: (q: string) => void;
}

const Ctx = createContext<UICtx | null>(null);

const readHash = () => {
  const h = window.location.hash.replace(/^#/, "");
  return h && h.startsWith("/") ? h : "/";
};

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState(readHash);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [chatOpen, setChatOpen] = useState(false);
  const [headerPanel, setHeaderPanel] = useState<HeaderPanel>("none");
  const [routeLoading, setRouteLoading] = useState(false);
  const [query, setQuery] = useState("");
  const stackRef = useRef<HistoryEntry[]>([]);
  const [canBack, setCanBack] = useState(false);

  useEffect(() => {
    const onHash = () => {
      const next = readHash();
      const previous = stackRef.current[stackRef.current.length - 1];
      if (previous?.notifications && previous.route === next) {
        stackRef.current.pop();
        setCanBack(stackRef.current.length > 0);
        setHeaderPanel("notifications");
      }
      setRoute(next);
      setRouteLoading(true);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  /* Court délai de chargement simulé : les squelettes sont réels à chaque navigation */
  useEffect(() => {
    if (!routeLoading) return;
    const id = window.setTimeout(() => setRouteLoading(false), 420);
    return () => window.clearTimeout(id);
  }, [routeLoading, route]);

  const navigate = useCallback(
    (to: string) => {
      if (to === route) return;
      stackRef.current.push({ route });
      setCanBack(stackRef.current.length > 0);
      window.location.hash = to;
      setRoute(to);
      setRouteLoading(true);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    },
    [route],
  );

  const back = useCallback(() => {
    const prev = stackRef.current.pop();
    setCanBack(stackRef.current.length > 0);
    if (prev === undefined) return;
    window.location.hash = prev.route;
    setRoute(prev.route);
    setHeaderPanel(prev.notifications ? "notifications" : "none");
    setRouteLoading(true);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  // Le contexte du départ est conservé : la flèche Retour rouvre la cloche,
  // sans recharger la page ni démonter le lecteur persistant.
  const openPrivateHistory = useCallback((transactionId?: string) => {
    const to = `/studio/transactions${transactionId ? `/${encodeURIComponent(transactionId)}` : ""}`;
    stackRef.current.push({ route: route === to ? "/studio" : route, notifications: true });
    setCanBack(true);
    setHeaderPanel("none");
    window.location.hash = to;
    setRoute(to);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [route]);

  const returnToNotifications = useCallback(() => {
    if (stackRef.current[stackRef.current.length - 1]?.notifications) back();
    else setHeaderPanel("notifications");
  }, [back]);

  /* MODULE Analytique — un seul point de passage pour toutes les fiches :
     provenance « grid » par défaut, « billboard » explicite, « none »
     ignoré. Le suivi est silencieux et n'affecte aucune autre modale. */
  const open = useCallback((m: ModalState) => {
    if (m.type === "work") trackWorkClick(m.id, m.source ?? "grid");
    setModal(m);
  }, []);
  const close = useCallback(() => setModal({ type: "none" }), []);

  /* Raccourci clavier ⌘K / Ctrl+K → recherche */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("solde-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(
    () => ({ route, navigate, back, canBack, headerPanel, setHeaderPanel, openPrivateHistory, returnToNotifications, modal, open, close, chatOpen, setChatOpen, routeLoading, query, setQuery }),
    [route, navigate, back, canBack, headerPanel, openPrivateHistory, returnToNotifications, modal, open, close, chatOpen, routeLoading, query],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUI() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUI doit être utilisé dans <UIProvider>");
  return c;
}
