/* ============================================================
   MODULE ISOLÉ — Iconographie stricte des prix SOLDE gallery
   Remplace les logos génériques du classement :
   · Sacks d'impact  : petit sac texturé (doré / argenté / bronze)
   · Écrivains       : vraie plume d'écriture classique
   · Architectes     : crayon technique / critérium
   · Rédacteurs      : cerveau en filaire
   · Art             : petite toile d'art
   · Photo & vidéo   : optique de prise de vue
   · Musique         : disque
   Couleurs par palier distinctes : Impact (or/argent/bronze)
   vs Productivité (diamant/or/argent).
   ============================================================ */
import type { CategoryId } from "../lib/types";

export type PrizeIconKey = "sack" | "quill" | "pencil" | "brain" | "canvas" | "camera" | "disc";

/* Résolution stricte du visuel à partir de l'intitulé du prix. */
export function iconForLabel(label: string): PrizeIconKey {
  if (label.includes("Sack")) return "sack";
  if (label.includes("Pen")) return "quill";
  if (label.includes("Pencil")) return "pencil";
  if (label.includes("Brain")) return "brain";
  if (label.includes("Canvas")) return "canvas";
  if (label.includes("Capture")) return "camera";
  if (label.includes("Disc")) return "disc";
  return "sack";
}

/* Résolution stricte du visuel à partir de l'univers. */
export function iconForCategory(cat: CategoryId): PrizeIconKey {
  switch (cat) {
    case "livres":
      return "quill";
    case "projets":
      return "brain";
    case "architecture":
      return "pencil";
    case "art":
      return "canvas";
    case "photo":
      return "camera";
    default:
      return "disc";
  }
}

export const IMPACT_TIER_COLORS: Record<number, string> = { 0: "#d8a72c", 1: "#aeb6c2", 2: "#b5763f" };
export const PROD_TIER_COLORS: Record<number, string> = { 0: "#9fd0e8", 1: "#d8a72c", 2: "#aeb6c2" };

