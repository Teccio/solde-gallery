import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/cn";

/* ---------------- Icônes (tracés 24×24, currentColor) ---------------- */
const P: Record<string, React.ReactNode> = {
  play: <path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="6.5" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="14" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  next: (
    <>
      <path d="M6 5.5v13l9-6.5z" fill="currentColor" stroke="none" />
      <path d="M17.5 5v14" />
    </>
  ),
  prev: (
    <>
      <path d="M18 5.5v13L9 12z" fill="currentColor" stroke="none" />
      <path d="M6.5 5v14" />
    </>
  ),
  heart: <path d="M12 20.2s-7.6-4.6-7.6-9.7A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.6 2.9c0 5.1-7.6 9.7-7.6 9.7z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.4" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  arrowRight: <path d="M4 12h15m-6-6 6 6-6 6" />,
  arrowUpRight: <path d="M7 17 17 7m0 0h-8m8 0v8" />,
  arrowUp: <path d="M12 20V5m0 0-6 6m6-6 6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  palette: (
    <>
      <path d="M12 21a9 9 0 1 1 9-9c0 2-1.6 3-3.2 3H16a2 2 0 0 0-1.4 3.4c.5.6.2 2.6-2.6 2.6z" />
      <circle cx="7.8" cy="12.4" r="1.1" fill="currentColor" />
      <circle cx="10" cy="8.4" r="1.1" fill="currentColor" />
      <circle cx="14.6" cy="8.2" r="1.1" fill="currentColor" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3.5 13.6 8l4.4 1.6L13.6 11 12 15.5 10.4 11 6 9.6 10.4 8z" />
      <path d="M18.5 15.5 19.3 18l2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="m15.2 8.8-1.9 4.5-4.5 1.9 1.9-4.5z" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.6" />
      <rect x="13" y="4" width="7" height="7" rx="1.6" />
      <rect x="4" y="13" width="7" height="7" rx="1.6" />
      <rect x="13" y="13" width="7" height="7" rx="1.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.4V12l3 1.8" />
    </>
  ),
  library: (
    <>
      <path d="M5 4.5h3.5v15H5zM10.5 4.5H14v15h-3.5z" />
      <path d="m16.4 5.4 3 .8-3.4 13-3-.8z" />
    </>
  ),
  bag: (
    <>
      <path d="M5.5 8h13l-1 11.5h-11z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V6.5l10-2V16" />
      <circle cx="6.6" cy="18" r="2.6" />
      <circle cx="16.6" cy="16" r="2.6" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.4" />
      <circle cx="8.8" cy="9.6" r="1.6" />
      <path d="m4.5 17 4.8-4.6 3.4 3 2.6-2.2 4.2 3.8" />
    </>
  ),
  brush: (
    <>
      <path d="M12 3.8 20 19H4z" />
      <path d="M8.4 14.5h7.2" />
    </>
  ),
  building: (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" rx="2" />
      <path d="m4.5 19.5 15-15M4.5 4.5l15 15" />
    </>
  ),
  book: (
    <>
      <rect x="4.5" y="4" width="15" height="16" rx="2.2" />
      <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.6 12h16.8M12 3.4c2.4 2.4 3.4 5.6 3.4 8.6s-1 6.2-3.4 8.6c-2.4-2.4-3.4-5.6-3.4-8.6S9.6 5.8 12 3.4z" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4.5h8v4.2a4 4 0 0 1-8 0z" />
      <path d="M8 6H5.4v1.4A3.2 3.2 0 0 0 8.6 10.6M16 6h2.6v1.4a3.2 3.2 0 0 1-3.2 3.2" />
      <path d="M12 12.8v3.4m-3.2 3.3h6.4l-.7-3.3H9.5z" />
    </>
  ),
  wallet: (
    <>
      <rect x="3.6" y="6" width="16.8" height="12.6" rx="2.6" />
      <path d="M3.6 10h16.8" />
      <circle cx="16.4" cy="14.4" r="1.2" fill="currentColor" />
    </>
  ),
  download: <path d="M12 4v11m0 0 4-4m-4 4-4-4M4.6 19h14.8" />,
  upload: <path d="M12 20V9m0 0 4 4M12 9l-4 4M4.6 5h14.8" />,
  trash: (
    <>
      <path d="M4.8 6.6h14.4M9.5 6.6V4.8h5v1.8" />
      <path d="M6.6 6.6 7.6 20h8.8l1-13.4M10.4 10v6.4M13.6 10v6.4" />
    </>
  ),
  edit: <path d="M4.5 19.5h4l10-10a2.1 2.1 0 0 0-3-3l-10 10zM14 6.5l3 3" />,
  check: <path d="m5 12.6 4.6 4.4L19 6.8" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  volume: (
    <>
      <path d="M4.5 9.5h3.2L12 5.8v12.4l-4.3-3.7H4.5z" />
      <path d="M15.4 9.4a3.6 3.6 0 0 1 0 5.2M18 7a7 7 0 0 1 0 10" />
    </>
  ),
  volumeX: (
    <>
      <path d="M4.5 9.5h3.2L12 5.8v12.4l-4.3-3.7H4.5z" />
      <path d="m16 10 4 4m0-4-4 4" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  user: (
    <>
      <circle cx="12" cy="8.4" r="3.8" />
      <path d="M4.8 20c.8-3.7 3.7-5.6 7.2-5.6s6.4 1.9 7.2 5.6" />
    </>
  ),
  lock: (
    <>
      <rect x="4.8" y="10.4" width="14.4" height="9.4" rx="2.4" />
      <path d="M8.4 10.4V7.8a3.6 3.6 0 0 1 7.2 0v2.6" />
    </>
  ),
  shield: <path d="M12 3.6 19 6v5.6c0 4-2.9 7.2-7 8.8-4.1-1.6-7-4.8-7-8.8V6z" />,
  alert: (
    <>
      <path d="M12 4.6 21 19.4H3z" />
      <path d="M12 10v4m0 2.6v.2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 11v5.4M12 7.8v.2" />
    </>
  ),
  send: <path d="M4.5 12 20 4.6l-4.2 15.2-3.6-6-7.7-1.8z" />,
  filter: <path d="M4 6h16l-6.2 7v5.4l-3.6 1.6V13z" />,
  sort: <path d="M7 4.5v15m0 0-3-3m3 3 3-3M17 19.5v-15m0 0-3 3m3-3 3 3" />,
  star: <path d="m12 4 2.5 5.2 5.5.8-4 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4-3.9 5.5-.8z" />,
  crown: <path d="M4 17.5 5.4 7l4.1 3.6L12 5l2.5 5.6L18.6 7 20 17.5zM4 19.8h16" />,
  file: (
    <>
      <path d="M6.5 3.6h7L18.5 9v11.4h-12z" />
      <path d="M13.4 3.6V9h5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.8 12S6.4 6.2 12 6.2 21.2 12 21.2 12 17.6 17.8 12 17.8 2.8 12 2.8 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  dots: (
    <>
      <circle cx="6" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="18" cy="12" r="1.4" fill="currentColor" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.2 14.2a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.3 1.5z" />
    </>
  ),
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  refresh: <path d="M20 11.5A8 8 0 1 0 18 17M20 5.5v6h-6" />,
  quote: <path d="M9.5 6.5C6.5 8 5 10.4 5 13.5v4h5.5v-5.5H8c0-2 .6-3.4 2.4-4.4zm9 0C15.5 8 14 10.4 14 13.5v4h5.5v-5.5H17c0-2 .6-3.4 2.4-4.4z" />,
  walletArrow: <path d="M12 19V5m0 0-5 5m5-5 5 5" />,
  chat: <path d="M20.5 12c0 4-3.8 7.2-8.5 7.2-1 0-2-.2-2.9-.4L4 20.5l1.4-3.7A6.9 6.9 0 0 1 3.5 12C3.5 8 7.3 4.8 12 4.8s8.5 3.2 8.5 7.2z" />,
  flame: <path d="M12 3.5s5.5 4 5.5 9a5.5 5.5 0 0 1-11 0c0-2 1-3.4 1-3.4s.4 1.6 1.8 2c0-3 2.7-5.6 2.7-7.6z" />,
  /* Réseaux sociaux (profil) */
  instagram: (
    <>
      <rect x="3.8" y="3.8" width="16.4" height="16.4" rx="4.6" />
      <circle cx="12" cy="12" r="3.8" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  facebook: <path d="M14.5 8.2h2.3V4.6h-2.6c-2.7 0-4.2 1.7-4.2 4.3v2.2H7.4v3.6H10v6.7h3.7v-6.7h2.8l.5-3.6h-3.3V9.4c0-.8.3-1.2.8-1.2z" />,
  tiktok: <path d="M14.6 3.8c.4 2.4 1.9 3.9 4.4 4.1v3.3c-1.6 0-3-.5-4.3-1.3v5.8a5.3 5.3 0 1 1-5.3-5.3c.3 0 .6 0 .9.1v3.4a2 2 0 1 0 1.4 1.9V3.8z" />,
  youtube: (
    <>
      <rect x="2.8" y="5.6" width="18.4" height="12.8" rx="3.6" />
      <path d="m10.3 9.3 4.6 2.7-4.6 2.7z" fill="currentColor" stroke="none" />
    </>
  ),
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  /* Temple de musée — même trait doré que les trophées d'Awards */
  museum: (
    <>
      <path d="M3.5 8.5 12 3l8.5 5.5H3.5zM4 10h16v2H4zM6 12v7m4-7v7m4-7v7m4-7v7M3 19h18v2H3z" />
    </>
  ),
  /* Cloche de notifications (filaire, teinte dorée via currentColor) */
  bell: (
    <>
      <path d="M18 9.5a6 6 0 0 0-12 0c0 4.2-1.5 5.5-2 6.2-.3.5 0 1.3.7 1.3h14.6c.7 0 1-.8.7-1.3-.5-.7-2-2-2-6.2z" />
      <path d="M10 20a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  /* Contrôles du lecteur enrichi */
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2.2" fill="currentColor" stroke="none" />,
  shuffle: (
    <>
      <path d="M16 3h5v5" />
      <path d="M4 20 21 3" />
      <path d="M21 16v5h-5" />
      <path d="m15 15 6 6" />
      <path d="M4 4l5 5" />
    </>
  ),
  repeatOne: (
    <>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
      <text x="10.2" y="17.2" fontSize="8.5" fontWeight="800" fill="currentColor" stroke="none">1</text>
    </>
  ),
  expand: <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />,
};

export function Icon({
  name,
  className,
  strokeWidth = 1.7,
  fill,
}: {
  name: keyof typeof P | string;
  className?: string;
  strokeWidth?: number;
  /* MODULE Favoris : remplissage du cœur uniquement, sans toucher au cercle */
  fill?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill ?? "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-5 w-5 shrink-0", className)}
    >
      {P[name] ?? P.info}
    </svg>
  );
}

