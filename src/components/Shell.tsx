import { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui-context";
import { ACCENTS, CATEGORIES, isPremium } from "../lib/types";
import { catLabel, booksProjectsLabel } from "../lib/l10n";
import { haitiSeason } from "../lib/awards";
import { Avatar, Button, Icon, IconButton, Tag } from "./ui";
import { HeaderWallet } from "./HeaderWallet";
import { MuseumPanel } from "./MuseumPanel";
import { SearchInput } from "./SearchInput";
import { NotificationBell, NotificationsPanel } from "./NotificationsPanel";
import { requestAccountTab } from "../lib/account-tab";
import type { AccountTab } from "../lib/account-tab";
import type { HeaderPanel } from "../lib/ui-context";
import { isHeaderToggle } from "../lib/header-interactions";
import { cn } from "../utils/cn";

const NAV_MAIN = [
  { to: "/", key: "nav.foryou", icon: "compass" },
  { to: "/tendances", key: "nav.trending", icon: "flame" },
  { to: "/nouveautes", key: "nav.new", icon: "clock" },
  { to: "/categories", key: "nav.categories", icon: "grid" },
];
const NAV_SPACE = [
  { to: "/bibliotheque", key: "nav.library", icon: "library" },
  { to: "/achats", key: "nav.purchases", icon: "bag" },
  { to: "/favoris", key: "nav.favorites", icon: "heart" },
];
const NAV_UNIVERSE = [
  { to: "/c/musique", fr: "Musique", icon: "music" },
  { to: "/c/photo", fr: "Photo & vidéo", icon: "image" },
  { to: "/c/art", fr: "Art & tableaux", icon: "brush" },
  { to: "/c/architecture", fr: "Architecture", icon: "building" },
  { to: "/c/livres-projets", fr: "Livres et projets", icon: "book" },
  { to: "/musees", fr: "Musées", icon: "globe" },
  { to: "/concours", fr: "Concours", icon: "trophy" },
];

function useOutside(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (isHeaderToggle(e.target)) return;
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", k);
    };
  }, [onClose]);
  return ref;
}

function NavItem({
  to,
  label,
  icon,
  active,
  onClick,
}: {
  to: string;
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      data-to={to}
      className={cn(
        "focus-ring group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200",
        active ? "bg-accentsoft text-ink" : "text-inksoft hover:bg-surface2 hover:text-ink",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full transition-all",
          active ? "bg-accent opacity-100" : "opacity-0",
        )}
      />
      <Icon name={icon} className={cn("h-[18px] w-[18px] transition", active ? "text-accent" : "text-muted group-hover:text-accent")} />
      <span className="truncate">{label}</span>
    </button>
  );
}

