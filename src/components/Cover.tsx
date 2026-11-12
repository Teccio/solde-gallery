import type { Work } from "../lib/types";
import { htg } from "../lib/types";
import { cn } from "../utils/cn";
import { Icon, Tag } from "./ui";

/* Signature d'authenticité : cursive, bas-droite, inversée par
   mix-blend-mode: difference selon la teinte de la couverture. */
export function Watermark({ name, size = 30 }: { name: string; size?: number }) {
  return (
    <span
      className="watermark absolute right-3 bottom-2 leading-none"
      style={{ fontSize: size }}
      aria-label={`Signature ${name}`}
    >
      {name}
    </span>
  );
}

function Motif({ work }: { work: Work }) {
  const [a, b, c] = work.palette;
  const id = work.id;
  const common = { viewBox: "0 0 400 300", preserveAspectRatio: "xMidYMid slice" as const, className: "h-full w-full" };
  switch (work.motif) {
    case "waves":
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={b} />
              <stop offset="100%" stopColor={a} />
            </linearGradient>
          </defs>
          <rect width="400" height="300" fill={`url(#g${id})`} />
          <circle cx="270" cy="95" r="46" fill={c} opacity="0.9" />
          <path d="M0 190q60-40 120 0t120 0 160-20v130H0z" fill={a} opacity="0.85" />
          <path d="M0 225q70-34 130 4t130-6 140-14v91H0z" fill={a} />
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <rect width="400" height="300" fill={c} />
          <circle cx="250" cy="118" r="58" fill={b} />
          <circle cx="250" cy="118" r="58" fill={a} opacity="0.25" />
          <path d="M0 200q80-58 150-10t130-24 120 6v128H0z" fill={a} opacity="0.9" />
          <path d="M0 240q90-40 170 2t230-22v80H0z" fill={b} opacity="0.85" />
        </svg>
      );
    case "grid":
      return (
        <svg {...common}>
          <rect width="400" height="300" fill={c} />
          {Array.from({ length: 12 }).map((_, i) => (
            <rect
              key={i}
              x={26 + (i % 4) * 90}
              y={30 + Math.floor(i / 4) * 82}
              width="76"
              height="68"
              rx="6"
              fill={i % 3 === 0 ? a : i % 3 === 1 ? b : a}
              opacity={0.35 + ((i * 7) % 6) / 10}
            />
          ))}
        </svg>
      );
    case "page":
      return (
        <svg {...common}>
          <rect width="400" height="300" fill={a} />
          <rect x="118" y="34" width="164" height="232" rx="8" fill={c} />
          <rect x="118" y="34" width="16" height="232" fill={b} opacity="0.55" />
          {Array.from({ length: 9 }).map((_, i) => (
            <rect key={i} x="150" y={72 + i * 20} width={i % 4 === 3 ? 62 : 106} height="6" rx="3" fill={a} opacity="0.5" />
          ))}
          <rect x="150" y="52" width="72" height="9" rx="4" fill={b} />
        </svg>
      );
    case "plan":
      return (
        <svg {...common}>
          <rect width="400" height="300" fill={c} />
          <g stroke={a} strokeWidth="2" fill="none" opacity="0.85">
            <rect x="70" y="60" width="260" height="180" />
            <path d="M70 150h110v90M180 60v90M180 150h150M250 150v90" />
            <path d="M200 60v-18h60v18" />
            <circle cx="250" cy="195" r="26" strokeDasharray="4 5" />
          </g>
          <g stroke={b} strokeWidth="6" opacity="0.9">
            <path d="M70 240h70M250 240h80" />
          </g>
          <path d="M92 96h48v34H92z" fill={b} opacity="0.45" />
        </svg>
      );
    case "lens":
      return (
        <svg {...common}>
          <rect width="400" height="300" fill={a} />
          <circle cx="200" cy="150" r="110" fill={b} opacity="0.35" />
          <circle cx="200" cy="150" r="76" fill={c} opacity="0.75" />
          <circle cx="200" cy="150" r="42" fill={a} />
          <circle cx="176" cy="126" r="14" fill={c} opacity="0.8" />
          <g stroke={c} strokeWidth="1.5" opacity="0.5">
            <path d="M20 40h60M20 40v40M380 260h-60M380 260v-40" />
          </g>
        </svg>
      );
    case "disc":
      return (
        <svg {...common}>
          <rect width="400" height="300" fill={a} />
          <circle cx="200" cy="150" r="118" fill="#141210" />
          {[100, 88, 76, 64].map((r) => (
            <circle key={r} cx="200" cy="150" r={r} fill="none" stroke={c} strokeWidth="0.8" opacity="0.35" />
          ))}
          <circle cx="200" cy="150" r="42" fill={b} />
          <circle cx="200" cy="150" r="7" fill={a} />
          <path d="M200 32a118 118 0 0 1 102 59" stroke={c} strokeWidth="3" fill="none" opacity="0.6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect width="400" height="300" fill={c} />
          <path d="M40 250q40-150 130-120t100-70 90 60v130z" fill={a} opacity="0.9" />
          <circle cx="120" cy="96" r="42" fill={b} opacity="0.9" />
          <path d="M230 210q50-70 120-30v70H230z" fill={b} opacity="0.75" />
          <path d="M60 60q40 20 30 60" stroke={a} strokeWidth="7" fill="none" opacity="0.5" />
        </svg>
      );
  }
}

