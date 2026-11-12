/* ============================================================
   SOLDE gallery — Modèle de données de la simulation locale
   Toutes les entités sont persistées dans localStorage.
   ============================================================ */

export type CategoryId = "musique" | "photo" | "art" | "architecture" | "livres" | "projets";

export type FileKind = "mp3" | "pdf" | "zip" | "jpg" | "png" | "dwg" | "mp4";

export type Trade =
  | "Entrepreneur"
  | "Écrivain"
  | "Rédacteur de projets"
  | "Musicien"
  | "Architecte"
  | "Artiste / Peintre"
  | "Photographe / Vidéaste";

export interface Premium {
  active: boolean;
  plan: "mensuel" | "annuel";
  since: string;
  until: string;
}

/* Liens de réseaux sociaux du profil (édition inline) — tous facultatifs.
   Chaque valeur est un identifiant (sans « @ ») ou une URL complète. */
export interface Socials {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
}

export interface User {
  id: string;
  name: string;
  handle: string;
  email: string;
  city: string;
  bio: string;
  socials?: Socials;
  hue: number;
  isCreator: boolean;
  /** Administrateur de la plateforme : seul, il consulte l'intégralité des flux privés. */
  isAdmin?: boolean;
  premium: Premium | null;
  trades: Trade[];
  interests: CategoryId[];
  wallet: number;
  joinedAt: string;
  followers: number;
}

export interface LyricLine {
  t: number;
  fr: string;
  ht?: string;
}

export interface Work {
  id: string;
  title: string;
  creatorId: string;
  category: CategoryId;
  kind: FileKind;
  price: number;
  description: string;
  fileName: string;
  fileSize: string;
  cover?: string;
  palette: [string, string, string];
  motif: "waves" | "sun" | "grid" | "page" | "plan" | "lens" | "disc" | "brush";
  createdAt: string;
  approved: boolean;
  deleted?: boolean;
  subtitle: string;
  tags: string[];
  duration?: number;
  synthSeed?: number;
  lyrics?: LyricLine[];
  plays: number;
  confidential?: boolean;
  /* MODULE Favoris : compteur PUBLIC affiché sur l'œuvre, indépendant
     de la session. Incrémenté/décrementé à chaque bascule. */
  favoritesCount?: number;
}

export interface LedgerEntry {
  id: string;
  type: "vente" | "don";
  workId?: string;
  workTitle?: string;
  buyerId: string;
  buyerName: string;
  creatorId: string;
  amount: number;
  commission: number;
  operatorFee: number;
  date: string;
  license: string;
  snapshot?: { title: string; creatorName: string; category: CategoryId; kind: FileKind; fileName: string };
  /* MODULE Affiliation Musée : renseignés uniquement si l'achat a eu lieu
     depuis la vitrine d'un Musée Virtuel appartenant à un membre Premium.
     `commission` vaut alors 5 % (3,75 % plateforme + 1,25 % administrateur
     du musée) ; `museumShare` isole la part de l'administrateur. */
  museumId?: string;
  museumOwnerId?: string;
  museumShare?: number;
  /* Traçabilité : provenance d'une vente pour le créateur.
     "billboard" = achat déclenché depuis le Billboard « À la une ».
     L'origine musée est déjà portée par museumId ; absence = vente simple. */
  via?: "billboard";
}

export interface FavoriteEvent {
  id: string;
  actorId: string;
  actorName: string;
  creatorId: string;
  workId: string;
  workTitle: string;
  date: string;
}

export interface MuseumRequest {
  id: string;
  workId: string;
  fromId: string;
  status: "en attente" | "acceptée" | "refusée";
  date: string;
}

export interface Museum {
  id: string;
  ownerId: string;
  title: string;
  hue: number;
  /* MODULE Édition inline du musée : photo ronde (data URL compressée)
     ajoutée en complément de l'avatar généré par la teinte `hue`. */
  photo?: string;
  editorial: string;
  workIds: string[];
  requests: MuseumRequest[];
  members: number;
  /* MODULE Musées : membres invités (consultation dans le panneau d'en-tête) */
  memberIds?: string[];
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  status: "en traitement" | "versé";
  date: string;
}

export interface Promotion {
  id: string;
  workId?: string;
  /* MODULE Billboard : une réservation peut porter un Musée entier */
  museumId?: string;
  userId: string;
  amount: number;
  startsAt: string;
  endsAt: string;
}

/* MODULE Messages : message privé universel, horodaté,
   purgé automatiquement après 30 jours calendaires. */
export interface Message {
  id: string;
  toId: string;
  fromId: string;
  fromName: string;
  text: string;
  date: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  severity: "haute" | "normale";
  date: string;
}

/* Langue active — quadrilingue strict : FR / Kreyòl / EN / ES */
export type Lang = "fr" | "ht" | "en" | "es";

export interface Prefs {
  theme: "light" | "dark";
  accent: string;
  accentName: string;
  lang: Lang;
  volume: number;
  compactPlayer: boolean;
}

