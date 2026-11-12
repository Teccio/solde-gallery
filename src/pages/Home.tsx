import { useEffect, useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui-context";
import { CATEGORIES, htg, isPremium } from "../lib/types";
import type { DB, Work } from "../lib/types";
import { engine, fmtTime } from "../lib/audio";
import { impactRanking, toPoints } from "../lib/awards";
import { cn } from "../utils/cn";
import { HERO_IMAGE } from "../lib/seed";
import { Avatar, Button, CardSkeleton, Chip, Icon, SectionTitle, Skeleton } from "../components/ui";
import { Cover, WorkCard } from "../components/Cover";
import { useSyncExternalStore } from "react";
import { InterestSpotlight } from "../components/InterestSpotlight";
import { prioritizeByInterests, orderedCategories } from "../lib/interests";

/* ============================================================
   MODULE Billboard aléatoire (remplace l'ancien billboard unique,
   seul module touché — le reste de la page n'est pas modifié)
   · jusqu'à 30 éléments : œuvres individuelles OU musées entiers
   · mélange aléatoire (Fisher-Yates) à chaque chargement/rafraîch.
   · minuteur : 8 s exactement par élément, fondu entre deux
   · bouton unique « Promote » (tarif masqué) → modale 50 HTG / 24 h
   · si l'élément promu est un Musée, le clic du visiteur le mène
     à l'intérieur de cette galerie collective
   ============================================================ */
type BillItem = { kind: "work"; id: string } | { kind: "museum"; id: string };

function buildPool(db: DB): BillItem[] {
  const works = db.works.filter((w) => !w.deleted && w.approved).map((w) => ({ kind: "work" as const, id: w.id }));
  const mus = db.museums.map((m) => ({ kind: "museum" as const, id: m.id }));
  const pool: BillItem[] = [...works, ...mus].slice(0, 30);
  /* Fisher-Yates : tirage équitable, rejoué à chaque montage du module */
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const active = db.promotions.find((p) => new Date(p.endsAt) > new Date());
  if (active) {
    const idx = pool.findIndex(
      (it) => (active.workId && it.kind === "work" && it.id === active.workId) || (active.museumId && it.kind === "museum" && it.id === active.museumId),
    );
    if (idx > 0) {
      const [first] = pool.splice(idx, 1);
      pool.unshift(first);
    }
  }
  return pool;
}

function Billboard() {
  const { db, userById, workById, t } = useStore();
  const { open, navigate } = useUI();
  const [pool] = useState<BillItem[]>(() => buildPool(db));
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const musicQueue = db.works.filter((w) => w.kind === "mp3" && w.approved && !w.deleted);
  const active = db.promotions.find((p) => new Date(p.endsAt) > new Date());
  const hoursLeft = active ? Math.max(0, Math.ceil((+new Date(active.endsAt) - Date.now()) / 3600000)) : 0;

  /* Minuteur 8 s + fondeur de 450 ms entre chaque élément */
  useEffect(() => {
    if (pool.length < 2) return;
    const id = window.setInterval(() => {
      setFading(true);
      window.setTimeout(() => {
        setIdx((i) => (i + 1) % pool.length);
        setFading(false);
      }, 450);
    }, 8000);
    return () => window.clearInterval(id);
  }, [pool.length]);

  const item = pool[idx] ?? pool[0];
  const work = item && item.kind === "work" ? workById(item.id) : undefined;
  const museum = item && item.kind === "museum" ? db.museums.find((m) => m.id === item.id) : undefined;
  const owner = museum ? userById(museum.ownerId) : work ? userById(work.creatorId) : undefined;
  const isPromotedNow =
    !!active &&
    ((active.workId && item?.kind === "work" && item.id === active.workId) || (active.museumId && item?.kind === "museum" && item.id === active.museumId));
  const playable = work?.kind === "mp3" ? work : musicQueue[0];

  return (
    <section className="relative overflow-hidden rounded-[26px] border border-line shadow-[var(--shadow-md)]">
      <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(100deg, rgba(12,9,5,.92) 0%, rgba(12,9,5,.74) 42%, rgba(12,9,5,.18) 100%)" }} />
      <div className="grain absolute inset-0" />

      <div className="relative flex min-h-[300px] flex-col justify-between gap-6 p-6 sm:min-h-[340px] sm:p-9">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[10.5px] font-bold tracking-[0.18em] text-white uppercase backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-color)]" />
            {t("home.featured")} · {museum ? "Musée virtuel" : "Indé"}
          </span>
          {isPromotedNow && (
            <span className="rounded-full border border-white/25 bg-black/30 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm">
              Réservé 24 h · expire dans {hoursLeft} h
            </span>
          )}
          <span className="rounded-full border border-white/15 bg-black/25 px-2.5 py-1.5 text-[10.5px] font-semibold text-white/70 tabular-nums backdrop-blur-sm">
            {idx + 1}/{pool.length}
          </span>
          {/* Bouton unique — aucun tarif affiché publiquement */}
          <button
            onClick={() => {
              if (museum) return open({ type: "promote-museum", museumId: museum.id });
              return open({ type: "promote", workId: work?.id ?? "w_soley" });
            }}
            className="focus-ring ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3.5 py-1.5 text-[12px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <Icon name="flame" className="h-3.5 w-3.5" /> Promote
          </button>
        </div>

        {/* L'élément en cours — clé = index pour rejouer le fondu */}
        <div key={item?.id ?? "bill"} className={cn("max-w-xl transition-opacity duration-[450ms] ease-out", fading ? "opacity-0" : "opacity-100")}>
          {museum ? (
            <>
              <div className="mb-4 flex items-center gap-3">
                <Avatar name={museum.title} hue={museum.hue} size={56} ring />
                <span className="text-[12px] leading-snug text-white/70">
                  Musée fondé par
                  <br />
                  <strong className="text-white">{owner?.name}</strong> · {museum.members} membres
                </span>
              </div>
              <h2 className="font-display text-[30px] leading-[1.08] font-semibold tracking-tight text-white sm:text-[40px]">{museum.title}</h2>
              <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/75">{museum.editorial}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button size="lg" icon="globe" onClick={() => navigate(`/musees/${museum.id}`)}>
                  Entrer dans le musée
                </Button>
                <span className="text-[12px] text-white/60">{museum.workIds.length} œuvres exposées</span>
              </div>
            </>
          ) : (
            <>
              {isPromotedNow && work && (
                <button
                  onClick={() => open({ type: "work", id: work.id, source: "billboard" })}
                  aria-label={`Voir ${work.title} depuis le billboard`}
                  className="focus-ring group mb-4 flex items-center gap-3 text-left"
                >
                  <Cover work={work} creatorName={owner?.name ?? ""} className="h-16 w-16 rounded-xl border border-white/20 transition group-hover:brightness-110" watermarkSize={15} />
                  <span className="text-[12px] leading-snug text-white/70">
                    Œuvre mise en avant par
                    <br />
                    <strong className="text-white">{owner?.name}</strong>
                  </span>
                </button>
              )}
              <h2 className="font-display text-[30px] leading-[1.08] font-semibold tracking-tight text-white sm:text-[40px]">
                {work?.title ?? "Les sons qui font vibrer la scène locale."}
              </h2>
              <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/75">
                {work ? `${owner?.name} — ${work.subtitle}` : "Une sélection de nouveautés choisies par notre équipe, du rasin au jazz créole."}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  icon="play"
                  onClick={() => {
                    if (playable) void engine.play(playable, musicQueue);
                  }}
                >
                  {t("home.listen")}
                </Button>
                {work && (
                  <button
                    onClick={() => open({ type: "work", id: work.id, source: "billboard" })}
                    className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-[14px] font-semibold text-white transition hover:bg-white/10"
                  >
                    Voir l'œuvre <Icon name="arrowRight" className="h-4 w-4" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function TopRail() {
  const { db, userById, t, publicWorks, user } = useStore();
  const { navigate, open } = useUI();
  const ranking = useMemo(() => impactRanking(db, "mois").slice(0, 4), [db]);
  const music = prioritizeByInterests(publicWorks.filter((w) => w.kind === "mp3"), user?.interests);
  const totalMin = Math.round(music.reduce((s, w) => s + (w.duration ?? 90), 0) / 60);

  return (
    <aside className="space-y-6">
      <div>
        <h3 className="font-display text-[21px] font-semibold text-ink">{t("home.top")}</h3>
        <p className="mt-0.5 text-[12.5px] text-muted">{t("home.topSub")}</p>
        <p className="mt-5 mb-3 text-[10.5px] font-bold tracking-[0.18em] text-muted uppercase">{t("home.week")}</p>
        <div className="space-y-1">
          {ranking.map((r, i) => {
            const u = userById(r.creatorId);
            if (!u) return null;
            return (
              <button
                key={r.creatorId}
                onClick={() => navigate(`/profil/${u.id}`)}
                className="focus-ring flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-surface2"
              >
                <Avatar name={u.name} hue={u.hue} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13.5px] font-semibold text-ink">{u.name}</span>
                    {isPremium(u) && <Icon name="crown" className="h-3 w-3 shrink-0 text-gold" />}
                  </span>
                  {/* ANONYMAT FINANCIER : le top s'affiche en Points (1 000 HTG = 1 pt) */}
                  <span className="block truncate text-[11.5px] text-muted">
                    {toPoints(r.total)} {t("points.word")} · ce mois
                  </span>
                </span>
                <span className="font-display text-[13px] tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="hairline" />

      <div>
        <h3 className="font-display text-[19px] font-semibold text-ink">{t("home.foryouBox")}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{t("home.foryouText")}</p>
        <Button variant="soft" className="mt-4 w-full justify-between" onClick={() => navigate("/createurs")}>
          {t("home.creatorSpace")} <Icon name="arrowRight" className="h-4 w-4" />
        </Button>
      </div>

      <div>
        <p className="mb-3 text-[10.5px] font-bold tracking-[0.18em] text-muted uppercase">{t("home.selection")}</p>
        <button
          onClick={() => music[0] && void engine.play(music[0], music)}
          className="focus-ring card group w-full overflow-hidden p-2.5 text-left transition hover:border-accent"
        >
          <div className="relative overflow-hidden rounded-2xl">
            <div className="aspect-[16/10] w-full">
              <svg viewBox="0 0 400 250" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
                <rect width="400" height="250" fill="#1f3b2f" />
                <path d="M0 170q70-70 140-20t130-40 130 30v110H0z" fill="#4e7a54" />
                <path d="M0 205q80-45 150 0t250-25v70H0z" fill="#2c5540" />
                <circle cx="300" cy="72" r="34" fill="#d9bd72" />
              </svg>
            </div>
            <span className="btn-accent absolute right-3 bottom-3 grid h-10 w-10 place-items-center rounded-full opacity-0 transition group-hover:opacity-100">
              <Icon name="play" className="h-4 w-4" />
            </span>
          </div>
          <div className="px-1.5 pt-3 pb-1">
            <p className="font-display text-[15.5px] font-semibold text-ink">À écouter cette semaine</p>
            <p className="mt-0.5 text-[12px] text-muted">
              {music.length} titres · {totalMin} min
            </p>
          </div>
        </button>
      </div>

      <div className="card p-4">
        <p className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
          <Icon name="trophy" className="h-4 w-4 text-gold" /> Prix d'impact du mois
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
          Ventes et dons simulés cumulés. Les ex-æquo partagent le même Sack Award.
        </p>
        <button onClick={() => navigate("/concours")} className="focus-ring mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-accent">
          Voir le classement <Icon name="arrowRight" className="h-3.5 w-3.5" />
        </button>
      </div>

      <button
        onClick={() => open({ type: "auth", mode: "signup" })}
        className="focus-ring w-full rounded-2xl border border-dashed border-linestrong p-4 text-left transition hover:border-accent"
      >
        <p className="text-[12.5px] font-semibold text-ink">Créer un compte lecteur</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
          E-mail obligatoire, aucun métier requis. Choisissez autant de centres d'intérêt que vous voulez.
        </p>
      </button>
    </aside>
  );
}

function MuseumStrip() {
  const { db, userById } = useStore();
  const { navigate } = useUI();
  return (
    <div className="card flex h-full flex-col justify-between overflow-hidden p-5">
      <div>
        <div className="flex items-center gap-2.5">
          <span data-testid="museum-title-icon" className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-gold">
            <Icon name="museum" className="h-7 w-7" />
          </span>
          <p className="font-display text-[24px] leading-tight font-semibold text-ink">Musées virtuels</p>
        </div>
        <h3 className="mt-2 font-display text-[21px] leading-tight font-semibold text-ink">
          Des collections tenues par des créateurs Premium
        </h3>
      </div>
      <div className="mt-4 space-y-2">
        {db.museums.slice(0, 3).map((m) => (
          <button
            key={m.id}
            onClick={() => navigate(`/musees/${m.id}`)}
            className="focus-ring flex w-full items-center gap-3 rounded-xl border border-line p-2.5 text-left transition hover:border-accent hover:bg-accentsoft"
          >
            <Avatar name={m.title} hue={m.hue} size={38} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-ink">{m.title}</span>
              <span className="block truncate text-[11.5px] text-muted">
                {userById(m.ownerId)?.name} · {m.workIds.length} œuvres
              </span>
            </span>
            {m.requests.filter((r) => r.status === "en attente").length > 0 && (
              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10.5px] font-bold text-warning">
                {m.requests.filter((r) => r.status === "en attente").length}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function AwardsTile() {
  const { db, userById, t } = useStore();
  const { navigate } = useUI();
  const top = impactRanking(db, "mois")[0];
  const u = top ? userById(top.creatorId) : undefined;
  return (
    <button
      onClick={() => navigate("/concours")}
      className="focus-ring card group relative flex h-full flex-col justify-between overflow-hidden p-5 text-left"
      style={{ background: "linear-gradient(150deg, color-mix(in srgb, var(--accent-color) 16%, var(--surface)), var(--surface))" }}
    >
      <div className="grain absolute inset-0" />
      <div className="relative">
        <Icon name="trophy" className="h-7 w-7 text-gold" />
        <h3 className="mt-3 font-display text-[20px] leading-tight font-semibold text-ink">Gold Sack Award</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          {u ? `${u.name} mène le mois avec ${toPoints(top!.total)} ${t("points.word")} de ventes et dons simulés.` : "Le classement du mois se construit."}
        </p>
      </div>
      <span className="relative mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-accent">
        Double moteur de concours <Icon name="arrowRight" className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
      </span>
    </button>
  );
}

export function Home() {
  const { publicWorks, userById, t, booting, db, user, favoritesOf, toggleFavorite, purchasesOf, notify } = useStore();
  const { open, navigate, routeLoading } = useUI();
  const player = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const loading = booting || routeLoading;

  const trending = useMemo(
    () => prioritizeByInterests([...publicWorks].sort((a, b) => b.plays - a.plays), user?.interests).slice(0, 4),
    [publicWorks, user?.interests],
  );
  const fresh = prioritizeByInterests(publicWorks, user?.interests).slice(0, 5);
  const owned = user ? purchasesOf(user.id).map((p) => p.workId) : [];
  const favs = user ? favoritesOf(user.id) : [];

  const playWork = (w: Work) => {
    void engine.play(w, publicWorks.filter((x) => x.kind === "mp3"));
    notify({ title: "Lecture lancée", body: `${w.title} — ${userById(w.creatorId)?.name}`, tone: "info" });
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_296px]">
      <div className="min-w-0">
        <nav className="mb-4 flex items-center gap-2 text-[12.5px] text-muted">
          <button onClick={() => navigate("/")} className="hover:text-accent">Accueil</button>
          <span>/</span>
          <span className="text-ink">{t("nav.foryou")}</span>
        </nav>

        <h1 className="max-w-3xl font-display text-[32px] leading-[1.06] font-semibold tracking-tight text-ink sm:text-[44px] lg:text-[50px]">
          {t("home.title")}
        </h1>
        <p className="mt-3 text-[15px] text-muted">{t("home.sub")}</p>

        <div className="mt-7">
          <InterestSpotlight />
          {loading ? <Skeleton className="h-[340px] w-full rounded-[26px]" /> : <Billboard />}
        </div>

        <section className="mt-10">
          <SectionTitle
            title={t("home.explore")}
            action={
              <button onClick={() => navigate("/categories")} className="focus-ring inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent">
                {t("home.seeAll")} <Icon name="arrowRight" className="h-4 w-4" />
              </button>
            }
          />
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <Chip active onClick={() => navigate("/categories")}>
              {t("home.all")}
            </Chip>
            {orderedCategories(user?.interests).map((id) => {
              const c = CATEGORIES.find((category) => category.id === id)!;
              return (
                <Chip key={id} onClick={() => navigate(id === "livres" || id === "projets" ? "/c/livres-projets" : `/c/${id}`)}>
                  {c.short}
                </Chip>
              );
            })}
          </div>
        </section>

        <section className="mt-9">
          <SectionTitle
            title={t("home.trending")}
            action={
              <button
                onClick={() => {
                  const q = publicWorks.filter((w) => w.kind === "mp3");
                  if (q[0]) void engine.play(q[0], q);
                }}
                className="focus-ring inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent"
              >
                {t("home.playlist")} <Icon name="arrowRight" className="h-4 w-4" />
              </button>
            }
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
              : trending.map((w, i) => (
                  <WorkCard
                    key={w.id}
                    work={w}
                    index={i}
                    creatorName={userById(w.creatorId)?.name ?? ""}
                    onOpen={() => open({ type: "work", id: w.id })}
                    onPlay={w.kind === "mp3" ? () => playWork(w) : undefined}
                    playing={player.track?.id === w.id && player.playing}
                    onFav={() => {
                      if (!user) return open({ type: "auth", mode: "login" });
                      toggleFavorite(w.id);
                    }}
                    isFav={favs.includes(w.id)}
                    owned={owned.includes(w.id)}
                  />
                ))}
          </div>
        </section>

        <section className="mt-9 grid gap-4 md:grid-cols-5">
          <div className="md:col-span-3">{loading ? <Skeleton className="h-56 w-full rounded-[20px]" /> : <MuseumStrip />}</div>
          <div className="md:col-span-2">{loading ? <Skeleton className="h-56 w-full rounded-[20px]" /> : <AwardsTile />}</div>
        </section>

        <section className="mt-10">
          <SectionTitle kicker="Fraîchement publié" title={t("home.newReleases")} />
          <div className="card divide-y divide-line overflow-hidden">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <Skeleton className="h-14 w-14 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))
              : fresh.map((w) => {
                  const c = userById(w.creatorId);
                  return (
                    <div key={w.id} className="group flex items-center gap-4 p-3.5 transition hover:bg-surface2">
                      <button onClick={() => open({ type: "work", id: w.id })} className="focus-ring shrink-0">
                        <Cover work={w} creatorName={c?.name ?? ""} className="h-14 w-14 rounded-xl" watermarkSize={13} />
                      </button>
                      <button onClick={() => open({ type: "work", id: w.id })} className="focus-ring min-w-0 flex-1 text-left">
                        <p className="truncate font-display text-[16px] font-semibold text-ink">{w.title}</p>
                        <p className="truncate text-[12.5px] text-muted">
                          {c?.name} · {CATEGORIES.find((x) => x.id === w.category)?.short} ·{" "}
                          {new Date(w.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </p>
                      </button>
                      {w.duration && <span className="hidden text-[12px] tabular-nums text-muted sm:block">{fmtTime(w.duration)}</span>}
                      <span className="hidden font-display text-[15px] font-semibold text-ink sm:block">
                        {w.price === 0 ? <span className="text-success">Gratuit</span> : htg(w.price)}
                      </span>
                      {w.kind === "mp3" ? (
                        <button onClick={() => playWork(w)} aria-label={`Écouter ${w.title}`} className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-inksoft transition group-hover:border-accent group-hover:text-accent">
                          <Icon name={player.track?.id === w.id && player.playing ? "pause" : "play"} className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => (user ? open({ type: "buy", workId: w.id }) : open({ type: "auth", mode: "login" }))}
                          aria-label={`Acheter ${w.title}`}
                          className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-inksoft transition group-hover:border-accent group-hover:text-accent"
                        >
                          <Icon name="bag" className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
          </div>
        </section>

        {db.tickets.length > 0 && (
          <p className="mt-6 flex items-center gap-2 text-[12px] text-muted">
            <Icon name="shield" className="h-4 w-4 text-accent" />
            {db.tickets.length} signalement(s) transmis à l'administrateur depuis ce navigateur.
          </p>
        )}
      </div>

      <div className="hidden xl:block">{loading ? <Skeleton className="h-[600px] w-full rounded-2xl" /> : <TopRail />}</div>
    </div>
  );
}

export { TopRail };