export function Cover({
  work,
  creatorName,
  className,
  watermark = true,
  watermarkSize = 30,
}: {
  work: Work;
  creatorName: string;
  className?: string;
  watermark?: boolean;
  watermarkSize?: number;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-surface2", className)}>
      {work.cover ? (
        <img
          src={work.cover}
          alt={work.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]"
        />
      ) : (
        <div className="h-full w-full transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]">
          <Motif work={work} />
        </div>
      )}
      <div className="grain pointer-events-none absolute inset-0" />
      {work.kind === "mp4" && (
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white backdrop-blur-sm">
          <Icon name="image" className="h-3 w-3" /> APERÇU STATIQUE
        </div>
      )}
      {work.confidential && (
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white backdrop-blur-sm">
          <Icon name="lock" className="h-3 w-3" /> CONFIDENTIEL
        </div>
      )}
      {watermark && <Watermark name={creatorName} size={watermarkSize} />}
    </div>
  );
}

export function KindBadge({ kind }: { kind: Work["kind"] }) {
  const map: Record<string, { icon: string; color: string }> = {
    mp3: { icon: "music", color: "var(--hibiscus)" },
    pdf: { icon: "file", color: "var(--saffron)" },
    zip: { icon: "grid", color: "var(--sea)" },
    jpg: { icon: "image", color: "var(--emerald)" },
    png: { icon: "image", color: "var(--emerald)" },
    dwg: { icon: "building", color: "var(--cobalt)" },
    mp4: { icon: "eye", color: "var(--terracotta)" },
  };
  const m = map[kind] ?? map.pdf;
  return (
    <Tag color={m.color}>
      <Icon name={m.icon} className="h-3 w-3" /> .{kind}
    </Tag>
  );
}

export function WorkCard({
  work,
  creatorName,
  onOpen,
  onPlay,
  onFav,
  isFav,
  playing,
  owned,
  index = 0,
}: {
  work: Work;
  creatorName: string;
  onOpen: () => void;
  onPlay?: () => void;
  onFav?: () => void;
  isFav?: boolean;
  playing?: boolean;
  owned?: boolean;
  index?: number;
}) {
  return (
    <article
      className="group card rise relative flex flex-col overflow-hidden p-2.5 transition-all duration-300 hover:-translate-y-1 hover:border-linestrong hover:shadow-[var(--shadow-md)]"
      style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
    >
      <button onClick={onOpen} className="focus-ring relative block w-full overflow-hidden rounded-2xl text-left">
        <Cover work={work} creatorName={creatorName} className="aspect-[4/3] w-full rounded-2xl" />
        {playing && (
          <span className="absolute bottom-2.5 left-2.5 flex h-6 items-end gap-[3px] rounded-full bg-black/55 px-2 py-1 backdrop-blur-sm">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="eq-bar block w-[3px] rounded-full bg-white"
                style={{ height: 12, animationDelay: `${i * 0.16}s` }}
              />
            ))}
          </span>
        )}
      </button>

      {onFav && (
        /* Cercle TOUJOURS neutre / transparent : seule la forme du cœur
           s'active, dans la couleur choisie dans la palette (--accent-color). */
        <button
          onClick={onFav}
          aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
          aria-pressed={!!isFav}
          data-testid="fav-button"
          className="focus-ring absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full border border-white/40 bg-black/35 backdrop-blur-md transition-all duration-200 hover:bg-black/55"
        >
          <span style={{ color: isFav ? "var(--accent-color)" : "#ffffff" }}>
            {/* Cœur orienté tête en haut : vide (contour blanc) ou rempli
                avec la couleur d'accent choisie par l'utilisateur. */}
            <Icon
              name="heart"
              className="h-[17px] w-[17px] transition-all duration-200"
              strokeWidth={isFav ? 1.4 : 1.8}
              fill={isFav ? "var(--accent-color)" : "none"}
            />
          </span>
        </button>
      )}

      <div className="flex flex-1 flex-col px-1.5 pt-3 pb-1">
        <div className="flex items-start gap-2">
          <button onClick={onOpen} className="focus-ring min-w-0 flex-1 text-left">
            <h3 className="truncate font-display text-[17px] leading-snug font-semibold text-ink">{work.title}</h3>
            <p className="mt-0.5 truncate text-[12.5px] text-muted">
              {creatorName} · {work.subtitle}
            </p>
          </button>
          {onPlay && (
            <button
              onClick={onPlay}
              aria-label={`Écouter ${work.title}`}
              className="focus-ring btn-accent grid h-9 w-9 shrink-0 place-items-center rounded-full"
            >
              <Icon name={playing ? "pause" : "play"} className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <KindBadge kind={work.kind} />
            {owned && <Tag color="var(--success)">Acquis</Tag>}
            {/* Compteur PUBLIC : incitation à l'achat, visible sans session */}
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold tabular-nums"
              style={{ color: "var(--accent-color)", background: "color-mix(in srgb, var(--accent-color) 12%, transparent)" }}
              data-testid="fav-count"
              aria-label={`${work.favoritesCount ?? 0} favoris`}
            >
              <Icon name="heart" className="h-3 w-3" fill="currentColor" strokeWidth={1.2} />
              {work.favoritesCount ?? 0}
            </span>
          </div>
          <span className="font-display text-[15px] font-semibold text-ink">
            {work.price === 0 ? <span className="text-success">Gratuit</span> : htg(work.price)}
          </span>
        </div>
      </div>
    </article>
  );
}
