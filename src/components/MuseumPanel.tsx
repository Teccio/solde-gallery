/* ============================================================
   MODULE ISOLÉ — Panneau « Musées » de l'en-tête
   Remplace le bouton doublé de publication (« + ») :
     1. Fonder un nouveau musée (action réservée aux Premium) ;
     2. Consulter les musées créés et administrés par l'utilisateur ;
     3. Consulter les musées tiers dont il est membre invité.
   Aucune fonction financière n'est touchée.
   ============================================================ */
import { useEffect, useRef } from "react";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui-context";
import { makeTr } from "../lib/l10n";
import { isPremium } from "../lib/types";
import { isHeaderToggle } from "../lib/header-interactions";
import { Avatar, Button, Icon } from "./ui";

export function MuseumPanel({ onClose }: { onClose: () => void }) {
  const { db, user, lang } = useStore();
  const { open, navigate } = useUI();
  const tr = makeTr(lang);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (isHeaderToggle(e.target)) return;
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const mine = user ? db.museums.filter((m) => m.ownerId === user.id) : [];
  const guest = user ? db.museums.filter((m) => m.ownerId !== user.id && (m.memberIds ?? []).includes(user.id)) : [];
  const pending = (m: { requests: { status: string }[] }) => m.requests.filter((r) => r.status === "en attente").length;

  const Row = ({ id, title, hue, note, badge }: { id: string; title: string; hue: number; note: string; badge?: number }) => (
    <button
      onClick={() => {
        navigate(`/musees/${id}`);
        onClose();
      }}
      className="focus-ring flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-surface2"
    >
      <Avatar name={title} hue={hue} size={30} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-semibold text-ink">{title}</span>
        <span className="block truncate text-[11px] text-muted">{note}</span>
      </span>
      {!!badge && <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-warning">{badge}</span>}
      <Icon name="chevronRight" className="h-3.5 w-3.5 shrink-0 text-muted" />
    </button>
  );

  return (
    <div
      ref={ref}
      data-testid="museum-panel"
      className="pop fixed top-[68px] right-3 left-3 z-[90] max-h-[calc(100vh-120px)] overflow-y-auto rounded-2xl border border-line bg-overlay p-4 shadow-[var(--shadow-lg)] sm:left-auto sm:w-[340px]"
    >
      <p className="mb-3 flex items-center gap-2 text-[10.5px] font-bold tracking-[0.18em] text-muted uppercase">
        <Icon name="globe" className="h-4 w-4 text-accent" /> {tr("Musées", "Mize", "Museums", "Museos")}
      </p>

      {/* 1. Fonder un musée — action Premium (le bouton bascule sur la modale adéquate) */}
      <button
        onClick={() => {
          onClose();
          if (!user) return open({ type: "auth", mode: "login" });
          open({ type: "museum" });
        }}
        className="focus-ring flex w-full items-center gap-3 rounded-xl border border-accent/40 bg-accentsoft p-3 text-left transition hover:border-accent"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accentink">
          <Icon name="plus" className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-ink">
            {tr("Fonder un musée", "Fonde yon mize", "Found a Museum", "Fundar un museo")}
          </span>
          <span className="block text-[11px] text-muted">
            {user && isPremium(user)
              ? tr("Privilège Premium actif", "Privilèj Premium aktif", "Premium privilege active", "Privilegio Premium activo")
              : tr("Réservé aux comptes Premium", "Rezève pou kont Premium", "Premium accounts only", "Solo cuentas Premium")}
          </span>
        </span>
        <Icon name="arrowRight" className="h-4 w-4 shrink-0 text-accent" />
      </button>

      {/* 2. Musées administrés */}
      <div className="mt-4">
        <p className="mb-1 text-[10.5px] font-bold tracking-[0.16em] text-muted uppercase">
          {tr("Mes musées administrés", "Mize mwen administre", "Museums I administer", "Museos que administro")}
        </p>
        {mine.length === 0 ? (
          <p className="px-2 py-1.5 text-[12px] text-muted">{tr("Aucun pour l'instant", "Poko genyen", "None yet", "Ninguno por ahora")}</p>
        ) : (
          mine.map((m) => (
            <Row
              key={m.id}
              id={m.id}
              title={m.title}
              hue={m.hue}
              note={`${m.workIds.length} ${tr("œuvres", "zèv", "works", "obras")} · ${m.members} ${tr("membres", "manm", "members", "miembros")}`}
              badge={pending(m)}
            />
          ))
        )}
      </div>

      {/* 3. Musées tiers où l'utilisateur est membre invité */}
      <div className="mt-3 border-t border-line pt-3">
        <p className="mb-1 text-[10.5px] font-bold tracking-[0.16em] text-muted uppercase">
          {tr("Musées dont je suis membre", "Mize kote mwen manm", "Museums I belong to", "Museos a los que pertenezco")}
        </p>
        {!user ? (
          <p className="px-2 py-1.5 text-[12px] text-muted">
            {tr("Connectez-vous pour voir vos appartenances.", "Konekte pou wè mize ou yo.", "Sign in to see your memberships.", "Inicia sesión para ver tus museos.")}
          </p>
        ) : guest.length === 0 ? (
          <p className="px-2 py-1.5 text-[12px] text-muted">{tr("Aucun pour l'instant", "Poko genyen", "None yet", "Ninguno por ahora")}</p>
        ) : (
          guest.map((m) => {
            const owner = db.users.find((u) => u.id === m.ownerId);
            return (
              <Row
                key={m.id}
                id={m.id}
                title={m.title}
                hue={m.hue}
                note={tr(`Administré par ${owner?.name ?? ""}`, `Administre pa ${owner?.name ?? ""}`, `Led by ${owner?.name ?? ""}`, `Administrado por ${owner?.name ?? ""}`)}
              />
            );
          })
        )}
      </div>

      <div className="mt-3 flex gap-2 border-t border-line pt-3">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          icon="compass"
          onClick={() => {
            navigate("/musees");
            onClose();
          }}
        >
          {tr("Tous les musées", "Tout mize yo", "All museums", "Todos los museos")}
        </Button>
      </div>
    </div>
  );
}
