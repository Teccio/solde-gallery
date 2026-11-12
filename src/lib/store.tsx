import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { DB, LedgerEntry, Message, Prefs, SupportTicket, User, Work, Museum, CategoryId, Trade, Lang } from "./types";
import { commissionRate, isPremium, MIN_WITHDRAWAL, MUSEUM_TOTAL_RATE, MUSEUM_ADMIN_RATE, PREMIUM_MONTH, PREMIUM_YEAR, PROMO_PRICE } from "./types";
import { buildSeed } from "./seed";
import { hasSufficientBalance } from "./transaction-guard";
import type { ClickSource } from "./click-analytics";

const KEY = "solde.gallery.db.v3";

export type Toast = { id: string; title: string; body?: string; tone: "info" | "success" | "warn" | "danger" };

/* ------------------------------------------------------------------
   Persistance : la base entière tient dans une seule clé localStorage.
   Toute mutation passe par `update` puis est sérialisée immédiatement.
   ------------------------------------------------------------------ */
function loadDB(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed && parsed.version === 3 && Array.isArray(parsed.works)) {
        parsed.messages = parsed.messages ?? [];
        parsed.follows = parsed.follows ?? {};
        parsed.favoriteEvents = parsed.favoriteEvents ?? [];
        // Les anciennes simulations autorisaient un découvert : le solde repart au minimum à zéro.
        parsed.users.forEach((u) => {
          if (!Number.isFinite(u.wallet) || u.wallet < 0) u.wallet = 0;
        });
        /* Anciennes bases : initialise le compteur public de favoris */
        parsed.works.forEach((w) => {
          if (typeof w.favoritesCount !== "number") w.favoritesCount = 0;
        });
        return parsed;
      }
    }
  } catch {
    /* base corrompue : on repart d'un jeu de démonstration propre */
  }
  return buildSeed();
}

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

interface Ctx {
  db: DB;
  user: User | null;
  toasts: Toast[];
  booting: boolean;
  storageError: string | null;
  t: (k: string) => string;
  lang: Lang;
  messagesOf: (userId: string) => Message[];
  sendMessage: (toId: string, text: string) => void;
  addMessage: (m: { toId: string; fromId: string; fromName: string; text: string }) => void;
  userById: (id: string) => User | undefined;
  workById: (id: string) => Work | undefined;
  publicWorks: Work[];
  purchasesOf: (userId: string) => LedgerEntry[];
  favoritesOf: (userId: string) => string[];
  notify: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  setPrefs: (p: Partial<Prefs>) => void;
  login: (id: string) => void;
  logout: () => void;
  register: (p: {
    name: string;
    email: string;
    city: string;
    isCreator: boolean;
    trades: Trade[];
    interests: CategoryId[];
  }) => User;
  updateProfile: (patch: Partial<User>) => void;
  toggleFavorite: (workId: string) => void;
  /* MODULE Suivre — abonnement persistant, bascule instantanée */
  isFollowing: (targetId: string) => boolean;
  followsOf: (userId: string) => string[];
  toggleFollow: (targetId: string) => boolean;
  /* MODULE Musées — appartenance en tant que membre invité */
  joinMuseum: (museumId: string) => void;
  leaveMuseum: (museumId: string) => void;
  recordSale: (workId: string, museumId?: string, source?: ClickSource) => LedgerEntry | null;
  recordDonation: (creatorId: string, amount: number, workId?: string) => LedgerEntry | null;
  activatePremium: (plan: "mensuel" | "annuel") => boolean;
  cancelPremium: () => void;
  requestWithdrawal: (amount: number) => boolean;
  publishWork: (w: Omit<Work, "id" | "createdAt" | "approved" | "plays" | "creatorId">) => Work | null;
  updateWork: (id: string, patch: Partial<Work>) => void;
  deleteWork: (id: string) => void;
  approveWork: (id: string) => void;
  createMuseum: (p: { title: string; editorial: string; hue: number }) => Museum | null;
  /* MODULE Édition inline du musée (CRUD, persistance localStorage) */
  updateMuseum: (id: string, patch: Partial<Pick<Museum, "title" | "editorial" | "hue" | "photo">>) => void;
  submitToMuseum: (museumId: string, workId: string) => "ok" | "duplicate" | "pending" | "not-owner";
  resolveRequest: (museumId: string, reqId: string, accept: boolean) => void;
  bookPromotion: (target: { workId?: string; museumId?: string }) => boolean;
  raiseTicket: (subject: string, message: string, severity?: "haute" | "normale") => SupportTicket;
  resetDemo: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

import { translate } from "./i18n";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(() => loadDB());
  const dbRef = useRef(db);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [booting, setBooting] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const timers = useRef<Record<string, number>>({});

