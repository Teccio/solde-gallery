import { useMemo, useState, useSyncExternalStore } from "react";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui-context";
import { CATEGORIES, htg } from "../lib/types";
import type { CategoryId, Work } from "../lib/types";
import { engine, fmtTime } from "../lib/audio";
import { Button, CardSkeleton, Chip, EmptyState, Icon, SectionTitle, Skeleton, Tag } from "../components/ui";
import { Cover, KindBadge, WorkCard } from "../components/Cover";
import { cn } from "../utils/cn";
import { makeTr, catLabel, booksProjectsLabel } from "../lib/l10n";
import { SearchInput } from "../components/SearchInput";
import { fuzzySearchWorks } from "../lib/fuzzy-search";
import { prioritizeByInterests } from "../lib/interests";

export type CatalogMode = "category" | "all" | "trending" | "new" | "search" | "favorites" | "library" | "purchases";

const TITLES_FR: Record<CatalogMode, { title: string; kicker: string; sub: string }> = {
  category: { title: "Catalogue", kicker: "Univers", sub: "Filtrez par univers, prix et popularité." },
  all: { title: "Tous les univers", kicker: "Catégories", sub: "Six disciplines, une même place de marché en gourdes." },
  trending: { title: "Tendances", kicker: "Cette semaine", sub: "Les œuvres les plus écoutées et consultées du moment." },
  new: { title: "Nouveautés", kicker: "Fraîchement publié", sub: "Les dernières œuvres validées par la curation." },
  search: { title: "Recherche", kicker: "Explorer", sub: "Titres, artistes, étiquettes et descriptions." },
  favorites: { title: "Mes favoris", kicker: "Votre espace", sub: "Les œuvres que vous avez mises de côté." },
  library: { title: "Bibliothèque", kicker: "Votre espace", sub: "Tout ce que vous avez acquis, y compris les œuvres retirées du catalogue." },
  purchases: { title: "Mes achats", kicker: "Historique local", sub: "Chaque transaction simulée et sa licence nominative." },
};

