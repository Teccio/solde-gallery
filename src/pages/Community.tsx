import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui-context";
import { CATEGORIES, MIN_WITHDRAWAL, PREMIUM_MONTH, PREMIUM_YEAR, htg, isPremium } from "../lib/types";
import type { CategoryId } from "../lib/types";
import { GRAND_PRIZES, IMPACT_PRIZES, PRODUCTIVITY_PRIZES, TIER_COLORS, impactRanking, productivityRanking, toPoints } from "../lib/awards";
import type { Ranked, Tier } from "../lib/awards";
import { PrizeIcon, iconForCategory, iconForLabel, IMPACT_TIER_COLORS, PROD_TIER_COLORS } from "../components/PrizeIcons";
import { Avatar, Button, CardSkeleton, EmptyState, Icon, SectionTitle, Skeleton, Tag } from "../components/ui";
import { Cover, WorkCard } from "../components/Cover";
import { cn } from "../utils/cn";
import { makeTr, catLabel } from "../lib/l10n";
import { MuseumEditor } from "../components/MuseumEditor";
import { MuseumAvatar } from "../components/MuseumAvatar";
import { Reveal } from "../components/Reveal";

/* ---------------- Musées virtuels ---------------- */
export function Museums() {
  const { db, userById, user, booting, lang } = useStore();
  const { navigate, open, routeLoading } = useUI();
  const tr = makeTr(lang);
  const loading = booting || routeLoading;
  const [q, setQ] = useState("");
  const list = db.museums.filter((m) => (m.title + m.editorial).toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-bold tracking-[0.18em] text-accent uppercase">{tr("Collections curatées", "Koleksyon kire", "Curated collections", "Colecciones curadas")}</p>
          <h1 className="flex items-center gap-3 font-display text-[30px] leading-tight font-semibold tracking-tight text-ink sm:text-[38px]">
            <span data-testid="museum-title-icon" className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-gold">
              <Icon name="museum" className="h-8 w-8" />
            </span>
            <span>{tr("Musées virtuels", "Mize vityèl", "Virtual Museums", "Museos virtuales")}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-[14.5px] text-muted">
            {tr(
              "Chaque musée est un fil éditorial tenu par un créateur Premium : un titre, une photo ronde, une ligne claire. Les œuvres de tiers entrent uniquement après validation manuelle.",
              "Chak mize se yon fil editoryal yon kreyatè Premium kenbe : yon tit, yon foto won, yon liy klè. Zèv lòt moun yo antre sèlman apre validasyon manyèl.",
              "Each museum is an editorial feed run by a Premium creator: a title, a round photo, a clear line. Third-party works enter only after manual validation.",
              "Cada museo es un hilo editorial de un creador Premium: un título, una foto redonda y una línea clara. Las obras de terceros entran solo tras validación manual.",
            )}
          </p>
        </div>
        <Button icon="plus" onClick={() => (user ? open({ type: "museum" }) : open({ type: "auth", mode: "login" }))}>
          {tr("Fonder un musée", "Fonde yon mize", "Found a Museum", "Fundar un museo")}
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-[20px]" />)}
        </div>
      ) : (
        <>
          <div className="relative mb-5 max-w-sm">
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tr("Rechercher un musée…", "Chèche yon mize…", "Search a museum…", "Buscar un museo…")}
              className="focus-ring h-10 w-full rounded-full border border-line bg-surface pr-4 pl-10 text-[13px] text-ink focus:border-accent"
            />
          </div>

          {list.length === 0 ? (
            <EmptyState
            icon="globe"
            title={tr("Aucun musée trouvé", "Nou pa jwenn mize", "No museum found", "No se encontró ningún museo")}
            hint={tr("Essayez un autre mot-clé ou fondez votre propre collection.", "Eseye yon lòt mo oswa fonde koleksyon pa w.", "Try another keyword or found your own collection.", "Prueba otra palabra o funda tu propia colección.")}
          />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {list.map((m, i) => {
                const owner = userById(m.ownerId);
                const pending = m.requests.filter((r) => r.status === "en attente").length;
                return (
                  <button
                    key={m.id}
                    onClick={() => navigate(`/musees/${m.id}`)}
                    className="focus-ring card rise group flex items-start gap-4 p-4 text-left transition hover:-translate-y-0.5 hover:border-accent hover:shadow-[var(--shadow-md)]"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <MuseumAvatar museum={m} size={58} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-display text-[18px] font-semibold text-ink">{m.title}</p>
                        <Icon name="crown" className="h-3.5 w-3.5 shrink-0 text-gold" />
                      </div>
                      <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{m.editorial}</p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
                        <span>{owner?.name}</span>
                        <span>·</span>
                        <span>{m.members} membres</span>
                        <span>·</span>
                        <span>{m.workIds.length} œuvres</span>
                        {m.ownerId === user?.id && pending > 0 && <Tag color="var(--warning)">{pending} à valider</Tag>}
                      </div>
                    </div>
                    <Icon name="chevronRight" className="mt-1 h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-accent" />
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function MuseumDetail({ id }: { id: string }) {
  const { db, user, userById, workById, resolveRequest, notify, favoritesOf, toggleFavorite, joinMuseum, leaveMuseum, lang } = useStore();
  const tr = makeTr(lang);
  const { open, navigate } = useUI();
  const [editing, setEditing] = useState(false);
  const museum = db.museums.find((m) => m.id === id);
  if (!museum) return <EmptyState icon="globe" title="Musée introuvable" hint="Il a peut-être été retiré lors d'une réinitialisation." action={<Button className="mt-2" onClick={() => navigate("/musees")}>Retour aux musées</Button>} />;
  const owner = userById(museum.ownerId);
  const isOwner = user?.id === museum.ownerId;
  const isMember = !!user && (museum.memberIds ?? []).includes(user.id);
  const works = museum.workIds.map((w) => workById(w)).filter((w) => w && !w.deleted);
  const pending = museum.requests.filter((r) => r.status === "en attente");
  const favs = user ? favoritesOf(user.id) : [];

  return (
    <div>
      <button onClick={() => navigate("/musees")} className="focus-ring mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-accent">
        <Icon name="chevronLeft" className="h-4 w-4" /> Tous les musées
      </button>

      <div className="card overflow-hidden">
        <div className="h-24" style={{ background: `linear-gradient(120deg, hsl(${museum.hue} 52% 40%), hsl(${(museum.hue + 40) % 360} 45% 26%))` }} />
        <div className="flex flex-wrap items-end gap-4 px-5 pb-5 sm:px-7">
          <div className="-mt-10 rounded-full border-4 border-surface">
            <MuseumAvatar museum={museum} size={84} />
          </div>
          <div className="min-w-0 flex-1 pt-3">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-[26px] leading-tight font-semibold text-ink">{museum.title}</h1>
              <Tag color="var(--gold)"><Icon name="crown" className="h-3 w-3" /> Premium</Tag>
            </div>
            <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-muted">{museum.editorial}</p>
            <p className="mt-1.5 text-[12px] text-muted">
              {tr("Administré par", "Administre pa", "Led by", "Administrado por")} {owner?.name} · {museum.members} membres · {works.length} œuvres · créé le{" "}
              {new Date(museum.createdAt).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <div className="flex gap-2 pt-3">
            {isOwner ? (
              <>
                {/* MODULE CRUD inline — visible sur le bloc d'en-tête */}
                <Button
                  variant={editing ? "soft" : "outline"}
                  icon="edit"
                  aria-expanded={editing}
                  data-testid="edit-museum"
                  onClick={() => setEditing((v) => !v)}
                >
                  {tr("Modifier le musée", "Modifye mize a", "Edit museum", "Editar museo")}
                </Button>
                <Button icon="plus" onClick={() => {
                  const ownWork = db.works.find((w) => w.creatorId === user!.id && !w.deleted);
                  open(ownWork ? { type: "submit", workId: ownWork.id } : { type: "publish" });
                }}>
                  {tr("Ajouter une œuvre", "Ajoute yon zèv", "Add a work", "Añadir una obra")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  icon="upload"
                  onClick={() => {
                    const mine = db.works.find((w) => w.creatorId === user?.id && !w.deleted);
                    if (!user) return open({ type: "auth", mode: "login" });
                    if (!mine) return notify({ title: "Aucune œuvre à proposer", body: "Publiez d'abord une création.", tone: "warn" });
                    open({ type: "submit", workId: mine.id });
                  }}
                >
                  {tr("Proposer une œuvre", "Pwopoze yon zèv", "Suggest a work", "Sugerir una obra")}
                </Button>
                <Button
                  variant={isMember ? "soft" : "accent"}
                  icon={isMember ? "check" : "plus"}
                  onClick={() => {
                    if (!user) return open({ type: "auth", mode: "login", reason: tr("Créez un compte Basique pour rejoindre ce musée.", "Kreye yon kont Bazik pou antre nan mize sa a.", "Create a Basic account to join this museum.", "Crea una cuenta Básica para unirte a este museo.") });
                    if (isMember) {
                      leaveMuseum(museum.id);
                      notify({ title: tr("Vous avez quitté ce musée", "Ou kite mize sa a", "You left this museum", "Has salido de este museo"), tone: "info" });
                    } else {
                      joinMuseum(museum.id);
                      notify({ title: tr(`Vous êtes membre de ${museum.title}`, `Ou manm ${museum.title}`, `You are a member of ${museum.title}`, `Eres miembro de ${museum.title}`), tone: "success" });
                    }
                  }}
                >
                  {isMember ? tr("Quitter", "Kite", "Leave", "Salir") : tr("Rejoindre", "Antre", "Join", "Unirse")}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Les champs se déploient dans le bloc supérieur ; Enregistrer / Annuler
            restent au bas de ce bloc, au-dessus de la grille des œuvres exposées. */}
        {isOwner && (
          <Reveal open={editing}>
            <MuseumEditor museum={museum} onClose={() => setEditing(false)} />
          </Reveal>
        )}
      </div>

      {isOwner && pending.length > 0 && (
        <section className="mt-6">
          <SectionTitle kicker="Validation manuelle" title={`${pending.length} proposition${pending.length > 1 ? "s" : ""} en attente`} />
          <div className="card divide-y divide-line overflow-hidden">
            {pending.map((r) => {
              const w = workById(r.workId);
              const from = userById(r.fromId);
              if (!w) return null;
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                  <Cover work={w} creatorName={from?.name ?? ""} className="h-14 w-14 rounded-xl" watermarkSize={13} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[16px] font-semibold text-ink">{w.title}</p>
                    <p className="truncate text-[12.5px] text-muted">
                      {from?.name} · proposé le {new Date(r.date).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { resolveRequest(museum.id, r.id, false); notify({ title: "Proposition refusée", body: w.title, tone: "warn" }); }}>
                    {tr("Refuser", "Refize", "Refuse", "Rechazar")}
                  </Button>
                  <Button size="sm" icon="check" onClick={() => { resolveRequest(museum.id, r.id, true); notify({ title: "Œuvre acceptée", body: `${w.title} rejoint ${museum.title}`, tone: "success" }); }}>
                    {tr("Accepter", "Aksepte", "Accept", "Aceptar")}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-8">
        <SectionTitle kicker={tr("Collection", "Koleksyon", "Collection", "Colección")} title={tr("Œuvres exposées", "Zèv ekspoze", "Exhibited works", "Obras expuestas")} />
        {works.length === 0 ? (
          <EmptyState icon="image" title="Aucune œuvre trouvée dans cette catégorie" hint="Le conservateur n'a pas encore publié de pièce dans ce musée." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {works.map((w, i) => (
              <WorkCard
                key={w!.id}
                work={w!}
                index={i}
                creatorName={userById(w!.creatorId)?.name ?? ""}
                onOpen={() => open({ type: "work", id: w!.id, museumId: museum.id })}
                onFav={() => (user ? toggleFavorite(w!.id) : open({ type: "auth", mode: "login" }))}
                isFav={favs.includes(w!.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------------- Concours ---------------- */
function RankRow({ r, scope, index }: { r: Ranked; scope: "mois" | "annee"; index: number }) {
  const { userById, t } = useStore();
  const { navigate } = useUI();
  const u = userById(r.creatorId);
  if (!u) return null;
  const premium = isPremium(u);
  const prize = r.tier !== null ? (scope === "mois" ? IMPACT_PRIZES[r.tier] : GRAND_PRIZES[r.tier]) : null;
  return (
    <button
      onClick={() => navigate(`/profil/${u.id}`)}
      className="focus-ring rise flex w-full flex-wrap items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface2"
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-[15px] font-semibold"
        style={{
          background: r.tier !== null ? `color-mix(in srgb, ${TIER_COLORS[r.tier as Tier]} 22%, transparent)` : "var(--surface-2)",
          color: r.tier !== null ? TIER_COLORS[r.tier as Tier] : "var(--muted)",
        }}
      >
        {r.rank}
      </span>
      <Avatar name={u.name} hue={u.hue} size={40} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[14.5px] font-semibold text-ink">{u.name}</span>
          {premium && <Icon name="crown" className="h-3.5 w-3.5 shrink-0 text-gold" />}
        </span>
        <span className="block truncate text-[12px] text-muted">{u.city} · {u.trades.slice(0, 2).join(" · ") || "Membre"}</span>
      </span>
      {prize && (
        <span
          className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-bold", !premium && "opacity-55")}
          style={{
            background: `color-mix(in srgb, ${IMPACT_TIER_COLORS[r.tier as Tier]} 16%, transparent)`,
            color: IMPACT_TIER_COLORS[r.tier as Tier],
            border: `1px solid color-mix(in srgb, ${IMPACT_TIER_COLORS[r.tier as Tier]} 38%, transparent)`,
          }}
        >
          {premium ? (
            <PrizeIcon iconKey={iconForLabel(prize)} color={IMPACT_TIER_COLORS[r.tier as Tier]} className="h-4 w-4" />
          ) : (
            <Icon name="lock" className="h-3.5 w-3.5" />
          )}
          {prize}
        </span>
      )}
      {/* ANONYMAT FINANCIER : plus aucun montant, seulement des Points */}
      <span className="w-28 text-right font-display text-[16px] font-semibold text-ink">
        {toPoints(r.total)} {t("points.word")}
      </span>
    </button>
  );
}

export function Leaderboard() {
  const { db, userById, booting, t, lang } = useStore();
  const tr = makeTr(lang);
  const { open, routeLoading } = useUI();
  const [tab, setTab] = useState<"mois" | "annee" | "productivite">("mois");
  const loading = booting || routeLoading;
  const month = useMemo(() => impactRanking(db, "mois"), [db]);
  const year = useMemo(() => impactRanking(db, "annee"), [db]);
  const rows = tab === "annee" ? year : month;
  const monthLabel = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const ties = rows.filter((r, i) => rows.some((o, j) => j !== i && o.total === r.total)).length > 0;

  return (
    <div>
      <div className="mb-6">
        <p className="mb-1.5 text-[11px] font-bold tracking-[0.18em] text-accent uppercase">{tr("Double moteur", "Doub motè", "Dual engine", "Doble motor")} · {monthLabel}</p>
        <h1 className="font-display text-[30px] leading-tight font-semibold tracking-tight text-ink sm:text-[38px]">{tr("Concours SOLDE gallery", "Konkou SOLDE gallery", "SOLDE gallery Contests", "Concursos SOLDE gallery")}</h1>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-muted">
          Le Prix d'impact mesure le volume cumulé des ventes et dons simulés ; le Prix de productivité compte les œuvres
          uniques admissibles du mois. Classement ouvert à tous — l'affichage des badges brillants reste un privilège
          Premium, à titre honorifique, sans récompense matérielle.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {([
          { k: "mois", l: tr("Impact mensuel", "Enpak mansyèl", "Monthly impact", "Impacto mensual") },
          { k: "annee", l: `${tr("Grand Awards", "Grand Awards", "Grand Awards", "Grand Awards")} ${new Date().getFullYear()}` },
          { k: "productivite", l: tr("Productivité mensuelle", "Pwodiktivite mansyèl", "Monthly productivity", "Productividad mensual") },
        ] as const).map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={cn(
              "focus-ring rounded-full border px-4 py-2 text-[13px] font-semibold transition",
              tab === t.k ? "border-transparent bg-accent text-accentink shadow-[var(--shadow-sm)]" : "border-line bg-surface text-inksoft hover:border-linestrong",
            )}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-line bg-surface2 p-4">
        <Icon name="info" className="mt-0.5 h-4.5 w-4.5 shrink-0 text-accent" />
        <p className="text-[12.5px] leading-relaxed text-muted">
          <strong className="text-ink">Règle des égalités au mérite :</strong> en cas d'égalité parfaite, les ex-æquo
          reçoivent le même prix (par exemple deux Gold Sack Award). Le créateur immédiatement suivant reçoit le prix
          directement inférieur — Silver Sack — sans saut de rang pénalisant.
          {ties && tab !== "productivite" && <span className="ml-1 font-semibold text-accent">Une égalité est active ce mois-ci.</span>}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : tab === "productivite" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(Object.keys(PRODUCTIVITY_PRIZES) as CategoryId[]).map((cat) => {
            const rank = productivityRanking(db, cat);
            const meta = CATEGORIES.find((c) => c.id === cat)!;
            return (
              <div key={cat} className="card overflow-hidden">
                <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${meta.color} 14%, transparent)`, color: meta.color }}>
                    <Icon name={cat === "musique" ? "music" : cat === "photo" ? "image" : cat === "art" ? "brush" : cat === "architecture" ? "building" : "book"} className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="font-display text-[16px] font-semibold text-ink">{catLabel(cat, lang)}</p>
                    <p className="text-[11px] text-muted">{PRODUCTIVITY_PRIZES[cat].join(" · ")}</p>
                  </div>
                </div>
                {rank.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[12.5px] text-muted">Aucune œuvre admissible ce mois-ci.</p>
                ) : (
                  <div className="divide-y divide-line">
                    {rank.slice(0, 4).map((r) => {
                      const u = userById(r.creatorId);
                      const premium = isPremium(u);
                      return (
                        <div key={r.creatorId} className="flex items-center gap-3 px-4 py-3">
                          <span className="w-5 font-display text-[14px] font-semibold text-muted">{r.rank}</span>
                          <Avatar name={u?.name ?? "?"} hue={u?.hue ?? 20} size={32} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-ink">{u?.name}</p>
                            <p className="flex items-center gap-1 truncate text-[11px]" style={{ color: r.tier !== null ? PROD_TIER_COLORS[r.tier] : "var(--muted)" }}>
                              {r.tier !== null && <PrizeIcon iconKey={iconForCategory(cat)} color={PROD_TIER_COLORS[r.tier]} className="h-3.5 w-3.5 shrink-0" />}
                              <span className="truncate">
                                {r.tier !== null ? PRODUCTIVITY_PRIZES[cat][r.tier] : "Participant"}
                                {!premium && r.tier !== null ? " · badge non affiché" : ""}
                              </span>
                            </p>
                          </div>
                          <span className="text-[12.5px] font-semibold text-ink">{r.total}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <div className="card p-5 md:col-span-2 xl:col-span-3">
            <p className="flex items-center gap-2 font-display text-[16px] font-semibold text-ink">
              <Icon name="shield" className="h-4.5 w-4.5 text-accent" /> Critères d'admissibilité anti-spam
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                { t: "Pièce jointe valide", d: "Un fichier .mp3, .pdf, .zip, .jpg, .png ou .dwg réellement déclaré." },
                { t: "Description > 150 caractères", d: "Un texte descriptif substantiel, vérifié à la publication." },
                { t: "Œuvre approuvée", d: "Validation de curation acquise, et œuvre non supprimée." },
              ].map((c) => (
                <div key={c.t} className="rounded-xl border border-line bg-surface2 p-3.5">
                  <p className="text-[13px] font-semibold text-ink">{c.t}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted">{c.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon="trophy" title="Aucun volume enregistré sur la période" hint="Les ventes et dons simulés alimenteront ce classement." />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
            <span>{tab === "annee" ? `Cumul du 1er janvier au 31 décembre ${new Date().getFullYear()}` : `Volume du mois · ${monthLabel}`}</span>
            <span>{t("points.word")} · 1 000 HTG = 1 pt</span>
          </div>
          {rows.map((r, i) => <RankRow key={r.creatorId} r={r} scope={tab === "annee" ? "annee" : "mois"} index={i} />)}
        </div>
      )}

      <div className="card mt-6 flex flex-wrap items-center gap-4 p-5">
        <Icon name="crown" className="h-6 w-6 text-gold" />
        <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-muted">
          Les badges brillants apparaissent sur le profil des membres Premium uniquement. Les titres sont honorifiques :
          aucune récompense physique ou matérielle n'est engagée.
        </p>
        <Button onClick={() => open({ type: "premium" })}>Passer à Premium</Button>
      </div>
    </div>
  );
}

/* ---------------- Pour les créateurs ---------------- */
export function Creators() {
  const { user, lang } = useStore();
  const tr = makeTr(lang);
  const { open, navigate } = useUI();
  return (
    <div>
      <section className="relative overflow-hidden rounded-[26px] border border-line p-7 sm:p-10" style={{ background: "linear-gradient(140deg, color-mix(in srgb, var(--accent-color) 20%, var(--surface)), var(--surface) 60%)" }}>
        <div className="grain absolute inset-0" />
        <div className="relative max-w-2xl">
          <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-accent uppercase">{tr("Espace créateur", "Espas kreyatè", "Creator space", "Espacio de creador")}</p>
          <h1 className="font-display text-[32px] leading-[1.08] font-semibold tracking-tight text-ink sm:text-[44px]">
            {tr("Vendre sa création en gourdes, sans intermédiaire opaque.", "Vann kreyasyon ou an goud, san entèmedyè opak.", "Sell your work in gourdes, with no opaque middleman.", "Vende tu creación en gourdes, sin intermediarios opacos.")}
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-inksoft">
            Six univers, un seul wallet. Vous fixez vos prix en HTG, vous gardez la main sur vos fichiers, et la
            plateforme affiche chaque commission avant la moindre validation.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" icon="plus" onClick={() => (user?.isCreator ? open({ type: "publish" }) : open({ type: "auth", mode: "signup" }))}>
              Ouvrir mon studio
            </Button>
            <Button size="lg" variant="outline" icon="crown" onClick={() => open({ type: "premium" })}>
             Comparer avec Premium
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {[
          { title: tr("Compte Basique", "Kont Bazik", "Basic Account", "Cuenta Básica"), price: "3,75 %", note: tr("de commission sur chaque vente et don", "komisyon sou chak vant ak don", "commission on every sale and donation", "de comisión por cada venta y donación"), items: ["Publication illimitée", "Wallet et retrait dès 1 000 HTG", "Participation à tous les concours", "Favoris, bibliothèque, historique"], tone: "var(--muted)" },
          { title: tr("Premium", "Premium", "Premium", "Premium"), price: "0 %", note: `${htg(PREMIUM_MONTH)}/mois · ${htg(PREMIUM_YEAR)}/an`, items: ["100 % de vos gains directs", "Posséder et administrer votre Musée Virtuel", "Affichage des badges brillants", "Curation des œuvres de tiers"], tone: "var(--gold)" },
        ].map((p) => (
          <div key={p.title} className="card p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-[22px] font-semibold text-ink">{p.title}</h2>
              <span className="font-display text-[30px] font-semibold" style={{ color: p.tone }}>{p.price}</span>
            </div>
            <p className="mt-1 text-[12.5px] text-muted">{p.note}</p>
            <ul className="mt-4 space-y-2">
              {p.items.map((i) => (
                <li key={i} className="flex items-start gap-2 text-[13.5px] text-inksoft">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {i}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mt-9">
        <SectionTitle kicker="Mode opératoire" title="Publier en quatre gestes" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { n: "01", t: "Joindre le fichier", d: ".mp3, .pdf, .zip, .jpg, .png, .dwg — le fichier reste sur votre machine dans cette V1." },
            { n: "02", t: "Décrire longuement", d: "Plus de 150 caractères pour la validation ; plus de 100 caractères et un livrable adapté à la catégorie pour les concours." },
            { n: "03", t: "Fixer le prix HTG", d: "0 pour offrir, ou le montant de votre choix. La seule devise est la gourde." },
            { n: "04", t: "Encaisser", d: "Wallet crédité dès la validation du code 0000, retrait possible dès 1 000 HTG." },
          ].map((s) => (
            <div key={s.n} className="card p-5">
              <span className="font-display text-[28px] font-semibold text-accent opacity-45">{s.n}</span>
              <p className="mt-2 font-display text-[17px] font-semibold text-ink">{s.t}</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-9 grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <Icon name="lock" className="h-5 w-5 text-accent" />
          <p className="mt-3 font-display text-[17px] font-semibold text-ink">Livres et projets confidentiels</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
            Vos documents stratégiques ne montrent que la couverture et la description. Le contenu profond reste masqué
            jusqu'à l'achat, et le téléchargement porte une licence nominative.
          </p>
        </div>
        <div className="card p-5">
          <Icon name="shield" className="h-5 w-5 text-accent" />
          <p className="mt-3 font-display text-[17px] font-semibold text-ink">Signature d'authenticité</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
            Votre nom est apposé en cursive au bas droit de chaque couverture, en mode de fusion « difference » pour
            rester lisible sur toutes les teintes.
          </p>
        </div>
        <div className="card p-5">
          <Icon name="wallet" className="h-5 w-5 text-accent" />
          <p className="mt-3 font-display text-[17px] font-semibold text-ink">Retrait encadré</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
            Seuil minimum de {htg(MIN_WITHDRAWAL)}, frais opérateur simulés à 0 HTG, historique conservé dans le
            navigateur.
          </p>
        </div>
      </section>

      <div className="card mt-8 flex flex-wrap items-center gap-4 p-6">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[20px] font-semibold text-ink">Prêt à mettre votre première œuvre en ligne ?</p>
          <p className="mt-1 text-[13px] text-muted">Un compte lecteur suffit pour acheter ; le studio est optionnel.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/concours")}>Voir les concours</Button>
        <Button icon="plus" onClick={() => (user?.isCreator ? open({ type: "publish" }) : open({ type: "auth", mode: "signup" }))}>
          Mettre en ligne
        </Button>
      </div>
    </div>
  );
}

/* ---------------- À propos / notes techniques ---------------- */
export function About() {
  const { db } = useStore();
  const { setChatOpen } = useUI();
  return (
    <div className="max-w-3xl">
      <p className="mb-1.5 text-[11px] font-bold tracking-[0.18em] text-accent uppercase">V1 · prototype local</p>
      <h1 className="font-display text-[30px] leading-tight font-semibold tracking-tight text-ink sm:text-[38px]">
        À propos de SOLDE gallery
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-inksoft">
        SOLDE gallery est une plateforme multidisciplinaire pensée pour Haïti : musique, photographie et vidéo, art et
        tableaux, architecture, livres et projets. Cette V1 est une maquette fonctionnelle : toutes les données vivent
        dans le localStorage de votre navigateur.
      </p>

      <div className="mt-8 space-y-4">
        {[
          { icon: "shield", t: "Simulation locale, aucun serveur", d: `Comptes, paniers, wallets, favoris, musées et classements sont persistés localement (${db.works.length} œuvres, ${db.ledger.length} transactions de démonstration). Effacer les données du navigateur réinitialise la plateforme.` },
          { icon: "info", t: "Devise et langues", d: "Seule la gourde haïtienne (HTG) est affichée. L'interface bascule entre français et créole haïtien depuis la palette, en haut à droite." },
          { icon: "music", t: "Lecteur persistant", d: "La lecture se poursuit pendant la navigation interne et s'arrête au rechargement manuel ou à la fermeture de la page. La lecture écran verrouillé (panneau média de l'OS) est documentée pour une future PWA ou application native." },
          { icon: "image", t: "Formats acceptés", d: ".mp3, .pdf, .zip, .jpg, .png, .dwg et .mp4. Les vidéos n'exposent qu'une vignette statique ; le module d'extrait de 10 secondes est en attente de transcodage serveur." },
          { icon: "lock", t: "Licence nominative", d: "Chaque téléchargement simulé produit un fichier de licence au nom de l'acquéreur, personnel et non transférable. Une œuvre supprimée reste accessible à ses acquéreurs." },
          { icon: "grid", t: "Intégration WordPress / LocalWP", d: "Le build produit un fichier HTML autonome (JS et CSS inclus). Il s'intègre comme modèle de page personnalisé ou via une extension qui charge le bundle et son conteneur #root." },
        ].map((b) => (
          <div key={b.t} className="card flex gap-4 p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accentsoft text-accent">
              <Icon name={b.icon} className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-[17px] font-semibold text-ink">{b.t}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{b.d}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-8 flex flex-wrap items-center gap-4 p-5">
        <Icon name="sparkles" className="h-6 w-6 text-accent" />
        <p className="min-w-0 flex-1 text-[13px] text-muted">
          Une question sur le fonctionnement, un souci de paiement simulé ? L'agent de support vous guide et escalade
          les anomalies à l'administrateur.
        </p>
        <Button onClick={() => setChatOpen(true)}>Ouvrir l'assistant</Button>
      </div>

      <p className="mt-8 text-[12px] text-muted">
        Conditions d'utilisation de la démonstration — aucun paiement réel, aucune distribution de média, aucune
        récompense matérielle associée aux titres honorifiques.
      </p>
    </div>
  );
}

export { CardSkeleton };