export interface DB {
  version: number;
  users: User[];
  works: Work[];
  ledger: LedgerEntry[];
  museums: Museum[];
  withdrawals: Withdrawal[];
  promotions: Promotion[];
  tickets: SupportTicket[];
  messages: Message[];
  favorites: Record<string, string[]>;
  favoriteEvents?: FavoriteEvent[];
  /* MODULE Suivre : followerId → liste des profils suivis (persisté) */
  follows: Record<string, string[]>;
  sessionUserId: string | null;
  platformWallet: number;
  prefs: Prefs;
  seenWelcome: boolean;
}

export const CATEGORIES: { id: CategoryId; fr: string; ht: string; short: string; color: string }[] = [
  { id: "musique", fr: "Musique", ht: "Mizik", short: "Musique", color: "var(--hibiscus)" },
  { id: "photo", fr: "Photographie et vidéo", ht: "Foto ak videyo", short: "Photo & vidéo", color: "var(--sea)" },
  { id: "art", fr: "Art et tableaux", ht: "Atizay ak tablo", short: "Art & tableaux", color: "var(--terracotta)" },
  { id: "architecture", fr: "Architecture", ht: "Achitekti", short: "Architecture", color: "var(--emerald)" },
  { id: "livres", fr: "Livres", ht: "Liv", short: "Livres", color: "var(--saffron)" },
  { id: "projets", fr: "Projets", ht: "Pwojè", short: "Projets", color: "var(--cobalt)" },
];

export const TRADES: Trade[] = [
  "Entrepreneur",
  "Écrivain",
  "Rédacteur de projets",
  "Musicien",
  "Architecte",
  "Artiste / Peintre",
  "Photographe / Vidéaste",
];

export const ACCENTS: { name: string; value: string; contrast: string }[] = [
  { name: "Or", value: "#c08a2e", contrast: "#1c1509" },
  { name: "Rouge", value: "#c8232c", contrast: "#fff6f4" },
  { name: "Jaune", value: "#e0a106", contrast: "#1c1509" },
  { name: "Vert", value: "#1f8a5b", contrast: "#f2fff8" },
  { name: "Bleu", value: "#1d63c9", contrast: "#f2f7ff" },
  { name: "Marron", value: "#7a4a24", contrast: "#fff5ec" },
  { name: "Magenta", value: "#b5296b", contrast: "#fff2f8" },
  { name: "Sarcelle", value: "#0e6f8a", contrast: "#f0fdff" },
];

/* Livrables attendus par univers — source unique partagée par la
   publication (choix du type) et l'anti-spam de productivité. */
export const CATEGORY_FILE_KINDS: Record<CategoryId, FileKind[]> = {
  /* Musique : 'mp3' = morceau unique (Single) ; 'zip' = projet complet
     (album, EP ou pack d'instrumentales). */
  musique: ["mp3", "zip"],
  photo: ["jpg", "png", "zip", "mp4"],
  art: ["jpg", "png"],
  architecture: ["dwg", "pdf", "zip"],
  livres: ["pdf", "zip"],
  projets: ["pdf", "zip"],
};

/* Libellés lisibles du menu « Type de fichier » par univers (la musique
   distingue explicitement le Single du projet complet). */
export const KIND_LABELS: Partial<Record<CategoryId, Partial<Record<FileKind, string>>>> = {
  musique: {
    mp3: ".mp3 — Morceau unique (Single)",
    zip: ".zip — Projet complet : album, EP ou pack d'instrumentales",
  },
};

/* PLAFOND STRICT DE 5 % — achat depuis la vitrine d'un Musée Virtuel Premium.
   La part musée (1,25 %) s'ajoute à la commission plateforme du créateur,
   sans jamais dépasser 5 % au total.
   Compte Basique (plateforme 3,75 %) vendu 100 HTG via un musée :
     · 95 %   → créateur d'origine (95 HTG)
     · 3,75 % → plateforme (3,75 HTG)
     · 1,25 % → administrateur du musée (1,25 HTG)
   Créateur Premium (plateforme 0 %) : seule la part musée 1,25 % s'applique. */
export const MUSEUM_TOTAL_RATE = 0.05;
export const MUSEUM_ADMIN_RATE = 0.0125;

export const COMMISSION_FREE = 0.0375;
export const MIN_WITHDRAWAL = 1000;
export const PREMIUM_MONTH = 500;
export const PREMIUM_YEAR = 5000;
export const PROMO_PRICE = 50;

export const categoryLabel = (id: CategoryId, lang: "fr" | "ht" = "fr") => {
  const c = CATEGORIES.find((x) => x.id === id);
  return c ? (lang === "ht" ? c.ht : c.fr) : id;
};

export const htg = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Math.round(n * 100) / 100) + " HTG";

export const isPremium = (u?: User | null) => !!u?.premium?.active;

export const commissionRate = (u?: User | null) => (isPremium(u) ? 0 : COMMISSION_FREE);