export function Sidebar() {
  const { t, user, lang } = useStore();
  const { route, navigate, open, setChatOpen } = useUI();
  return (
    <aside className="fixed top-[104px] bottom-[92px] left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-surface/70 backdrop-blur-xl lg:flex">
      <nav
        className="flex-1 space-y-6 overflow-y-auto px-4 py-5"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0, #000 12px, #000 calc(100% - 26px), transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0, #000 12px, #000 calc(100% - 26px), transparent 100%)",
        }}
      >
        <div>
          <p className="mb-2 px-3 text-[10.5px] font-bold tracking-[0.18em] text-muted uppercase">{t("nav.discover")}</p>
          <div className="space-y-0.5">
            {NAV_MAIN.map((n) => (
              <NavItem key={n.to} to={n.to} icon={n.icon} label={t(n.key)} active={route === n.to} onClick={() => navigate(n.to)} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 px-3 text-[10.5px] font-bold tracking-[0.18em] text-muted uppercase">{t("nav.space")}</p>
          <div className="space-y-0.5">
            {NAV_SPACE.map((n) => (
              <NavItem key={n.to} to={n.to} icon={n.icon} label={t(n.key)} active={route === n.to} onClick={() => navigate(n.to)} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 px-3 text-[10.5px] font-bold tracking-[0.18em] text-muted uppercase">{t("nav.universes")}</p>
          <div className="space-y-0.5">
            {NAV_UNIVERSE.map((n) => {
              const label =
                n.to === "/musees" ? t("museums.title")
                : n.to === "/concours" ? t("nav.awards")
                : n.to === "/c/livres-projets" ? booksProjectsLabel(lang)
                : catLabel(n.to.replace("/c/", "") as never, lang, true);
              return <NavItem key={n.to} to={n.to} icon={n.icon} label={label} active={route === n.to} onClick={() => navigate(n.to)} />;
            })}
          </div>
        </div>

        <button
          onClick={() => setChatOpen(true)}
          className="focus-ring flex w-full items-center gap-3 rounded-xl border border-accent/40 bg-accentsoft px-3 py-3 text-left transition hover:border-accent"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accentink">
            <Icon name="sparkles" className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-ink">{t("nav.assistant")}</span>
            <span className="block truncate text-[11px] text-muted">Support guidé FR / Kreyòl</span>
          </span>
        </button>
      </nav>

      <div className="border-t border-line px-4 py-4">
        <p className="mb-2 text-[12px] text-muted">{t("nav.share")}</p>
        <Button
          variant="soft"
          className="w-full justify-between"
          onClick={() => (user?.isCreator ? open({ type: "publish" }) : navigate("/createurs"))}
        >
          {t("nav.openStudio")} <Icon name="arrowRight" className="h-4 w-4" />
        </Button>
        <div className="mt-3 flex gap-2 text-[11px] text-muted">
          <button onClick={() => navigate("/apropos")} className="hover:text-accent">À propos</button>
          <span>·</span>
          <button onClick={() => setChatOpen(true)} className="hover:text-accent">Aide</button>
          <span>·</span>
          <button onClick={() => navigate("/apropos")} className="hover:text-accent">Conditions</button>
        </div>
      </div>
    </aside>
  );
}

function PalettePanel({ onClose }: { onClose: () => void }) {
  const { db, setPrefs, resetDemo, notify } = useStore();
  const { open } = useUI();
  const ref = useOutside(onClose);
  const season = haitiSeason();
  return (
    <div
      ref={ref}
      id="appearance-panel"
      data-testid="appearance-panel"
      className="pop fixed top-[68px] right-3 left-3 z-[90] rounded-2xl border border-line bg-overlay p-4 shadow-[var(--shadow-lg)] sm:left-auto sm:w-[320px]"
    >
      <p className="mb-2 text-[10.5px] font-bold tracking-[0.18em] text-muted uppercase">Apparence</p>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {(
          [
            { k: "light", label: "Clair & Or", icon: "sun" },
            { k: "dark", label: "Sombre", icon: "moon" },
          ] as const
        ).map((o) => (
          <button
            key={o.k}
            onClick={() => setPrefs({ theme: o.k })}
            className={cn(
              "focus-ring flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition",
              db.prefs.theme === o.k ? "border-accent bg-accentsoft text-ink" : "border-line text-muted hover:text-ink",
            )}
          >
            <Icon name={o.icon} className="h-4 w-4" /> {o.label}
          </button>
        ))}
      </div>

      <p className="mb-2 text-[10.5px] font-bold tracking-[0.18em] text-muted uppercase">Couleur des boutons</p>
      <div className="mb-1 grid grid-cols-8 gap-1.5">
        {ACCENTS.map((a) => (
          <button
            key={a.value}
            title={a.name}
            aria-label={`Accent ${a.name}`}
            onClick={() => setPrefs({ accent: a.value, accentName: a.name })}
            className={cn(
              "focus-ring aspect-square rounded-full border-2 transition-transform hover:scale-110",
              db.prefs.accent === a.value ? "border-ink" : "border-transparent",
            )}
            style={{ background: a.value }}
          />
        ))}
      </div>
      <p className="mb-4 text-[11px] text-muted">
        Accent actif : <span className="font-semibold text-ink">{db.prefs.accentName}</span> — appliqué sans rechargement.
      </p>

      <p className="mb-2 text-[10.5px] font-bold tracking-[0.18em] text-muted uppercase">Langue / Lang</p>
      {/* Sélecteur strict quadrilingue — bascule l'interface entière */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        {(
          [
            { k: "fr", label: "Français" },
            { k: "ht", label: "Kreyòl" },
            { k: "en", label: "English" },
            { k: "es", label: "Español" },
          ] as const
        ).map((o) => (
          <button
            key={o.k}
            onClick={() => setPrefs({ lang: o.k })}
            className={cn(
              "focus-ring rounded-xl border px-3 py-2 text-[13px] font-semibold transition",
              db.prefs.lang === o.k ? "border-accent bg-accentsoft text-ink" : "border-line text-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-line bg-surface2 p-3">
        <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink">
          <Icon name="info" className="h-3.5 w-3.5 text-accent" /> Fond saisonnier (mode sombre)
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">{season.label} · opacité 0,045 · flou 80 px</p>
      </div>

      <button
        onClick={() =>
          open({
            type: "confirm",
            title: "Réinitialiser la démonstration ?",
            body: "Comptes créés, achats, wallets, favoris et musées reviendront au jeu de données initial. Cette action est irréversible.",
            confirmLabel: "Réinitialiser",
            tone: "danger",
            onConfirm: () => {
              resetDemo();
              notify({ title: "Démonstration réinitialisée", tone: "info" });
              onClose();
            },
          })
        }
        className="focus-ring mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-line px-3 py-2 text-[12.5px] font-semibold text-danger transition hover:bg-danger/8"
      >
        <Icon name="refresh" className="h-4 w-4" /> Réinitialiser les données locales
      </button>
    </div>
  );
}

function ProfileMenu({ onClose }: { onClose: () => void }) {
  const { user, logout, notify, t } = useStore();
  const { navigate, open } = useUI();
  const ref = useOutside(onClose);
  if (!user) return null;
  const items: { label: string; to: string; icon: string; tab?: AccountTab }[] = [
    { label: t("nav.account"), to: `/profil/${user.id}`, icon: "user" },
    { label: t("nav.library"), to: `/profil/${user.id}`, icon: "library", tab: "library" },
    { label: t("profile.messages"), to: `/profil/${user.id}`, icon: "chat", tab: "messages" },
    { label: t("nav.studio"), to: "/studio", icon: "grid" },
    { label: t("nav.purchases"), to: "/achats", icon: "bag" },
    { label: t("nav.favorites"), to: "/favoris", icon: "heart" },
  ];
  return (
    <div
      ref={ref}
      className="pop fixed top-[68px] right-3 left-3 z-[90] rounded-2xl border border-line bg-overlay p-3 shadow-[var(--shadow-lg)] sm:left-auto sm:w-[268px]"
    >
      <div className="flex items-center gap-3 rounded-xl bg-surface2 p-3">
        <Avatar name={user.name} hue={user.hue} size={40} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
          <p className="truncate text-[11.5px] text-muted">{user.email}</p>
        </div>
      </div>
      <div className="mt-2 space-y-0.5">
        {items.map((i) => (
          <button
            key={i.label}
            onClick={() => {
              navigate(i.to);
              if (i.tab) requestAccountTab(i.tab);
              onClose();
            }}
            className="focus-ring flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-inksoft transition hover:bg-surface2 hover:text-ink"
          >
            <Icon name={i.icon} className="h-4 w-4 text-muted" /> {i.label}
          </button>
        ))}
      </div>
      {!isPremium(user) && (
        <Button
          size="sm"
          className="mt-2 w-full"
          icon="crown"
          onClick={() => {
            open({ type: "premium" });
            onClose();
          }}
        >
          Passer à Premium
        </Button>
      )}
      <button
        onClick={() => {
          logout();
          notify({ title: "Session fermée", body: "Vos données locales sont conservées.", tone: "info" });
          onClose();
          navigate("/");
        }}
        className="focus-ring mt-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-danger transition hover:bg-danger/8"
      >
        <Icon name="arrowRight" className="h-4 w-4" /> Déconnexion
      </button>
    </div>
  );
}

export function TopBar() {
  const { t, user, db, setPrefs } = useStore();
  const { navigate, open, chatOpen, setChatOpen, headerPanel: panel, setHeaderPanel: setPanel } = useUI();
  const [mobileSearch, setMobileSearch] = useState(false);

  const togglePanel = (target: HeaderPanel) => {
    setChatOpen(false);
    setPanel((current) => current === target ? "none" : target);
  };
  const toggleAssistant = () => {
    setPanel("none");
    setChatOpen((current) => !current);
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 h-[68px] border-b border-line bg-ivory/85 backdrop-blur-xl">
        <div className="flex h-full items-center gap-3 px-3 sm:px-5">
          <button onClick={() => navigate("/")} className="focus-ring flex shrink-0 items-center gap-2.5">
            <span
              className="grid h-10 w-10 place-items-center rounded-xl text-accentink shadow-[var(--shadow-sm)]"
              style={{ background: "linear-gradient(145deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 62%, #000))" }}
            >
              <Icon name="arrowUp" className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <span className="hidden font-display text-[21px] leading-none font-semibold tracking-tight text-ink sm:block">
              SOLDE <span className="font-normal italic">gallery</span>
            </span>
          </button>

          <SearchInput variant="desktop" />

          <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
            <IconButton
              name="search"
              label={t("nav.search")}
              className="md:hidden"
              onClick={() => setMobileSearch((v) => !v)}
            />
            <IconButton
              name="sparkles"
              label={t("nav.assistant")}
              data-header-toggle="assistant"
              data-testid="header-assistant-mobile"
              aria-expanded={chatOpen}
              aria-controls="assistant-panel"
              className="xl:hidden"
              active={chatOpen}
              onClick={toggleAssistant}
            />
            <button
              onClick={toggleAssistant}
              data-header-toggle="assistant"
              data-testid="header-assistant-desktop"
              aria-expanded={chatOpen}
              aria-controls="assistant-panel"
              className="focus-ring hidden items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium text-inksoft transition hover:bg-accentsoft hover:text-ink xl:flex"
            >
              <Icon name="sparkles" className="h-[18px] w-[18px] text-accent" /> {t("nav.assistant")}
            </button>
            <button
              onClick={() => navigate("/createurs")}
              className="focus-ring hidden rounded-full px-3 py-2 text-[13px] font-medium text-inksoft transition hover:bg-accentsoft hover:text-ink lg:block"
            >
              {t("nav.creators")}
            </button>
            <IconButton
              name={db.prefs.theme === "light" ? "moon" : "sun"}
              label={db.prefs.theme === "light" ? t("nav.dark") : t("nav.light")}
              /* Sur mobile connecté, la place est cédée au solde : le thème reste réglable dans la palette */
              className={user ? "hidden sm:grid" : undefined}
              onClick={() => setPrefs({ theme: db.prefs.theme === "light" ? "dark" : "light" })}
            />
            <IconButton
              name="palette"
              data-testid="palette-button"
              data-header-toggle="palette"
              aria-expanded={panel === "palette"}
              aria-controls="appearance-panel"
              label={t("nav.palette")}
              active={panel === "palette"}
              onClick={() => togglePanel("palette")}
            />
            {/* MODULE Notifications : cloche dorée à côté du solde */}
            <NotificationBell
              active={panel === "notifications"}
              onClick={() => togglePanel("notifications")}
            />
            {/* MODULE Solde permanent (toutes pages) — compte connecté uniquement */}
            {user && <HeaderWallet />}
            {user ? (
              <button
                onClick={() => togglePanel("profile")}
                data-header-toggle="profile"
                aria-expanded={panel === "profile"}
                className="focus-ring relative rounded-full"
                aria-label="Menu du profil"
              >
                <Avatar name={user.name} hue={user.hue} size={38} ring={isPremium(user)} />
              </button>
            ) : (
              <button
                onClick={() => open({ type: "auth", mode: "login" })}
                className="focus-ring hidden rounded-full px-3 py-2 text-[13px] font-semibold text-ink transition hover:bg-accentsoft sm:block"
              >
                {t("nav.signin")}
              </button>
            )}
            {/* MODULE Musées : remplace le bouton de publication doublé.
                La publication reste accessible en bas (navigation mobile) et dans « Mon studio ». */}
            <button
              onClick={() => togglePanel("museums")}
              data-header-toggle="museums"
              aria-expanded={panel === "museums"}
              aria-label={t("museums.title")}
              data-testid="header-museums"
              className={cn(
                "focus-ring inline-flex h-10 items-center gap-1.5 rounded-full border px-2.5 text-[13px] font-semibold transition",
                panel === "museums"
                  ? "border-accent bg-accentsoft text-ink"
                  : "border-line bg-surface text-inksoft hover:border-accent hover:text-ink",
              )}
            >
              <Icon name="globe" className="h-[18px] w-[18px] text-accent" />
              <span className="hidden lg:inline">{t("museums.title")}</span>
            </button>
          </div>
        </div>

        {mobileSearch && (
          <div className="pop border-t border-line bg-ivory px-3 py-2 md:hidden">
            <SearchInput variant="mobile" onDone={() => setMobileSearch(false)} />
          </div>
        )}
      </header>

      {panel === "palette" && <PalettePanel onClose={() => setPanel("none")} />}
      {panel === "museums" && <MuseumPanel onClose={() => setPanel("none")} />}
      {panel === "notifications" && <NotificationsPanel onClose={() => setPanel("none")} />}
      {panel === "profile" && <ProfileMenu onClose={() => setPanel("none")} />}
    </>
  );
}

const SEASON_I18N: Record<string, string> = {
  independance: "season.jan1",
  drapeau: "season.may18",
  vertieres: "season.nov1",
  pluies: "season.pluies",
  seche: "season.seche",
};

export function DemoRibbon() {
  const { user, db, login, notify, t } = useStore();
  const { open } = useUI();
  const season = haitiSeason();
  return (
    <div className="fixed inset-x-0 top-[68px] z-40 flex h-9 items-center gap-3 overflow-hidden border-b border-line bg-surface/80 px-3 text-[11.5px] backdrop-blur-xl sm:px-5">
      <span className="flex shrink-0 items-center gap-1.5 font-semibold text-accent">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
        </span>
        {t("ribbon.sim")}
      </span>
      <span className="hidden text-muted sm:inline">{t("ribbon.note")}</span>
      <span className="ml-auto hidden items-center gap-1.5 text-muted lg:flex">
        <Icon name="info" className="h-3.5 w-3.5" /> {t(SEASON_I18N[season.key] ?? "season.seche")}
      </span>
      <span className="hidden h-4 w-px bg-line lg:block" />
      <button
        onClick={() => open({ type: "auth", mode: "login" })}
        aria-label="Changer de profil de test"
        className="focus-ring flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2.5 py-1 font-semibold text-ink transition hover:border-accent"
      >
        <Icon name="user" className="h-3.5 w-3.5 text-accent" />
        {user ? user.name.split(" ")[0] : "Visiteur"}
        <Icon name="chevronDown" className="h-3 w-3 text-muted" />
      </button>
      {!user && (
        <button
          onClick={() => {
            login("u_milo");
            notify({ title: "Profil de test activé", body: "Milo Grey · créateur Basique", tone: "success" });
          }}
          className="focus-ring hidden shrink-0 rounded-full bg-accentsoft px-2.5 py-1 font-semibold text-ink transition hover:brightness-95 sm:block"
        >
          {t("ribbon.try")}
        </button>
      )}
      {db.tickets.length > 0 && (
        <Tag color="var(--danger)" className="hidden shrink-0 sm:inline-flex">
          {db.tickets.length} alerte{db.tickets.length > 1 ? "s" : ""} admin
        </Tag>
      )}
    </div>
  );
}

export function BottomNav() {
  const { t, user } = useStore();
  const { route, navigate, open } = useUI();
  const items = [
    { to: "/", label: t("nav.foryou"), icon: "compass" },
    { to: "/categories", label: t("nav.universes"), icon: "grid" },
    { to: "publish", label: t("nav.publish"), icon: "plus" },
    { to: "/favoris", label: t("nav.favorites"), icon: "heart" },
    { to: user ? `/profil/${user.id}` : "auth", label: t("nav.profile"), icon: "user" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[60] flex h-[62px] items-stretch border-t border-line bg-ivory/95 backdrop-blur-xl lg:hidden">
      {items.map((i) => {
        const active = route === i.to;
        const center = i.to === "publish";
        return (
          <button
            key={i.to}
            onClick={() => {
              if (center) return user?.isCreator ? open({ type: "publish" }) : open({ type: "auth", mode: "signup" });
              if (i.to === "auth") return open({ type: "auth", mode: "login" });
              navigate(i.to);
            }}
            className="focus-ring relative flex flex-1 flex-col items-center justify-center gap-1"
          >
            {center ? (
              <span className="btn-accent grid h-9 w-9 place-items-center rounded-full">
                <Icon name="plus" className="h-5 w-5" strokeWidth={2.4} />
              </span>
            ) : (
              <Icon name={i.icon} className={cn("h-[19px] w-[19px]", active ? "text-accent" : "text-muted")} />
            )}
            <span className={cn("text-[10px] font-medium", active ? "text-accent" : "text-muted")}>{i.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useStore();
  const tones: Record<string, { color: string; icon: string }> = {
    info: { color: "var(--info)", icon: "info" },
    success: { color: "var(--success)", icon: "check" },
    warn: { color: "var(--warning)", icon: "alert" },
    danger: { color: "var(--danger)", icon: "alert" },
  };
  return (
    <div className="pointer-events-none fixed right-3 bottom-[168px] z-[130] flex w-[min(360px,calc(100vw-24px))] flex-col gap-2 lg:bottom-[108px]">
      {toasts.map((t) => {
        const tone = tones[t.tone];
        return (
          <div
            key={t.id}
            className="pop pointer-events-auto flex items-start gap-3 rounded-2xl border border-line bg-overlay p-3.5 shadow-[var(--shadow-lg)]"
            style={{ borderLeft: `3px solid ${tone.color}` }}
            role="status"
          >
            <span className="mt-0.5 shrink-0" style={{ color: tone.color }}>
              <Icon name={tone.icon} className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-ink">{t.title}</p>
              {t.body && <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{t.body}</p>}
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="focus-ring -mt-1 -mr-1 grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-surface2 hover:text-ink"
              aria-label="Fermer la notification"
            >
              <Icon name="x" className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function Atmosphere() {
  const { db } = useStore();
  const season = haitiSeason();
  return (
    <>
      <div className="aurora" aria-hidden="true" />
      {/* Fond abstrait saisonnier injecté selon la date locale (Haïti), uniquement en mode sombre */}
      {db.prefs.theme === "dark" && (
        <>
          <div className="season-layer" style={{ backgroundImage: season.css }} aria-hidden="true" />
          <div className="season-veil" aria-hidden="true" />
        </>
      )}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.35]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.25'/%3E%3C/svg%3E\")",
        }}
      />
    </>
  );
}

export { CATEGORIES };