/* ---------------- Boutons ---------------- */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "accent" | "ghost" | "outline" | "soft" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: string;
  loading?: boolean;
};

export function Button({
  variant = "accent",
  size = "md",
  icon,
  loading,
  className,
  children,
  disabled,
  ...rest
}: BtnProps) {
  const sizes = {
    sm: "h-9 px-3.5 text-[13px] gap-1.5",
    md: "h-11 px-5 text-sm gap-2",
    lg: "h-13 px-6 text-[15px] gap-2.5 py-3.5",
  }[size];
  const variants = {
    accent: "btn-accent font-semibold",
    ghost: "text-inksoft hover:bg-accentsoft hover:text-ink",
    outline: "border border-linestrong text-ink hover:border-accent hover:bg-accentsoft",
    soft: "bg-accentsoft text-ink hover:brightness-[0.97] border border-line",
    danger: "bg-danger text-white hover:brightness-110 font-semibold",
  }[variant];
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        "focus-ring inline-flex items-center justify-center rounded-full transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        sizes,
        variants,
        className,
      )}
    >
      {loading ? (
        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent spin-slow" />
      ) : icon ? (
        <Icon name={icon} className={size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]"} />
      ) : null}
      {children}
    </button>
  );
}

export function IconButton({
  name,
  label,
  active,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { name: string; label: string; active?: boolean }) {
  return (
    <button
      {...rest}
      title={label}
      aria-label={label}
      className={cn(
        "focus-ring grid h-10 w-10 place-items-center rounded-full border transition-all duration-200",
        active
          ? "border-accent bg-accentsoft text-accent"
          : "border-line text-inksoft hover:border-linestrong hover:bg-surface2 hover:text-ink",
        className,
      )}
    >
      <Icon name={name} className="h-[18px] w-[18px]" />
    </button>
  );
}

/* ---------------- Modale accessible ---------------- */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "max-w-lg",
  tone = "default",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  tone?: "default" | "danger";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => ref.current?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 backdrop-blur-[3px]"
        style={{ background: "var(--scrim)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-overlay shadow-[var(--shadow-lg)] outline-none slide-up sm:rounded-3xl",
          width,
        )}
      >
        <div className="flex items-start gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2
              className={cn(
                "font-display text-[22px] leading-tight font-semibold tracking-tight",
                tone === "danger" ? "text-danger" : "text-ink",
              )}
            >
              {title}
            </h2>
            {subtitle && <p className="mt-1 text-[13px] leading-relaxed text-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="focus-ring -mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface2 hover:text-ink"
          >
            <Icon name="x" className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-line bg-surface2 px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- États : squelette / vide / erreur ---------------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function CardSkeleton() {
  return (
    <div className="card overflow-hidden p-3">
      <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
      <div className="space-y-2 px-1 pt-3 pb-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  icon = "compass",
  action,
}: {
  title: string;
  hint?: string;
  icon?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-surface2 text-accent">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      className="flex flex-col items-start gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center"
      style={{ borderColor: "color-mix(in srgb, var(--danger) 40%, transparent)", background: "color-mix(in srgb, var(--danger) 8%, transparent)" }}
    >
      <Icon name="alert" className="h-5 w-5 text-danger" />
      <p className="flex-1 text-sm text-ink">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" icon="refresh" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}

/* ---------------- Divers ---------------- */
export function Chip({
  active,
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...rest}
      className={cn(
        "focus-ring shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-200",
        active
          ? "border-transparent bg-accent text-accentink shadow-[var(--shadow-sm)]"
          : "border-line bg-surface text-inksoft hover:border-linestrong hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Tag({ children, color, className }: { children: React.ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide", className)}
      style={{
        color: color ?? "var(--accent-color)",
        background: `color-mix(in srgb, ${color ?? "var(--accent-color)"} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color ?? "var(--accent-color)"} 30%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}

export function Avatar({
  name,
  hue,
  size = 40,
  ring,
}: {
  name: string;
  hue: number;
  size?: number;
  ring?: boolean;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-semibold text-white", ring && "ring-2 ring-offset-2")}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(145deg, hsl(${hue} 62% 58%), hsl(${(hue + 42) % 360} 55% 38%))`,
        boxShadow: "inset 0 1px 2px rgba(255,255,255,.35)",
        ...(ring ? ({ "--tw-ring-color": "var(--accent-color)", "--tw-ring-offset-color": "var(--surface)" } as React.CSSProperties) : {}),
      }}
    >
      {initials}
    </span>
  );
}

export function SectionTitle({
  title,
  action,
  kicker,
}: {
  title: string;
  kicker?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {kicker && (
          <p className="mb-1 text-[11px] font-bold tracking-[0.18em] text-accent uppercase">{kicker}</p>
        )}
        <h2 className="font-display text-[24px] leading-tight font-semibold tracking-tight text-ink sm:text-[27px]">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold text-ink">{label}</span>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </span>
      {children}
      {error && (
        <span className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-danger">
          <Icon name="alert" className="h-3.5 w-3.5" /> {error}
        </span>
      )}
    </label>
  );
}

export const inputCls =
  "focus-ring w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 transition focus:border-accent outline-none";