function PurchasesView() {
  const { user, purchasesOf, db, notify } = useStore();
  const { open, navigate } = useUI();
  const entries = user ? purchasesOf(user.id) : [];
  const [q, setQ] = useState("");
  const filtered = entries.filter((e) => (e.workTitle ?? "").toLowerCase().includes(q.toLowerCase()));

  if (!user)
    return (
      <EmptyState
        icon="user"
        title="Connectez-vous pour voir vos achats"
        hint="La simulation conserve l'historique dans ce navigateur, lié au profil actif."
        action={<Button className="mt-2" onClick={() => open({ type: "auth", mode: "login" })}>Choisir un profil</Button>}
      />
    );

  const total = entries.reduce((s, e) => s + e.amount, 0);
  const lastPurchase = entries[0]?.date;

  return (
    <div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Œuvres acquises", value: String(entries.length), icon: "bag" },
          { label: "Total dépensé (simulé)", value: htg(total), icon: "wallet" },
          { label: "Dernier achat", value: lastPurchase ? new Date(lastPurchase).toLocaleDateString("fr-FR") : "—", icon: "clock" },
        ].map((s) => (
          <div key={s.label} className="card flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accentsoft text-accent">
              <Icon name={s.icon} className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11.5px] text-muted">{s.label}</p>
              <p className="font-display text-lg font-semibold text-ink">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative mb-4 max-w-sm">
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrer l'historique…"
          className="focus-ring h-10 w-full rounded-full border border-line bg-surface pr-4 pl-10 text-[13px] text-ink focus:border-accent"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="bag"
          title="Aucun achat simulé pour l'instant"
          hint="Explorez le catalogue : chaque achat validé par le code 0000 apparaîtra ici."
          action={<Button className="mt-2" onClick={() => navigate("/categories")}>Explorer le catalogue</Button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto] gap-4 border-b border-line px-4 py-3 text-[11px] font-bold tracking-[0.14em] text-muted uppercase md:grid">
            <span>Œuvre</span>
            <span>Date</span>
            <span>Montant</span>
            <span>Statut</span>
            <span />
          </div>
          <div className="divide-y divide-line">
            {filtered.map((e) => {
              const w = db.works.find((x) => x.id === e.workId);
              const removed = !w || w.deleted;
              return (
                <div key={e.id} className="grid grid-cols-1 gap-3 px-4 py-3.5 md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto] md:items-center md:gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-ink">{e.snapshot?.title ?? e.workTitle}</p>
                    <p className="truncate text-[12px] text-muted">
                      {e.snapshot?.creatorName} · {e.snapshot?.fileName}
                    </p>
                    {removed && (
                      <Tag color="var(--warning)" className="mt-1">
                        Retirée du catalogue — accès conservé
                      </Tag>
                    )}
                  </div>
                  <span className="text-[12.5px] text-muted">
                    {new Date(e.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                  <span className="font-display text-[15px] font-semibold text-ink">{htg(e.amount)}</span>
                  <span className="text-[13px] font-medium text-success">Confirmé</span>
                  <div className="flex gap-2">
                    {!removed && (
                      <Button size="sm" variant="ghost" icon="eye" onClick={() => open({ type: "work", id: e.workId! })}>
                        Voir
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      icon="download"
                      onClick={() => {
                        const body = [
                          "SOLDE gallery — REÇU DE TRANSACTION SIMULÉE",
                          `Référence : ${e.id}`,
                          `Œuvre : ${e.snapshot?.title ?? e.workTitle}`,
                          `Créateur : ${e.snapshot?.creatorName}`,
                          `Acheteur : ${e.buyerName}`,
                          `Montant : ${htg(e.amount)}`,

                          e.license,
                          "",
                          "Démonstration — aucun paiement réel.",
                        ].join("\n");
                        const url = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" }));
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `recu-${e.id}.txt`;
                        a.click();
                        setTimeout(() => URL.revokeObjectURL(url), 3000);
                        notify({ title: "Fichier + licence téléchargés", body: e.snapshot?.fileName, tone: "success" });
                      }}
                    >
                      Fichier
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function CatalogPage({ mode, category }: { mode: CatalogMode; category?: string }) {
  const { publicWorks, userById, user, favoritesOf, toggleFavorite, purchasesOf, booting, t, db, lang } = useStore();
  const { open, navigate, routeLoading, query, setQuery } = useUI();
  const player = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const [sort, setSort] = useState<"recent" | "priceAsc" | "priceDesc" | "popular">("recent");
  const [freeOnly, setFreeOnly] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [activeCat, setActiveCat] = useState<string | null>(category ?? null);
  // Le catalogue local est disponible immédiatement pendant la recherche.
  const loading = mode !== "search" && (booting || routeLoading);

  /* Onglet « Musées » : filtre les galeries collectives au lieu des œuvres. */
  const isMuseumsTab = activeCat === "musees";
  const cats: CategoryId[] =
    activeCat === "livres-projets" ? ["livres", "projets"] : activeCat && activeCat !== "musees" ? [activeCat as CategoryId] : [];

  const owned = user ? purchasesOf(user.id) : [];
  const ownedIds = owned.map((e) => e.workId);
  const favs = user ? favoritesOf(user.id) : [];

  const source: Work[] = useMemo(() => {
    if (mode === "favorites") return prioritizeByInterests(publicWorks.filter((w) => favs.includes(w.id)), user?.interests);
    if (mode === "library") return prioritizeByInterests(publicWorks.filter((w) => ownedIds.includes(w.id)), user?.interests);
    if (mode === "trending") return prioritizeByInterests([...publicWorks].sort((a, b) => b.plays - a.plays), user?.interests);
    return prioritizeByInterests(publicWorks, user?.interests);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, publicWorks, favs.join(","), ownedIds.join(","), user?.interests]);

  const results = useMemo(() => {
    let list = [...source];
    if (cats.length) list = list.filter((w) => cats.includes(w.category));
    if (freeOnly) list = list.filter((w) => w.price === 0);
    switch (sort) {
      case "priceAsc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "priceDesc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "popular":
        list.sort((a, b) => b.plays - a.plays);
        break;
      default:
        list = prioritizeByInterests(list, user?.interests);
    }
    return mode === "search" && query.trim()
      ? fuzzySearchWorks(list, query, userById, lang, sort === "recent")
      : prioritizeByInterests(list, user?.interests);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, cats.join(","), freeOnly, sort, query, mode, userById, lang]);

  /* Galeries collectives filtrées par la recherche et triées comme le catalogue. */
  const museums = useMemo(() => {
    let list = [...db.museums];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((m) =>
        (m.title + " " + m.editorial + " " + (userById(m.ownerId)?.name ?? "")).toLowerCase().includes(q),
      );
    }
    switch (sort) {
      case "popular":
        list.sort((a, b) => b.members - a.members);
        break;
      case "priceAsc":
        list.sort((a, b) => a.title.localeCompare(b.title, "fr"));
        break;
      case "priceDesc":
        list.sort((a, b) => b.title.localeCompare(a.title, "fr"));
        break;
      default:
        list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.museums, query, sort, mode]);

  const DICT: Record<CatalogMode, { title: [string, string, string, string]; sub: [string, string, string, string] }> = {
    category: {
      title: ["Catalogue", "Katalòg", "Catalog", "Catálogo"],
      sub: [
        "Filtrez par univers, prix et popularité.",
        "Filtre pa linivè, pri ak popilarite.",
        "Filter by universe, price and popularity.",
        "Filtra por universo, precio y popularidad.",
      ],
    },
    all: {
      title: ["Tous les univers", "Tout linivè yo", "All universes", "Todos los universos"],
      sub: [
        "Six disciplines, une même place de marché en gourdes.",
        "Sis disiplin, menm mache an goud.",
        "Six disciplines, one marketplace in gourdes.",
        "Seis disciplinas, un mismo mercado en gourdes.",
      ],
    },
    trending: {
      title: ["Tendances", "Tandans", "Trending", "Tendencias"],
      sub: [
        "Les œuvres les plus écoutées et consultées du moment.",
        "Zèv ki pi koute ak konsilte kounye a.",
        "The most listened and viewed works right now.",
        "Las obras más escuchadas y vistas del momento.",
      ],
    },
    new: {
      title: ["Nouveautés", "Nouveautés", "New", "Novedades"],
      sub: ["Les dernières œuvres validées par la curation.", "Dènye zèv kire yo valide.", "Latest curated works.", "Últimas obras validadas por la curaduría."],
    },
    search: {
      title: ["Recherche", "Rechèch", "Search", "Búsqueda"],
      sub: ["Titres, artistes, étiquettes et descriptions.", "Tit, atis, etikèt ak deskripsyon.", "Titles, artists, tags and descriptions.", "Títulos, artistas, etiquetas y descripciones."],
    },
    favorites: {
      title: ["Mes favoris", "Favori mwen", "My favorites", "Mis favoritos"],
      sub: ["Les œuvres que vous avez mises de côté.", "Zèv ou mete sou kote.", "Works you saved for later.", "Obras que has guardado."],
    },
    library: {
      title: ["Bibliothèque", "Bibliyotèk", "Library", "Biblioteca"],
      sub: ["Vos œuvres acquises, stockées localement.", "Zèv ou achte yo, estoke lokalman.", "Your acquired works, stored locally.", "Tus obras adquiridas, guardadas localmente."],
    },
    purchases: {
      title: ["Mes achats", "Acha m yo", "My purchases", "Mis compras"],
      sub: ["Historique local et licence nominative.", "Istorik lokal ak lisans nominatif.", "Local history and personal licence.", "Historial local y licencia nominativa."],
    },
  };
  const tr = makeTr(lang);
  const [tTitle, tSub] = [tr(...DICT[mode].title), tr(...DICT[mode].sub)];
  const meta = { ...TITLES_FR[mode], title: tTitle, sub: tSub };
  const title =
    mode === "category" && activeCat
      ? activeCat === "livres-projets"
        ? booksProjectsLabel(lang)
        : catLabel(activeCat as CategoryId, lang)
      : meta.title;

  if (mode === "purchases")
    return (
      <div>
        <Header kicker={meta.kicker} title={meta.title} sub={meta.sub} />
        <PurchasesView />
      </div>
    );

  const removedOwned = mode === "library" ? owned.filter((e) => {
    const w = db.works.find((x) => x.id === e.workId);
    return !w || w.deleted;
  }) : [];

  return (
    <div>
      <Header kicker={tr("Univers", "Linivè", "Universe", "Universo")} title={title} sub={tSub} />

      {mode === "all" && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {CATEGORIES.map((c) => {
            const count = publicWorks.filter((w) => w.category === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => navigate(c.id === "livres" || c.id === "projets" ? "/c/livres-projets" : `/c/${c.id}`)}
                className="focus-ring card group relative overflow-hidden p-5 text-left transition hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
              >
                <span className="absolute -top-8 -right-8 h-28 w-28 rounded-full opacity-15 transition group-hover:scale-125" style={{ background: c.color }} />
                <span className="relative grid h-11 w-11 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${c.color} 14%, transparent)`, color: c.color }}>
                  <Icon name={c.id === "musique" ? "music" : c.id === "photo" ? "image" : c.id === "art" ? "brush" : c.id === "architecture" ? "building" : "book"} className="h-5 w-5" />
                </span>
                <p className="relative mt-4 font-display text-[19px] font-semibold text-ink">{c.fr}</p>
                <p className="relative mt-1 text-[12.5px] text-muted">{count} œuvre{count > 1 ? "s" : ""} disponible{count > 1 ? "s" : ""}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Même module de recherche : historique déroulant et événements séparés ici aussi */}
      {mode === "search" && <SearchInput variant="page" />}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="no-scrollbar -mx-1 flex flex-1 gap-2 overflow-x-auto px-1 py-0.5">
          <Chip active={!activeCat} onClick={() => { setActiveCat(null); if (mode === "category") navigate("/categories"); }}>
            {tr("Tout", "Tout", "All", "Todo")}
          </Chip>
          {CATEGORIES.filter((c) => !cats.length || cats.includes(c.id)).map((c) => (
            <Chip key={c.id} active={cats.includes(c.id)} onClick={() => setActiveCat(c.id)}>
              {catLabel(c.id, lang, true)}
            </Chip>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFreeOnly((v) => !v)}
            className={cn(
              "focus-ring rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition",
              freeOnly ? "border-success bg-success/12 text-success" : "border-line text-muted hover:text-ink",
            )}
          >
            {tr("Gratuit", "Gratis", "Free", "Gratis")}
          </button>
          <div className="relative">
            <Icon name="sort" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              aria-label="Trier"
              className="focus-ring h-9 appearance-none rounded-full border border-line bg-surface pr-8 pl-9 text-[12.5px] font-semibold text-ink"
            >
              <option value="recent">{mode === "search" ? tr("Les plus proches", "Pi pwòch yo", "Best matches", "Mejores coincidencias") : tr("Plus récentes", "Pi resan", "Most recent", "Más recientes")}</option>
              <option value="popular">{tr("Plus populaires", "Pi popilè", "Most popular", "Más populares")}</option>
              <option value="priceAsc">{tr("Prix croissant", "Pri kwasan", "Price: low to high", "Precio ascendente")}</option>
              <option value="priceDesc">{tr("Prix décroissant", "Pri dekwasan", "Price: high to low", "Precio descendente")}</option>
            </select>
            <Icon name="chevronDown" className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          </div>
          <div className="hidden rounded-full border border-line p-0.5 sm:flex">
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-label={v === "grid" ? "Vue grille" : "Vue liste"}
                className={cn("focus-ring grid h-8 w-8 place-items-center rounded-full transition", view === v ? "bg-accentsoft text-accent" : "text-muted hover:text-ink")}
              >
                <Icon name={v} className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mb-4 text-[12.5px] text-muted">
        {loading
          ? tr("Chargement…", "N ap chaje…", "Loading…", "Cargando…")
          : `${results.length} ${tr("œuvre", "zèv", "work", "obra")}${results.length > 1 ? "s" : ""}`}
        {activeCat ? ` · ${title}` : ""}
      </p>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          icon={mode === "favorites" ? "heart" : mode === "search" ? "search" : "compass"}
          title={
            mode === "favorites"
              ? t("state.favEmpty")
              : mode === "search"
                ? t("state.searchEmpty")
                : mode === "library"
                  ? "Votre bibliothèque est vide"
                  : t("state.empty")
          }
          hint={t("state.emptyHint")}
          action={
            <Button
              className="mt-2"
              variant="outline"
              icon="refresh"
              onClick={() => {
                setActiveCat(null);
                setFreeOnly(false);
                setQuery("");
                if (mode === "category") navigate("/categories");
              }}
            >
              {tr("Réinitialiser les filtres", "Retire filtè yo", "Reset filters", "Restablecer filtros")}
            </Button>
          }
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {results.map((w, i) => (
            <WorkCard
              key={w.id}
              work={w}
              index={i}
              creatorName={userById(w.creatorId)?.name ?? ""}
              onOpen={() => open({ type: "work", id: w.id })}
              onPlay={w.kind === "mp3" ? () => void engine.play(w, results.filter((x) => x.kind === "mp3")) : undefined}
              playing={player.track?.id === w.id && player.playing}
              onFav={() => (user ? toggleFavorite(w.id) : open({ type: "auth", mode: "login" }))}
              isFav={favs.includes(w.id)}
              owned={ownedIds.includes(w.id)}
            />
          ))}
        </div>
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {results.map((w) => (
            <div key={w.id} className="group flex items-center gap-4 p-3.5 transition hover:bg-surface2">
              <button onClick={() => open({ type: "work", id: w.id })} className="focus-ring shrink-0">
                <Cover work={w} creatorName={userById(w.creatorId)?.name ?? ""} className="h-16 w-16 rounded-xl" watermarkSize={14} />
              </button>
              <button onClick={() => open({ type: "work", id: w.id })} className="focus-ring min-w-0 flex-1 text-left">
                <p className="truncate font-display text-[16px] font-semibold text-ink">{w.title}</p>
                <p className="truncate text-[12.5px] text-muted">
                  {userById(w.creatorId)?.name} · {w.subtitle}
                </p>
              </button>
              <span className="hidden sm:block"><KindBadge kind={w.kind} /></span>
              {w.duration && <span className="hidden text-[12px] tabular-nums text-muted md:block">{fmtTime(w.duration)}</span>}
              <span className="font-display text-[15px] font-semibold text-ink">
                {w.price === 0 ? <span className="text-success">Gratuit</span> : htg(w.price)}
              </span>
              <Button size="sm" variant="outline" onClick={() => (user ? open({ type: "buy", workId: w.id }) : open({ type: "auth", mode: "login" }))}>
                {ownedIds.includes(w.id)
                  ? tr("Revoir", "Wè ankò", "View again", "Ver de nuevo")
                  : w.price === 0
                    ? tr("Obtenir", "Jwenn", "Get", "Obtener")
                    : t("action.buy")}
              </Button>
            </div>
          ))}
        </div>
      )}

      {removedOwned.length > 0 && (
        <section className="mt-10">
          <SectionTitle kicker="Accès conservé" title="Œuvres retirées du catalogue" />
          <div className="card divide-y divide-line overflow-hidden">
            {removedOwned.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-warning/12 text-warning">
                  <Icon name="lock" className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink">{e.snapshot?.title}</p>
                  <p className="text-[12px] text-muted">
                    {e.snapshot?.creatorName} · acquise le {new Date(e.date).toLocaleDateString("fr-FR")} · licence nominative
                  </p>
                </div>
                <Tag color="var(--warning)">Historique client</Tag>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-muted">
            Une œuvre supprimée par son créateur disparaît du catalogue public, mais reste accessible aux clients qui
            l'avaient déjà acquise.
          </p>
        </section>
      )}
    </div>
  );
}

function Header({ kicker, title, sub }: { kicker: string; title: string; sub: string }) {
  const { navigate } = useUI();
  const { booting } = useStore();
  return (
    <div className="mb-7">
      <nav className="mb-3 flex items-center gap-2 text-[12.5px] text-muted">
        <button onClick={() => navigate("/")} className="hover:text-accent">Accueil</button>
        <span>/</span>
        <span className="text-ink">{title}</span>
      </nav>
      {booting ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
      ) : (
        <>
          <p className="mb-1.5 text-[11px] font-bold tracking-[0.18em] text-accent uppercase">{kicker}</p>
          <h1 className="font-display text-[30px] leading-tight font-semibold tracking-tight text-ink sm:text-[38px]">{title}</h1>
          <p className="mt-2 max-w-2xl text-[14.5px] text-muted">{sub}</p>
        </>
      )}
    </div>
  );
}
