import type { CategoryId, DB, User } from "./types";
import { CATEGORY_FILE_KINDS, isPremium } from "./types";

/* ANONYMAT FINANCIER : chaque tranche de 1 000 HTG générée vaut
   exactement 1 Point (ex. 5 200 HTG → « 5.2 Points »). */
export const toPoints = (amountHTG: number) => (amountHTG / 1000).toFixed(1);

/* ============================================================
   Double moteur de concours
   1. Prix d'impact  : volume HTG (ventes + dons) mensuel / annuel
   2. Prix de productivité : nombre d'œuvres uniques admissibles
   Règle d'égalité « au mérite » : les ex-æquo partagent le même
   prix, et le créateur suivant reçoit le prix directement
   inférieur (classement dense, sans saut de rang pénalisant).
   ============================================================ */

export type Tier = 0 | 1 | 2;

export interface Ranked {
  creatorId: string;
  total: number;
  rank: number;
  tier: Tier | null;
}

const sameMonth = (iso: string, ref: Date) => {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
};
const sameYear = (iso: string, ref: Date) => new Date(iso).getFullYear() === ref.getFullYear();

/** Classement dense : 1, 1, 2, 3… (et non 1, 1, 3, 4). */
function denseRank(values: { creatorId: string; total: number }[]): Ranked[] {
  const sorted = [...values].filter((v) => v.total > 0).sort((a, b) => b.total - a.total);
  const distinct: number[] = [];
  sorted.forEach((v) => {
    const key = Math.round(v.total * 100) / 100;
    if (!distinct.includes(key)) distinct.push(key);
  });
  return sorted.map((v) => {
    const idx = distinct.indexOf(Math.round(v.total * 100) / 100);
    return {
      creatorId: v.creatorId,
      total: Math.round(v.total * 100) / 100,
      rank: idx + 1,
      tier: idx <= 2 ? (idx as Tier) : null,
    };
  });
}

export function impactRanking(db: DB, scope: "mois" | "annee", ref = new Date()): Ranked[] {
  const totals = new Map<string, number>();
  db.ledger.forEach((e) => {
    const inScope = scope === "mois" ? sameMonth(e.date, ref) : sameYear(e.date, ref);
    if (!inScope) return;
    totals.set(e.creatorId, (totals.get(e.creatorId) ?? 0) + e.amount);
  });
  return denseRank([...totals].map(([creatorId, total]) => ({ creatorId, total })));
}

/* Anti-spam productivité (règle V1.1) :
   · description de plus de 100 caractères
   · livrable ADAPTÉ à la catégorie (types autorisés par univers)
   · œuvre approuvée et non supprimée */
export function isProductivityEligible(
  w: {
    fileName: string;
    description: string;
    approved: boolean;
    deleted?: boolean;
  },
  category?: CategoryId,
) {
  const ext = w.fileName.split(".").pop()?.toLowerCase() ?? "";
  const kindsOk = category
    ? CATEGORY_FILE_KINDS[category].includes(ext as never)
    : /\.(mp3|pdf|zip|jpg|png|dwg|mp4)$/i.test(w.fileName);
  return !w.deleted && w.approved && kindsOk && w.description.trim().length > 100;
}

export function productivityRanking(db: DB, category: CategoryId, ref = new Date()): Ranked[] {
  const counts = new Map<string, Set<string>>();
  db.works.forEach((w) => {
    if (w.category !== category) return;
    if (!sameMonth(w.createdAt, ref)) return;
    if (!isProductivityEligible(w, category)) return;
    if (!counts.has(w.creatorId)) counts.set(w.creatorId, new Set());
    counts.get(w.creatorId)!.add(w.id);
  });
  return denseRank([...counts].map(([creatorId, set]) => ({ creatorId, total: set.size })));
}

export const IMPACT_PRIZES: Record<Tier, string> = {
  0: "Gold Sack Award",
  1: "Silver Sack Award",
  2: "Bronze Sack Award",
};
export const GRAND_PRIZES: Record<Tier, string> = {
  0: "Grand Gold Sack Award",
  1: "Grand Silver Sack Award",
  2: "Grand Bronze Sack Award",
};

export const PRODUCTIVITY_PRIZES: Record<CategoryId, [string, string, string]> = {
  livres: ["Diamond Pen", "Golden Pen", "Silver Pen"],
  projets: ["Diamond Brain", "Golden Brain", "Silver Brain"],
  architecture: ["Diamond Pencil", "Golden Pencil", "Silver Pencil"],
  art: ["Diamond Canvas", "Golden Canvas", "Silver Canvas"],
  photo: ["Capture of the Month", "Golden Capture", "Silver Capture"],
  musique: ["Diamond Disc", "Golden Disc", "Silver Disc"],
};

