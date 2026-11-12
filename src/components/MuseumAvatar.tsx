/* ============================================================
   MODULE ISOLÉ — Photo de profil ronde d'un Musée Virtuel
   Affiche la vraie photo (data URL locale) si elle existe, sinon
   l'avatar généré par la teinte. Aucun serveur, aucun envoi réseau.
   ============================================================ */
import type { Museum } from "../lib/types";
import { Avatar } from "./ui";

export function MuseumAvatar({ museum, size = 46, ring }: { museum: Museum; size?: number; ring?: boolean }) {
  if (!museum.photo) return <Avatar name={museum.title} hue={museum.hue} size={size} ring={ring} />;
  return (
    <span
      className={ring ? "inline-block rounded-full border border-line ring-2 ring-offset-2" : "inline-block rounded-full border border-line"}
      style={
        ring
          ? ({
              width: size,
              height: size,
              "--tw-ring-color": "var(--accent-color)",
              "--tw-ring-offset-color": "var(--surface)",
            } as React.CSSProperties)
          : { width: size, height: size }
      }
    >
      <img
        src={museum.photo}
        alt={museum.title}
        className="h-full w-full rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    </span>
  );
}
