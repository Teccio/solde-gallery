/* ============================================================
   MODULE ISOLÉ — Traduction stricte des libellés d'interface
   ------------------------------------------------------------
   `makeTr(lang)` renvoie une fonction (fr, ht, en, es) => string.
   Elle complète le dictionnaire `i18n.ts` pour les libellés
   déclarés directement dans les pages, sans alourdre le store.
   Les contenus éditoriaux (descriptions d'œuvres, biographies
   saisies par les membres) restent dans leur langue d'origine.
   ============================================================ */
import type { CategoryId, Lang, Trade } from "./types";

export type Tr = (fr: string, ht: string, en: string, es: string) => string;

export function makeTr(lang: Lang): Tr {
  return (fr, ht, en, es) => (lang === "ht" ? ht : lang === "en" ? en : lang === "es" ? es : fr);
}

/* MÉTIERS (badges de profil) — traduction stricte demandée. */
export const TRADES_I18N: Record<Trade, Record<Lang, string>> = {
  Entrepreneur: { fr: "Entrepreneur", ht: "Antreprenè", en: "Entrepreneur", es: "Emprendedor" },
  Écrivain: { fr: "Écrivain", ht: "Ekriven", en: "Writer", es: "Escritor" },
  "Rédacteur de projets": {
    fr: "Rédacteur de projets",
    ht: "Redaktè pwojè",
    en: "Project writer",
    es: "Redactor de proyectos",
  },
  Musicien: { fr: "Musicien", ht: "Mizisyen", en: "Musician", es: "Músico" },
  Architecte: { fr: "Architecte", ht: "Achitèk", en: "Architect", es: "Arquitecto" },
  "Artiste / Peintre": { fr: "Artiste / Peintre", ht: "Atis / Pent", en: "Artist / Painter", es: "Artista / Pintor" },
  "Photographe / Vidéaste": {
    fr: "Photographe / Vidéaste",
    ht: "Fotograf / Videyast",
    en: "Photographer / Videographer",
    es: "Fotógrafo / Videasta",
  },
};

export const tradeLabel = (t: Trade, lang: Lang) => TRADES_I18N[t]?.[lang] ?? t;

/* UNIVERS (catégories) — libellés longs et courts. */
export const CATEGORY_I18N: Record<CategoryId, Record<Lang, { long: string; short: string }>> = {
  musique: {
    fr: { long: "Musique", short: "Musique" },
    ht: { long: "Mizik", short: "Mizik" },
    en: { long: "Music", short: "Music" },
    es: { long: "Música", short: "Música" },
  },
  photo: {
    fr: { long: "Photographie et vidéo", short: "Photo & vidéo" },
    ht: { long: "Foto ak videyo", short: "Foto & videyo" },
    en: { long: "Photography & video", short: "Photo & video" },
    es: { long: "Fotografía y vídeo", short: "Foto y vídeo" },
  },
  art: {
    fr: { long: "Art et tableaux", short: "Art & tableaux" },
    ht: { long: "Atizay ak tablo", short: "Atizay" },
    en: { long: "Art & paintings", short: "Art" },
    es: { long: "Arte y cuadros", short: "Arte" },
  },
  architecture: {
    fr: { long: "Architecture", short: "Architecture" },
    ht: { long: "Achitekti", short: "Achitekti" },
    en: { long: "Architecture", short: "Architecture" },
    es: { long: "Arquitectura", short: "Arquitectura" },
  },
  livres: {
    fr: { long: "Livres", short: "Livres" },
    ht: { long: "Liv", short: "Liv" },
    en: { long: "Books", short: "Books" },
    es: { long: "Libros", short: "Libros" },
  },
  projets: {
    fr: { long: "Projets", short: "Projets" },
    ht: { long: "Pwojè", short: "Pwojè" },
    en: { long: "Projects", short: "Projects" },
    es: { long: "Proyectos", short: "Proyectos" },
  },
};

export const catLabel = (c: CategoryId, lang: Lang, short = false) => {
  const e = CATEGORY_I18N[c];
  return short ? e[lang].short : e[lang].long;
};

/* Intitulés OBLIGATOIREMENT au pluriel pour la section « Tous les univers ».
   Les autres zones (sidebar, profil, concours) gardent leurs libellés. */
export const CATEGORY_PLURAL_I18N: Record<CategoryId, Record<Lang, string>> = {
  musique: { fr: "Musiques", ht: "Mizik yo", en: "Music", es: "Música" },
  photo: { fr: "Photographies et vidéos", ht: "Foto ak videyo yo", en: "Photos & videos", es: "Fotos y vídeos" },
  art: { fr: "Arts et tableaux", ht: "Atizay ak tablo yo", en: "Artworks", es: "Artes y cuadros" },
  architecture: { fr: "Architectures", ht: "Achitekti yo", en: "Architecture", es: "Arquitecturas" },
  livres: { fr: "Livres", ht: "Liv yo", en: "Books", es: "Libros" },
  projets: { fr: "Projets", ht: "Pwojè yo", en: "Projects", es: "Proyectos" },
};

export const catPluralLabel = (c: CategoryId, lang: Lang) => CATEGORY_PLURAL_I18N[c][lang];

/* Onglet « Musées » ajouté en fin de liste pour filtrer les galeries collectives. */
export const museumsTabLabel = (lang: Lang) =>
  lang === "ht" ? "Mize yo" : lang === "en" ? "Museums" : lang === "es" ? "Museos" : "Musées";

/* Format d'univers composé utilisé par les pages « Livres et projets ». */
export const booksProjectsLabel = (lang: Lang) =>
  lang === "ht" ? "Liv ak pwojè" : lang === "en" ? "Books & projects" : lang === "es" ? "Libros y proyectos" : "Livres et projets";