  // Les mutations sont sérialisées avant le rendu pour que chaque paiement lise le dernier solde.
  const update = useCallback((fn: (d: DB) => DB) => {
    const next = fn(structuredClone(dbRef.current));
    next.users.forEach((u) => {
      if (!Number.isFinite(u.wallet) || u.wallet < 0) u.wallet = 0;
    });
    dbRef.current = next;
    setDb(next);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setBooting(false), 780);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
      setStorageError(null);
    } catch {
      setStorageError("Stockage local saturé : les dernières modifications ne seront pas conservées.");
    }
  }, [db]);

  /* MODULE Messages — RÈGLE MÉTIER : tout message dont l'ancienneté
     dépasse strictement 30 jours calendaires est effacé de la mémoire
     locale au chargement (purgation silencieuse, idempotente). */
  useEffect(() => {
    update((d) => {
      const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
      d.messages = d.messages.filter((m) => +new Date(m.date) >= cutoff);
      return d;
    });
  }, [update]);

  /* Application du thème, de l'accent et de la langue au document */
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = db.prefs.theme;
    root.lang = db.prefs.lang;
    root.style.setProperty("--accent-color", db.prefs.accent);
    const lightAccent = db.prefs.accent;
    root.style.setProperty("--accent-contrast", pickContrast(lightAccent));
    root.style.setProperty(
      "--accent-soft",
      db.prefs.theme === "dark"
        ? `color-mix(in srgb, ${lightAccent} 24%, #14110c)`
        : `color-mix(in srgb, ${lightAccent} 16%, #ffffff)`,
    );
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", db.prefs.theme === "dark" ? "#14110c" : "#fbf7ef");
  }, [db.prefs]);

  const dismissToast = useCallback((id: string) => {
    setToasts((ts) => ts.filter((x) => x.id !== id));
    window.clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const notify = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = uid("toast");
      setToasts((ts) => [...ts.slice(-3), { ...t, id }]);
      timers.current[id] = window.setTimeout(() => {
        setToasts((ts) => ts.filter((x) => x.id !== id));
      }, 5200);
    },
    [],
  );

  useEffect(() => () => Object.values(timers.current).forEach((h) => window.clearTimeout(h)), []);

  const user = useMemo(() => db.users.find((u) => u.id === db.sessionUserId) ?? null, [db.users, db.sessionUserId]);

  const userById = useCallback((id: string) => db.users.find((u) => u.id === id), [db.users]);
  const workById = useCallback((id: string) => db.works.find((w) => w.id === id), [db.works]);

  const publicWorks = useMemo(
    () => db.works.filter((w) => !w.deleted && w.approved).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [db.works],
  );

  const purchasesOf = useCallback(
    (userId: string) => db.ledger.filter((e) => e.buyerId === userId && e.type === "vente"),
    [db.ledger],
  );
  const favoritesOf = useCallback((userId: string) => db.favorites[userId] ?? [], [db.favorites]);

  const setPrefs = useCallback((p: Partial<Prefs>) => update((d) => ({ ...d, prefs: { ...d.prefs, ...p } })), [update]);

  /* ---------- MODULE Messages (échange simulé, 30 jours) ---------- */
  const messagesOf = useCallback(
    (userId: string) => db.messages.filter((m) => m.toId === userId || m.fromId === userId),
    [db.messages],
  );

  const addMessage = useCallback(
    (m: { toId: string; fromId: string; fromName: string; text: string }) =>
      update((d) => {
        d.messages.push({ ...m, id: uid("msg"), date: new Date().toISOString() });
        return d;
      }),
    [update],
  );

  const sendMessage = useCallback(
    (toId: string, text: string) =>
      update((d) => {
        const u = d.users.find((x) => x.id === d.sessionUserId);
        if (!u || !text.trim()) return d;
        d.messages.push({ id: uid("msg"), toId, fromId: u.id, fromName: u.name, text: text.trim(), date: new Date().toISOString() });
        return d;
      }),
    [update],
  );

  const login = useCallback(
    (id: string) =>
      update((d) => {
        const u = d.users.find((x) => x.id === id);
        if (u) d.sessionUserId = id;
        return d;
      }),
    [update],
  );

  const logout = useCallback(() => update((d) => ({ ...d, sessionUserId: null })), [update]);

  const register: Ctx["register"] = useCallback(
    (p) => {
      const u: User = {
        id: uid("u"),
        name: p.name,
        handle: p.name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16) || "membre",
        email: p.email,
        city: p.city || "Haïti",
        bio: p.isCreator
          ? "Nouveau studio sur SOLDE gallery."
          : "Membre SOLDE gallery — à la découverte des créateurs haïtiens.",
        hue: Math.floor(Math.random() * 360),
        isCreator: p.isCreator,
        premium: null,
        trades: p.trades.slice(0, 5),
        interests: p.interests,
        wallet: 0,
        joinedAt: new Date().toISOString(),
        followers: 0,
      };
      update((d) => {
        d.users.push(u);
        d.sessionUserId = u.id;
        return d;
      });
      return u;
    },
    [update],
  );

  const updateProfile = useCallback(
    (patch: Partial<User>) =>
      update((d) => {
        d.users = d.users.map((u) => (u.id === d.sessionUserId ? { ...u, ...patch } : u));
        return d;
      }),
    [update],
  );

  /* MODULE Favoris — la bascule met à jour la liste privée ET le
     compteur PUBLIC de l'œuvre (+1 / −1, jamais négatif). */
  const toggleFavorite = useCallback(
    (workId: string) =>
      update((d) => {
        if (!d.sessionUserId) return d;
        const work = d.works.find((w) => w.id === workId);
        const actor = d.users.find((u) => u.id === d.sessionUserId);
        if (!work || !actor) return d;
        const list = d.favorites[d.sessionUserId] ?? [];
        const adding = !list.includes(workId);
        d.favorites[d.sessionUserId] = adding ? [workId, ...list] : list.filter((x) => x !== workId);
        d.works = d.works.map((w) =>
          w.id === workId
            ? { ...w, favoritesCount: Math.max(0, (w.favoritesCount ?? 0) + (adding ? 1 : -1)) }
            : w,
        );
        // Une alerte privée est créée uniquement lors de l'ajout, jamais
        // lors du retrait ni lorsque le créateur aime sa propre œuvre.
        if (adding && work.creatorId !== actor.id) {
          d.favoriteEvents = [{
            id: uid("fav"),
            actorId: actor.id,
            actorName: actor.name,
            creatorId: work.creatorId,
            workId: work.id,
            workTitle: work.title,
            date: new Date().toISOString(),
          }, ...(d.favoriteEvents ?? [])];
        }
        return d;
      }),
    [update],
  );

  /* ---------- MODULE Suivre (persistant, sans rechargement) ---------- */
  const followsOf = useCallback((userId: string) => db.follows[userId] ?? [], [db.follows]);
  const isFollowing = useCallback(
    (targetId: string) => !!db.sessionUserId && (db.follows[db.sessionUserId] ?? []).includes(targetId),
    [db.follows, db.sessionUserId],
  );
  const toggleFollow = useCallback(
    (targetId: string) => {
      let now = false;
      update((d) => {
        const me = d.sessionUserId;
        if (!me || me === targetId) return d;
        const list = d.follows[me] ?? [];
        now = !list.includes(targetId);
        d.follows[me] = now ? [targetId, ...list] : list.filter((x) => x !== targetId);
        /* Le compteur d'abonnés est recalculé de façon cohérente */
        d.users = d.users.map((u) =>
          u.id === targetId ? { ...u, followers: Math.max(0, u.followers + (now ? 1 : -1)) } : u,
        );
        return d;
      });
      return now;
    },
    [update],
  );

  /* ---------- MODULE Musées : appartenance (membre invité) ---------- */
  const joinMuseum = useCallback(
    (museumId: string) =>
      update((d) => {
        const me = d.sessionUserId;
        if (!me) return d;
        d.museums = d.museums.map((m) => {
          if (m.id !== museumId || m.ownerId === me) return m;
          const ids = m.memberIds ?? [];
          if (ids.includes(me)) return m;
          return { ...m, memberIds: [...ids, me], members: m.members + 1 };
        });
        return d;
      }),
    [update],
  );
  const leaveMuseum = useCallback(
    (museumId: string) =>
      update((d) => {
        const me = d.sessionUserId;
        if (!me) return d;
        d.museums = d.museums.map((m) => {
          if (m.id !== museumId) return m;
          const ids = m.memberIds ?? [];
          if (!ids.includes(me)) return m;
          return { ...m, memberIds: ids.filter((x) => x !== me), members: Math.max(0, m.members - 1) };
        });
        return d;
      }),
    [update],
  );

  /* ------------------------------------------------------------------
     Répartition économique : 3,75 % pour un Compte Basique,
     0 % pour un Premium. Frais opérateur simulés à 0 HTG.
     ------------------------------------------------------------------ */
   /* Règlement d'une transaction. Le créateur reçoit montant − commission,
      la plateforme reçoit (commission − part musée). En vitrine de musée,
      l'administrateur Premium reçoit museumShare (1,25 %) ; la plateforme
      garde le reste (3,75 % pour un Basique, 0 % pour un Premium). */
  /* Le débit et les crédits sont appliqués ensemble, après un dernier
     contrôle du solde. Une transaction refusée ne modifie pas le registre. */
  const settle = (d: DB, entry: LedgerEntry) => {
    const payer = d.users.find((u) => u.id === entry.buyerId);
    if (!payer || !hasSufficientBalance(payer.wallet, entry.amount)) return false;
    const museumShare = entry.museumShare ?? 0;
    d.ledger = [entry, ...d.ledger];
    d.users = d.users.map((u) => {
      let wallet = u.wallet;
      if (u.id === entry.buyerId) wallet -= entry.amount;
      if (u.id === entry.creatorId) wallet += entry.amount - entry.commission;
      if (museumShare > 0 && u.id === entry.museumOwnerId) wallet += museumShare;
      return wallet === u.wallet ? u : { ...u, wallet: round2(wallet) };
    });
    d.platformWallet = round2(d.platformWallet + entry.commission - museumShare);
    return true;
  };

  const recordSale: Ctx["recordSale"] = useCallback(
    (workId, museumId, source) => {
      let created: LedgerEntry | null = null;
      update((d) => {
        const w = d.works.find((x) => x.id === workId);
        const buyer = d.users.find((u) => u.id === d.sessionUserId);
        if (!w || !buyer) return d;
        const creator = d.users.find((u) => u.id === w.creatorId);
        /* L'affiliation musée (1,25 %) ne s'applique que si l'œuvre est réellement
           exposée dans le musée ET que son administrateur est Premium. */
        const museum = museumId ? d.museums.find((m) => m.id === museumId && m.workIds.includes(w.id)) : undefined;
        const museumOwner = museum ? d.users.find((u) => u.id === museum.ownerId) : undefined;
        const viaMuseum = !!museum && isPremium(museumOwner);
        /* Commission = part plateforme du créateur (0 % Premium, 3,75 % Basique)
           + part musée 1,25 %. Plafond STRICT de 5 % garanti par les constantes.
           Une œuvre gratuite (prix 0) ne génère aucun frais. */
        const platformFee = round2(w.price * commissionRate(creator));
        const museumShare = viaMuseum ? round2(w.price * MUSEUM_ADMIN_RATE) : 0;
        const commission = Math.min(round2(platformFee + museumShare), round2(w.price * MUSEUM_TOTAL_RATE));
        const entry: LedgerEntry = {
          id: uid("led"),
          type: "vente",
          workId: w.id,
          workTitle: w.title,
          buyerId: buyer.id,
          buyerName: buyer.name,
          creatorId: w.creatorId,
          amount: w.price,
          commission,
          operatorFee: 0,
          date: new Date().toISOString(),
          license: `Licence nominative — ${buyer.name} · usage personnel, non transférable`,
          snapshot: {
            title: w.title,
            creatorName: creator?.name ?? "Créateur",
            category: w.category,
            kind: w.kind,
            fileName: w.fileName,
          },
          ...(viaMuseum ? { museumId: museum!.id, museumOwnerId: museum!.ownerId, museumShare } : {}),
          ...(source === "billboard" ? { via: "billboard" as const } : {}),
        };
        if (!settle(d, entry)) return d;
        created = entry;
        return d;
      });
      return created;
    },
    [update],
  );

  const recordDonation: Ctx["recordDonation"] = useCallback(
    (creatorId, amount, workId) => {
      let created: LedgerEntry | null = null;
      update((d) => {
        const buyer = d.users.find((u) => u.id === d.sessionUserId);
        const creator = d.users.find((u) => u.id === creatorId);
        if (!buyer || !creator || !Number.isFinite(amount) || amount <= 0) return d;
        const commission = round2(amount * commissionRate(creator));
        const entry: LedgerEntry = {
          id: uid("led"),
          type: "don",
          workId,
          workTitle: d.works.find((w) => w.id === workId)?.title,
          buyerId: buyer.id,
          buyerName: buyer.name,
          creatorId,
          amount,
          commission,
          operatorFee: 0,
          date: new Date().toISOString(),
          license: `Soutien direct — ${buyer.name}`,
        };
        if (!settle(d, entry)) return d;
        created = entry;
        return d;
      });
      return created;
    },
    [update],
  );

  const activatePremium = useCallback(
    (plan: "mensuel" | "annuel") => {
      let activated = false;
      update((d) => {
        const account = d.users.find((u) => u.id === d.sessionUserId);
        const amount = plan === "mensuel" ? PREMIUM_MONTH : PREMIUM_YEAR;
        if (!account || !hasSufficientBalance(account.wallet, amount)) return d;
        const until = new Date();
        if (plan === "mensuel") until.setMonth(until.getMonth() + 1);
        else until.setFullYear(until.getFullYear() + 1);
        account.wallet = round2(account.wallet - amount);
        account.premium = { active: true, plan, since: new Date().toISOString(), until: until.toISOString() };
        d.platformWallet = round2(d.platformWallet + amount);
        activated = true;
        return d;
      });
      return activated;
    },
    [update],
  );

  const cancelPremium = useCallback(
    () =>
      update((d) => {
        d.users = d.users.map((u) => (u.id === d.sessionUserId ? { ...u, premium: null } : u));
        return d;
      }),
    [update],
  );

  const requestWithdrawal = useCallback(
    (amount: number) => {
      let ok = false;
      update((d) => {
        const u = d.users.find((x) => x.id === d.sessionUserId);
        if (!u || !Number.isFinite(amount) || amount < MIN_WITHDRAWAL || !hasSufficientBalance(u.wallet, amount)) return d;
        ok = true;
        u.wallet = round2(u.wallet - amount);
        d.withdrawals = [
          { id: uid("wd"), userId: u.id, amount, status: "en traitement", date: new Date().toISOString() },
          ...d.withdrawals,
        ];
        return d;
      });
      return ok;
    },
    [update],
  );

  const publishWork: Ctx["publishWork"] = useCallback(
    (payload) => {
      let created: Work | null = null;
      update((d) => {
        if (!d.sessionUserId) return d;
        /* Curation : validation automatique si pièce jointe + description > 150 caractères */
        const eligible = payload.fileName.trim().length > 3 && payload.description.trim().length > 150;
        const w: Work = {
          ...payload,
          id: uid("w"),
          creatorId: d.sessionUserId,
          createdAt: new Date().toISOString(),
          approved: eligible,
          plays: 0,
        };
        created = w;
        d.works = [w, ...d.works];
        return d;
      });
      return created;
    },
    [update],
  );

  const updateWork = useCallback(
    (id: string, patch: Partial<Work>) =>
      update((d) => {
        d.works = d.works.map((w) => (w.id === id ? { ...w, ...patch } : w));
        return d;
      }),
    [update],
  );

  /* Suppression douce : l'œuvre quitte le catalogue public mais reste
     visible dans l'historique des clients via le snapshot de la vente. */
  const deleteWork = useCallback(
    (id: string) =>
      update((d) => {
        d.works = d.works.map((w) => (w.id === id ? { ...w, deleted: true } : w));
        d.museums = d.museums.map((m) => ({ ...m, workIds: m.workIds.filter((x) => x !== id) }));
        return d;
      }),
    [update],
  );

  const approveWork = useCallback(
    (id: string) =>
      update((d) => {
        d.works = d.works.map((w) => (w.id === id ? { ...w, approved: true } : w));
        return d;
      }),
    [update],
  );

  const createMuseum: Ctx["createMuseum"] = useCallback(
    (p) => {
      let created: Museum | null = null;
      update((d) => {
        const u = d.users.find((x) => x.id === d.sessionUserId);
        if (!u || !isPremium(u)) return d;
        const m: Museum = {
          id: uid("m"),
          ownerId: u.id,
          title: p.title,
          hue: p.hue,
          editorial: p.editorial,
          workIds: [],
          requests: [],
          members: 1,
          createdAt: new Date().toISOString(),
        };
        created = m;
        d.museums = [m, ...d.museums];
        return d;
      });
      return created;
    },
    [update],
  );

  const updateMuseum = useCallback(
    (id: string, patch: Partial<Pick<Museum, "title" | "editorial" | "hue" | "photo">>) =>
      update((d) => {
        d.museums = d.museums.map((m) => (m.id === id ? { ...m, ...patch } : m));
        return d;
      }),
    [update],
  );

  const submitToMuseum: Ctx["submitToMuseum"] = useCallback(
    (museumId, workId) => {
      let result: "ok" | "duplicate" | "pending" | "not-owner" = "ok";
      update((d) => {
        const m = d.museums.find((x) => x.id === museumId);
        const work = d.works.find((x) => x.id === workId);
        if (!m || !d.sessionUserId) return d;
        /* Règle stricte : seul l'auteur connecté peut proposer son œuvre,
           y compris lorsque la demande vient d'une ancienne fiche ouverte. */
        if (!work || work.creatorId !== d.sessionUserId) {
          result = "not-owner";
          return d;
        }
        if (m.workIds.includes(workId)) {
          result = "duplicate";
          return d;
        }
        if (m.requests.some((r) => r.workId === workId && r.status === "en attente")) {
          result = "pending";
          return d;
        }
        const owner = d.users.find((u) => u.id === m.ownerId);
        if (d.sessionUserId === m.ownerId && isPremium(owner)) {
          m.workIds = [...m.workIds, workId];
        } else {
          /* AUTHENTICITÉ — évolution prévue : générer ici un code unique
             automatiquement, le lier à workId + auteur + musée, puis le
             vérifier avant acceptation. La règle d'auteur reste obligatoire. */
          m.requests = [
            { id: uid("req"), workId, fromId: d.sessionUserId, status: "en attente", date: new Date().toISOString() },
            ...m.requests,
          ];
        }
        return d;
      });
      return result;
    },
    [update],
  );

  const resolveRequest = useCallback(
    (museumId: string, reqId: string, accept: boolean) =>
      update((d) => {
        const m = d.museums.find((x) => x.id === museumId);
        if (!m) return d;
        const req = m.requests.find((r) => r.id === reqId);
        if (!req) return d;
        req.status = accept ? "acceptée" : "refusée";
        if (accept && !m.workIds.includes(req.workId)) m.workIds = [...m.workIds, req.workId];
        return d;
      }),
    [update],
  );

  /* MODULE Billboard : la réservation de 24 h porte sur une œuvre
     OU sur un musée entier (mutuellement exclusif). */
  const bookPromotion = useCallback(
    (target: { workId?: string; museumId?: string }) => {
      let ok = false;
      update((d) => {
        const account = d.users.find((u) => u.id === d.sessionUserId);
        if (!account || !hasSufficientBalance(account.wallet, PROMO_PRICE)) return d;
        account.wallet = round2(account.wallet - PROMO_PRICE);
        ok = true;
        const starts = new Date();
        const ends = new Date(starts.getTime() + 24 * 3600 * 1000);
        d.promotions = [
          {
            id: uid("promo"),
            workId: target.workId,
            museumId: target.museumId,
            userId: account.id,
            amount: PROMO_PRICE,
            startsAt: starts.toISOString(),
            endsAt: ends.toISOString(),
          },
          ...d.promotions.filter((p) => new Date(p.endsAt) > new Date()),
        ];
        d.platformWallet = round2(d.platformWallet + PROMO_PRICE);
        return d;
      });
      return ok;
    },
    [update],
  );

  const raiseTicket: Ctx["raiseTicket"] = useCallback(
    (subject, message, severity = "normale") => {
      const ticket: SupportTicket = {
        id: uid("tick"),
        userId: db.sessionUserId ?? "anonyme",
        subject,
        message,
        severity,
        date: new Date().toISOString(),
      };
      update((d) => {
        d.tickets = [ticket, ...d.tickets];
        return d;
      });
      return ticket;
    },
    [db.sessionUserId, update],
  );

  const resetDemo = useCallback(() => {
    const fresh = buildSeed();
    fresh.seenWelcome = true;
    dbRef.current = fresh;
    setDb(fresh);
  }, []);

  const t = useCallback((k: string) => translate(k, db.prefs.lang), [db.prefs.lang]);

  const value: Ctx = {
    db,
    user,
    toasts,
    booting,
    storageError,
    t,
    lang: db.prefs.lang,
    userById,
    workById,
    publicWorks,
    purchasesOf,
    favoritesOf,
    isFollowing,
    followsOf,
    toggleFollow,
    joinMuseum,
    leaveMuseum,
    notify,
    dismissToast,
    setPrefs,
    messagesOf,
    sendMessage,
    addMessage,
    login,
    logout,
    register,
    updateProfile,
    toggleFavorite,
    recordSale,
    recordDonation,
    activatePremium,
    cancelPremium,
    requestWithdrawal,
    publishWork,
    updateWork,
    deleteWork,
    approveWork,
    createMuseum,
    updateMuseum,
    submitToMuseum,
    resolveRequest,
    bookPromotion,
    raiseTicket,
    resetDemo,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore doit être utilisé dans <StoreProvider>");
  return ctx;
}

function pickContrast(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return lum > 0.45 ? "#1c1509" : "#fffaf2";
}