export function PrizeIcon({
  iconKey,
  color,
  className,
}: {
  iconKey: PrizeIconKey;
  color: string;
  className?: string;
}) {
  const common = { viewBox: "0 0 24 24", className, "aria-hidden": true as const };
  switch (iconKey) {
    /* Petit sac texturé : corps + cordon + points de couture */
    case "sack":
      return (
        <svg {...common} fill="none">
          <path d="M9.2 6.8C6.3 9.2 4.8 12 4.8 14.6A6.4 6.4 0 0 0 11.2 21h1.6a6.4 6.4 0 0 0 6.4-6.4c0-2.6-1.5-5.4-4.4-7.8" fill={color} />
          <path d="M9.2 6.8c.9-1.4 1.9-2.3 2.8-2.3s1.9.9 2.8 2.3z" fill={color} />
          <path d="M8.9 7.4h6.2" stroke="#1b1610" strokeOpacity="0.5" strokeWidth="1" strokeLinecap="round" />
          <path d="M9.6 12.2h4.8M9.2 15.2h5.6M10.4 18h3.2" stroke="#1b1610" strokeOpacity="0.35" strokeWidth="0.9" strokeLinecap="round" />
          <path d="M7.6 11.4c-.7 1.5-1 3-1 3.8" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      );
    /* Plume d'écriture classique, calame visible */
    case "quill":
      return (
        <svg {...common} fill="none">
          <path d="M20.6 3.4c-5.4 0-11 3.6-13 8.9l-1.7 6.5 6.6-1.7c5.3-2 8.9-7.6 9-13.7z" fill={color} />
          <path d="M6.2 17.8 17.4 6.6" stroke="#1b1610" strokeOpacity="0.4" strokeWidth="1" strokeLinecap="round" />
          <path d="M7 15.6c1.4.3 2.6.2 3.8-.2M8.6 12.6c1.2.3 2.2.2 3.2-.2" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="0.9" strokeLinecap="round" />
          <path d="M5.6 18.4 3.2 20.8" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    /* Critérium d'architecte : corps hexagonal + biseau */
    case "pencil":
      return (
        <svg {...common} fill="none">
          <path d="M5.4 10.2h12.2l1.6 1.4v2l-1.6 1.4H5.4z" fill={color} />
          <path d="M5.4 10.2 4 11.6v2.8l1.4 1.4z" fill="#1b1610" fillOpacity="0.55" />
          <path d="M8.2 10.2v-1.8h6.6v1.8" stroke="#1b1610" strokeOpacity="0.3" strokeWidth="0.9" />
          <path d="M6.4 15 4.2 19.4 8.8 17.4z" fill={color} fillOpacity="0.85" />
          <path d="M14.4 15v4.4l3-2.2z" fill="#1b1610" fillOpacity="0.6" />
        </svg>
      );
    /* Cerveau en filaire (traçé au trait uniquement) */
    case "brain":
      return (
        <svg {...common} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round">
          <path d="M12 4.6c-1.5-1.1-3.4-.9-4.3.6-1.5 0-2.8 1.3-2.6 2.9-.9.9-.9 2.6.2 3.5-.4 1.6.7 3.2 2.3 3.4.4 1.5 1.9 2.5 3.4 2 .6.7 1.5.9 2.3.6" />
          <path d="M12 4.6c1.5-1.1 3.4-.9 4.3.6 1.5 0 2.8 1.3 2.6 2.9.9.9.9 2.6-.2 3.5.4 1.6-.7 3.2-2.3 3.4-.4 1.5-1.9 2.5-3.4 2-.6.7-1.5.9-2.3.6" />
          <path d="M12 4.6v15.6" strokeOpacity="0.7" />
          <path d="M7.6 10.4c1.2.5 2.1.5 3.1.1M13.3 14.1c1-.5 1.9-.5 3.1-.1" strokeOpacity="0.8" />
        </svg>
      );
    /* Petite toile d'art sur chevalet */
    case "canvas":
      return (
        <svg {...common} fill="none">
          <rect x="4.6" y="4.4" width="14.8" height="11.2" rx="1" fill={color} />
          <rect x="6.4" y="6.2" width="11.2" height="7.6" fill="#f4ead2" />
          <circle cx="10" cy="9" r="1.1" fill="#c2542c" />
          <circle cx="13.4" cy="10.6" r="1.4" fill="#0e6f8a" />
          <path d="M8.2 12.2c1.6-1.6 4-1.9 5.6-.6" stroke="#1f8a5b" strokeWidth="1" strokeLinecap="round" />
          <path d="M8.6 15.6 6.6 20.2M15.4 15.6l2 4.6M12 15.6v4.2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    /* Optique de prise de vue (photo & vidéo) */
    case "camera":
      return (
        <svg {...common} fill="none">
          <rect x="3.4" y="7.2" width="17.2" height="12" rx="2.4" fill={color} />
          <path d="M8 7.2 9.4 5h5.2L16 7.2" fill={color} />
          <circle cx="12" cy="13.2" r="3.5" fill="#141210" />
          <circle cx="12" cy="13.2" r="3.5" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="0.8" />
          <circle cx="12" cy="13.2" r="1.2" fill="#ffffff" fillOpacity="0.75" />
          <circle cx="17.9" cy="9.8" r="0.9" fill="#ffffff" fillOpacity="0.8" />
        </svg>
      );
    /* Discque vinyle (musique) */
    default:
      return (
        <svg {...common} fill="none">
          <circle cx="12" cy="12" r="8.6" fill={color} />
          <circle cx="12" cy="12" r="6" stroke="#1b1610" strokeOpacity="0.3" strokeWidth="0.8" />
          <circle cx="12" cy="12" r="4.4" stroke="#1b1610" strokeOpacity="0.3" strokeWidth="0.8" />
          <circle cx="12" cy="12" r="2.5" fill="#ffffff" fillOpacity="0.9" />
          <circle cx="12" cy="12" r="0.9" fill="#141210" />
        </svg>
      );
  }
}
