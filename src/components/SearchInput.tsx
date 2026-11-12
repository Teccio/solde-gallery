/* ============================================================
   MODULE ISOLÉ — Champ de recherche + historique déroulant
   ------------------------------------------------------------
   CORRECTION DU FREEZE : les événements sont strictement séparés.
   · `onFocus`  → ouvre la liste (aucun appel à .focus() réentrant,
     aucun toggle : un second clic dans le champ ne ferme pas la liste).
   · `onChange` → met à jour la saisie et garde la liste ouverte ;
     aucune écriture localStorage pendant la frappe.
   · `onMouseDown` (liste) → preventDefault() empêche le blur de
     l'input avant le clic ; `onClick` (item) → sélection propre.
   · `onBlur` n'est PAS utilisé pour fermer : clic extérieur géré par
     un listener `mousedown` sur le document, et Escape/Enter au clavier.
   · CÔTÉ DROIT ÉPURÉ : aucun badge ⌘K, `type="text"` (la croix native
     de `type="search"` est supprimée) ; seul le dropdown peut apparaître
     SOUS le champ, jamais à l'intérieur. Le raccourci ⌘K reste actif.
   · La sélection d'un terme récent remplit l'input, enregistre le
     terme une seule fois et navigue, sans re-render en boucle.
   ============================================================ */
import { useEffect, useMemo, useRef, useState } from "react";
import { useUI } from "../lib/ui-context";
import { useStore } from "../lib/store";
import { clearRecentSearches, pushRecentSearch, useRecentSearches } from "../lib/recent-searches";
import { makeTr } from "../lib/l10n";
import { fuzzyRecentSearches } from "../lib/fuzzy-search";
import { Icon } from "./ui";
import { cn } from "../utils/cn";

export function SearchInput({ variant = "desktop", onDone }: { variant?: "desktop" | "mobile" | "page"; onDone?: () => void }) {
  const { query, setQuery, navigate, route } = useUI();
  const { lang, t } = useStore();
  const tr = makeTr(lang);
  const recent = useRecentSearches();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobile = variant === "mobile";
  const activeSearch = typeof document !== "undefined" ? document.activeElement?.id : undefined;
  const preserveHeaderFocus = activeSearch === "solde-search" || activeSearch === "solde-search-mobile";

  const suggestions = useMemo(() => fuzzyRecentSearches(recent, query), [recent, query]);
  const hasDraft = query.trim().length > 0;
  const panelVisible = open && (hasDraft || suggestions.length > 0);
  const panelId = `solde-recent-${variant}`;

  /* Fermeture au clic extérieur — ne touche pas au focus de l'input. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  /* ⌘K / Ctrl+K : focus sans réouverture en boucle (le provider gère déjà ce raccourci) */
  useEffect(() => {
    if (!mobile) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [mobile]);

  const submit = (term?: string) => {
    const value = (term ?? query).trim();
    setOpen(false);
    setActive(-1);
    if (!value) return;
    setQuery(value);
    pushRecentSearch(value);
    if (route !== "/recherche") navigate("/recherche");
    onDone?.();
  };

  const selectRecent = (term: string) => {
    /* Sélection fluide : une seule mise à jour d'état, pas de focus() réentrant. */
    setQuery(term);
    setOpen(false);
    setActive(-1);
    pushRecentSearch(term);
    if (route !== "/recherche") navigate("/recherche");
    onDone?.();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % suggestions.length);
      return;
    }
    if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && active >= 0 && suggestions[active]) selectRecent(suggestions[active]);
      else submit();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={cn(
        "relative",
        variant === "desktop" ? "mx-auto hidden max-w-[520px] flex-1 md:block" : "w-full",
        variant === "page" && "mb-5 max-w-xl",
      )}
      role="search"
    >
      <div ref={wrapRef} className="relative">
        <Icon name="search" className={cn("pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted", mobile ? "h-4 w-4" : "h-[18px] w-[18px]")} />
        <input
          ref={inputRef}
          autoFocus={mobile || (variant === "page" && !preserveHeaderFocus)}
          id={mobile ? "solde-search-mobile" : variant === "page" ? "solde-search-page" : "solde-search"}
          value={query}
          type="text"
          autoComplete="off"
          spellCheck={false}
          /* focus ≠ click ≠ input : aucun toggle, aucun gel */
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            setActive(-1);
            setOpen(true);
            // La recherche globale affiche les résultats dès le premier caractère saisi.
            if (value.trim() && route !== "/recherche") navigate("/recherche");
          }}
          onKeyDown={onKeyDown}
          placeholder={t("nav.search")}
          aria-expanded={panelVisible}
          aria-controls={panelId}
          aria-autocomplete="list"
          className={cn(
            "focus-ring w-full rounded-full border border-line bg-surface pr-4 text-ink placeholder:text-muted/80 focus:border-accent",
            mobile ? "h-10 pl-10 text-sm" : variant === "page" ? "h-12 pl-12 text-[14px]" : "h-11 pl-11 text-[13.5px]",
          )}
        />

        {panelVisible && (
          <div
            id={panelId}
            role="listbox"
            data-testid="recent-searches"
            /* preventDefault sur mousedown : l'input ne perd pas le focus avant le clic */
            onMouseDown={(e) => e.preventDefault()}
            className="pop absolute inset-x-0 top-[calc(100%+8px)] z-[95] overflow-hidden rounded-2xl border border-line bg-overlay p-1.5 shadow-[var(--shadow-lg)]"
          >
            {hasDraft && (
              <div data-testid="live-search-query" className="mb-1 flex items-start gap-2.5 rounded-xl bg-accentsoft px-3 py-2.5">
                <Icon name="search" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold tracking-[0.14em] text-muted uppercase">
                    {tr("Recherche en cours", "Rechèch ap fèt", "Live search", "Búsqueda en curso")}
                  </p>
                  <p aria-live="polite" className="mt-1 break-words text-[14px] font-semibold text-ink">{query}</p>
                  <p className="mt-1 text-[11px] text-muted">
                    {tr("Résultats mis à jour à chaque lettre", "Rezilta yo chanje chak lèt", "Results update with every letter", "Resultados actualizados con cada letra")}
                  </p>
                </div>
              </div>
            )}
            {suggestions.length > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5">
              <p className="text-[10.5px] font-bold tracking-[0.16em] text-muted uppercase">
                {tr("Recherches récentes", "Dènye rechèch", "Recent searches", "Búsquedas recientes")}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearRecentSearches();
                }}
                className="focus-ring rounded-full px-2 py-0.5 text-[11px] font-semibold text-muted transition hover:text-danger"
              >
                {tr("Effacer", "Efase", "Clear", "Borrar")}
              </button>
            </div>
            )}
            {suggestions.map((term, i) => (
              <button
                key={term}
                type="button"
                role="option"
                aria-selected={active === i}
                data-testid="recent-item"
                onMouseEnter={() => setActive(i)}
                onClick={() => selectRecent(term)}
                className={cn(
                  "focus-ring flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] transition",
                  active === i ? "bg-accentsoft text-ink" : "text-inksoft hover:bg-surface2",
                )}
              >
                <Icon name="clock" className="h-4 w-4 shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate">{term}</span>
                <Icon name="arrowUpRight" className="h-3.5 w-3.5 shrink-0 text-muted" />
              </button>
            ))}
          </div>
        )}
      </div>
    </form>
  );
}