export const TIER_COLORS: Record<Tier, string> = {
  0: "#d8a72c",
  1: "#a9b2bd",
  2: "#b5763f",
};

export interface EarnedBadge {
  label: string;
  tier: Tier;
  scope: string;
  kind: "impact" | "productivite";
  /* MODULE « Preuve de mérite » — métadonnées additives (facultatives)
     servant uniquement à la modale de justification du badge. */
  total?: number;
  rank?: number;
  period?: "mois" | "annee" | "productivite";
  category?: CategoryId;
  workCount?: number;
}

/** Le calcul est ouvert à tous ; l'affichage des badges est réservé aux Premium. */
export function badgesOf(db: DB, userId: string, ref = new Date()): EarnedBadge[] {
  const out: EarnedBadge[] = [];
  const monthName = ref.toLocaleDateString("fr-FR", { month: "long" });
  const m = impactRanking(db, "mois", ref).find((r) => r.creatorId === userId);
  if (m && m.tier !== null)
    out.push({ label: IMPACT_PRIZES[m.tier], tier: m.tier, scope: monthName, kind: "impact", total: m.total, rank: m.rank, period: "mois" });
  const y = impactRanking(db, "annee", ref).find((r) => r.creatorId === userId);
  if (y && y.tier !== null)
    out.push({
      label: GRAND_PRIZES[y.tier],
      tier: y.tier,
      scope: String(ref.getFullYear()),
      kind: "impact",
      total: y.total,
      rank: y.rank,
      period: "annee",
    });
  (Object.keys(PRODUCTIVITY_PRIZES) as CategoryId[]).forEach((cat) => {
    const p = productivityRanking(db, cat, ref).find((r) => r.creatorId === userId);
    if (p && p.tier !== null)
      out.push({
        label: PRODUCTIVITY_PRIZES[cat][p.tier],
        tier: p.tier,
        scope: `${cat} · ${monthName}`,
        kind: "productivite",
        total: p.total,
        rank: p.rank,
        period: "productivite",
        category: cat,
        workCount: p.total,
      });
  });
  return out;
}

/* MODULE « Preuve de mérite » : renvoie exactement les œuvres uniques
   qui ont servi au calcul du prix de productivité mensuel (mêmes
   prédicats que productivityRanking), dans l'ordre de publication.
   Sert de source de vérité aux cartes interactives de la modale. */
export function eligibleWorksForPrize(db: DB, creatorId: string, category: CategoryId, ref = new Date()) {
  return db.works
    .filter(
      (w) =>
        w.creatorId === creatorId &&
        w.category === category &&
        !w.deleted &&
        sameMonth(w.createdAt, ref) &&
        isProductivityEligible(w, category),
    )
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
}

export const canDisplayBadges = (u?: User | null) => isPremium(u);

/** Palette de fond saisonnier — Haïti (saisons et fêtes nationales). */
export function haitiSeason(date = new Date()) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 1 && d === 1)
    return {
      key: "independance",
      label: "1er janvier · Fête de l'Indépendance",
      css: "conic-gradient(from 210deg at 30% 40%, #00209f, #d21034, #f4e2b8, #00209f)",
    };
  if (m === 5 && d === 18)
    return {
      key: "drapeau",
      label: "18 mai · Fête du Drapeau",
      css: "linear-gradient(160deg, #00209f 0%, #00209f 44%, #f7f3e8 50%, #d21034 56%, #d21034 100%)",
    };
  if (m === 11 && d === 1)
    return {
      key: "vertieres",
      label: "1er novembre · Bataille de Vertières",
      css: "conic-gradient(from 40deg at 60% 30%, #0b1f6b, #8c0f1d, #d8a72c, #0b1f6b)",
    };
  if (m >= 4 && m <= 10)
    return {
      key: "pluies",
      label: "Saison des pluies · avril – octobre",
      css: "radial-gradient(60% 60% at 20% 30%, #0e6f8a, transparent 70%), radial-gradient(50% 50% at 80% 60%, #1f8a5b, transparent 70%), linear-gradient(200deg, #16324f, #0b1b2b)",
    };
  return {
    key: "seche",
    label: "Saison sèche · novembre – mars",
    css: "radial-gradient(55% 55% at 25% 25%, #e0a106, transparent 70%), radial-gradient(50% 50% at 75% 70%, #c2542c, transparent 70%), linear-gradient(200deg, #4a2c1a, #1b1208)",
  };
}
