import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui-context";
import { CATEGORIES, MIN_WITHDRAWAL, PREMIUM_MONTH, PREMIUM_YEAR, htg, isPremium } from "../lib/types";
import { makeTr, tradeLabel, catLabel } from "../lib/l10n";
import type { CategoryId } from "../lib/types";
import { badgesOf, canDisplayBadges, impactRanking, isProductivityEligible, productivityRanking, TIER_COLORS, PRODUCTIVITY_PRIZES, IMPACT_PRIZES, toPoints } from "../lib/awards";
import { Avatar, Button, CardSkeleton, Chip, EmptyState, Icon, SectionTitle, Skeleton, Tag } from "../components/ui";
import { Cover, WorkCard } from "../components/Cover";
import { AccountTabs } from "../components/AccountTabs";
import { Reveal } from "../components/Reveal";
import { ProfileEditor, socialEntries, socialHref, socialLabel } from "../components/ProfileEditor";
import { PrizeIcon, iconForLabel, IMPACT_TIER_COLORS, PROD_TIER_COLORS } from "../components/PrizeIcons";
/* MODULES ISOLÉS V1.4 : analytique de provenance + preuve de mérite */
import { useClickStats } from "../lib/click-analytics";
import { CreatorClickStats, WorkClickLine } from "../components/CreatorClicks";
import { AwardProofModal } from "../components/AwardProofModal";
import { CreatorTransactionHistory } from "../components/CreatorTransactionHistory";
import type { EarnedBadge } from "../lib/awards";


const CHART_COLORS = ["#c08a2e", "#0e6f8a", "#b5296b", "#1f8a5b", "#c2542c", "#1d4ed8"];

function RevenueChart({ creatorId }: { creatorId: string }) {
  const { db } = useStore();
  const data = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const total = db.ledger
        .filter((e) => {
          const ed = new Date(e.date);
          return e.creatorId === creatorId && ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth();
        })
        .reduce((s, e) => s + e.amount - e.commission, 0);
      return { label: d.toLocaleDateString("fr-FR", { month: "short" }), total: Math.round(total) };
    });
  }, [db.ledger, creatorId]);
  const max = Math.max(1, ...data.map((d) => d.total));

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-display text-[17px] font-semibold text-ink">Revenus nets · 6 mois</h3>
        <span className="text-[11.5px] text-muted">HTG, commissions déduites</span>
      </div>
      <div className="flex h-40 items-end gap-3">
        {data.map((d, i) => (
          <div key={i} className="group flex flex-1 flex-col items-center gap-2">
            <span className="text-[10.5px] font-semibold tabular-nums text-muted opacity-0 transition group-hover:opacity-100">
              {d.total >= 1000 ? `${(d.total / 1000).toFixed(1)}k` : d.total}
            </span>
            <div
              className="w-full rounded-t-lg transition-all duration-500 hover:brightness-110"
              style={{
                height: `${Math.max(4, (d.total / max) * 100)}%`,
                background: `linear-gradient(180deg, ${CHART_COLORS[i]}, color-mix(in srgb, ${CHART_COLORS[i]} 55%, transparent))`,
              }}
              title={`${d.label} : ${htg(d.total)}`}
            />
            <span className="text-[11px] text-muted">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MuseumAdmin() {
  const { db, user, resolveRequest, workById, userById, notify, lang } = useStore();
  const tr = makeTr(lang);
  const { navigate } = useUI();
  const mine = db.museums.filter((m) => m.ownerId === user?.id);
  if (!mine.length) return null;
  return (
    <section className="mt-9">
      <SectionTitle kicker={tr("Curation", "Kire", "Curation", "Curación")} title={tr("Mes musées virtuels", "Mize vityèl mwen", "My virtual museums", "Mis museos virtuales")} />
      <div className="space-y-4">
        {mine.map((m) => {
          const pending = m.requests.filter((r) => r.status === "en attente");
          return (
            <div key={m.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
                <Avatar name={m.title} hue={m.hue} size={46} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[17px] font-semibold text-ink">{m.title}</p>
                  <p className="truncate text-[12.5px] text-muted">{m.editorial}</p>
                </div>
                <Tag color="var(--info)">{m.workIds.length} œuvres</Tag>
                <Button size="sm" variant="outline" onClick={() => navigate(`/musees/${m.id}`)}>
                  Ouvrir
                </Button>
              </div>
              {pending.length === 0 ? (
                <p className="px-4 py-3.5 text-[12.5px] text-muted">Aucune proposition en attente de validation.</p>
              ) : (
                <div className="divide-y divide-line">
                  {pending.map((r) => {
                    const w = workById(r.workId);
                    const from = userById(r.fromId);
                    if (!w) return null;
                    return (
                      <div key={r.id} className="flex flex-wrap items-center gap-3 p-3.5">
                        <Cover work={w} creatorName={from?.name ?? ""} className="h-12 w-12 rounded-lg" watermarkSize={12} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-semibold text-ink">{w.title}</p>
                          <p className="truncate text-[12px] text-muted">Proposé par {from?.name}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              resolveRequest(m.id, r.id, false);
                              notify({ title: "Proposition refusée", body: w.title, tone: "warn" });
                            }}
                          >
                            {tr("Refuser", "Refize", "Refuse", "Rechazar")}
                          </Button>
                          <Button
                            size="sm"
                            icon="check"
                            onClick={() => {
                              resolveRequest(m.id, r.id, true);
                              notify({ title: "Œuvre intégrée au musée", body: `${w.title} → ${m.title}`, tone: "success" });
                            }}
                          >
                            {tr("Accepter", "Aksepte", "Accept", "Aceptar")}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Studio() {
  const { db, user, booting, updateProfile, notify, deleteWork, approveWork, t, lang } = useStore();
  const { open, navigate, routeLoading } = useUI();
  const loading = booting || routeLoading;
  const tr = makeTr(lang);
  /* Statistiques privées de provenance des clics (module isolé) */
  const clickStats = useClickStats();
  const works = db.works.filter((w) => w.creatorId === user?.id && !w.deleted);
  const sales = db.ledger.filter((e) => e.creatorId === user?.id);
  const monthTotal = sales
    .filter((e) => new Date(e.date).getMonth() === new Date().getMonth() && new Date(e.date).getFullYear() === new Date().getFullYear())
    .reduce((s, e) => s + e.amount - e.commission, 0);
  const withdrawals = db.withdrawals.filter((w) => w.userId === user?.id);

  if (!user)
    return (
      <EmptyState
        icon="user"
        title="Ouvrez une session pour accéder au studio"
        hint="Choisissez un profil de test : créateur Basique ou créatrice Premium."
        action={<Button className="mt-2" onClick={() => open({ type: "auth", mode: "login" })}>Choisir un profil</Button>}
      />
    );

  if (!user.isCreator)
    return (
      <div>
        <SectionTitle kicker="Votre espace" title="Mon studio" />
        <EmptyState
          icon="grid"
          title="Votre compte est un compte lecteur"
          hint="Vous pouvez acheter, soutenir et collectionner sans être créateur. Activez un studio uniquement si vous souhaitez publier."
          action={
            <Button
              className="mt-2"
              icon="plus"
              onClick={() => {
                updateProfile({ isCreator: true, trades: user.trades.length ? user.trades : ["Entrepreneur"] });
                notify({ title: "Studio activé", body: "Choisissez jusqu'à 5 badges de métier dans votre profil.", tone: "success" });
              }}
            >
              Activer mon studio
            </Button>
          }
        />
      </div>
    );

  const rate = isPremium(user) ? "0 %" : "3,75 %";

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-bold tracking-[0.18em] text-accent uppercase">{tr("Tableau de bord", "Tablodbò", "Dashboard", "Panel")}</p>
          {/* Salutation strictement alignée sur la langue active */}
          <h1 className="font-display text-[30px] leading-tight font-semibold tracking-tight text-ink sm:text-[38px]">
            {t("hello")}, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-2 text-[14.5px] text-muted">
            {works.length} œuvre{works.length > 1 ? "s" : ""} en ligne · commission plateforme {rate}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon="user" onClick={() => navigate(`/profil/${user.id}`)}>
            Voir mon profil
          </Button>
          <Button icon="plus" onClick={() => open({ type: "publish" })}>
            Mettre en ligne
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-[20px]" />)}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div
            className="card relative overflow-hidden p-5 lg:col-span-1"
            style={{ background: "linear-gradient(150deg, color-mix(in srgb, var(--accent-color) 18%, var(--surface)), var(--surface))" }}
          >
            <div className="grain absolute inset-0" />
            <div className="relative">
              <p className="flex items-center gap-2 text-[11.5px] font-bold tracking-[0.16em] text-muted uppercase">
                <Icon name="wallet" className="h-4 w-4 text-accent" /> SOLDE Wallet
              </p>
              <p className="mt-3 font-display text-[38px] leading-none font-semibold text-ink">{htg(user.wallet)}</p>
              <p className="mt-1.5 text-[12px] text-muted">{tr("Solde disponible", "Balans disponib", "Available balance", "Saldo disponible")} · {tr("retrait dès", "retrè depi", "withdrawal from", "retiro desde")} {htg(MIN_WITHDRAWAL)}</p>
              <Button
                className="mt-4 w-full"
                icon="walletArrow"
                disabled={user.wallet < MIN_WITHDRAWAL}
                onClick={() => open({ type: "withdraw" })}
              >
                {tr("Demander un retrait", "Mande yon retrè", "Request withdrawal", "Solicitar retiro")}
              </Button>
              {user.wallet < MIN_WITHDRAWAL && (
                <p className="mt-2 text-center text-[11.5px] text-muted">
                  Encore {htg(MIN_WITHDRAWAL - user.wallet)} pour débloquer le retrait.
                </p>
              )}
              {withdrawals.length > 0 && (
                <div className="mt-4 space-y-1.5 border-t border-line pt-3">
                  {withdrawals.slice(0, 2).map((w) => (
                    <p key={w.id} className="flex items-center justify-between text-[12px]">
                      <span className="text-muted">{new Date(w.date).toLocaleDateString("fr-FR")}</span>
                      <span className="font-semibold text-ink">{htg(w.amount)}</span>
                      <Tag color={w.status === "versé" ? "var(--success)" : "var(--warning)"}>{w.status}</Tag>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
            {[
              { label: tr("Revenus nets ce mois", "Revni nèt mwa sa a", "Net revenue this month", "Ingresos netos este mes"), value: htg(monthTotal), icon: "flame", tone: "var(--accent-color)" },
              { label: tr("Ventes simulées", "Vant simile", "Simulated sales", "Ventas simuladas"), value: String(sales.filter((s) => s.type === "vente").length), icon: "bag", tone: "var(--sea)" },
              { label: tr("Dons reçus", "Don resevwa", "Donations received", "Donaciones recibidas"), value: htg(sales.filter((s) => s.type === "don").reduce((s, e) => s + e.amount, 0)), icon: "heart", tone: "var(--hibiscus)" },
              { label: tr("Œuvres approuvées", "Zèv apwouve", "Approved works", "Obras aprobadas"), value: `${works.filter((w) => w.approved).length}/${works.length}`, icon: "shield", tone: "var(--emerald)" },
            ].map((s) => (
              <div key={s.label} className="card flex items-center gap-4 p-5">
                <span className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: `color-mix(in srgb, ${s.tone} 14%, transparent)`, color: s.tone }}>
                  <Icon name={s.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] text-muted">{s.label}</p>
                  <p className="truncate font-display text-[22px] font-semibold text-ink">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isPremium(user) && (
        <div className="card mt-4 flex flex-wrap items-center gap-4 p-5">
          <Icon name="crown" className="h-6 w-6 text-gold" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-[17px] font-semibold text-ink">Vous cédez 3,75 % sur chaque vente et don</p>
            <p className="text-[12.5px] text-muted">
              Premium conserve 100 % de vos gains, débloque les musées et l'affichage des badges — {htg(PREMIUM_MONTH)}/mois ou {htg(PREMIUM_YEAR)}/an.
            </p>
          </div>
          <Button icon="crown" onClick={() => open({ type: "premium" })}>
            Passer à Premium
          </Button>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RevenueChart creatorId={user.id} />
        <CreatorTransactionHistory user={user} />
      </div>

      {/* Dashboard privé : provenance des clics, invisible pour le public */}
      <div className="mt-6">
        <CreatorClickStats works={works} stats={clickStats} />
      </div>

      <section className="mt-9">
        <SectionTitle
          kicker={tr("Catalogue personnel", "Katalòg pèsonèl", "Personal catalog", "Catálogo personal")}
          title={tr("Mes œuvres", "Zèv mwen", "My works", "Mis obras")}
          action={
            <span className="text-[12px] text-muted">
              Anti-spam productivité : livrable adapté à la catégorie + description &gt; 100 caractères + approbation
            </span>
          }
        />
        {works.length === 0 ? (
          <EmptyState
            icon="grid"
            title={tr("Aucune œuvre publiée", "Poko gen zèv pibliye", "No work published", "Ninguna obra publicada")}
            hint="Mettez votre première création en ligne : fichier de démonstration, prix en HTG, description détaillée."
            action={<Button className="mt-2" icon="plus" onClick={() => open({ type: "publish" })}>{tr("Publier une œuvre", "Pibliye yon zèv", "Publish a work", "Publicar una obra")}</Button>}
          />
        ) : (
          <div className="card divide-y divide-line overflow-hidden">
            {works.map((w) => {
              const eligible = isProductivityEligible(w, w.category);
              return (
                <div key={w.id} className="flex flex-wrap items-center gap-3 p-3.5">
                  <Cover work={w} creatorName={user.name} className="h-14 w-14 shrink-0 rounded-xl" watermarkSize={13} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[16px] font-semibold text-ink">{w.title}</p>
                    <p className="truncate text-[12px] text-muted">
                      {CATEGORIES.find((c) => c.id === w.category)?.short} · {w.fileName} · {htg(w.price)}
                    </p>
                    <WorkClickLine stat={clickStats[w.id]} />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {w.approved ? <Tag color="var(--success)">Approuvée</Tag> : <Tag color="var(--warning)">En validation</Tag>}
                    <Tag color={eligible ? "var(--info)" : "var(--muted)"}>
                      {eligible ? "Concours ✓" : "Non admissible"}
                    </Tag>
                  </div>
                  <div className="flex gap-1.5">
                    {!w.approved && (
                      <Button size="sm" variant="soft" icon="check" onClick={() => {
                        if (isProductivityEligible({ ...w, approved: true }, w.category)) {
                          approveWork(w.id);
                          notify({ title: "Œuvre approuvée", body: w.title, tone: "success" });
                        } else {
                          notify({ title: "Critères non remplis", body: "Description de plus de 150 caractères et pièce jointe valides requis.", tone: "danger" });
                        }
                      }}>
                        {tr("Valider", "Valide", "Approve", "Validar")}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" icon="flame" onClick={() => open({ type: "promote", workId: w.id })}>
                      {t("action.promote")}
                    </Button>
                    <Button size="sm" variant="ghost" icon="edit" onClick={() => open({ type: "publish", workId: w.id })}>
                      {tr("Modifier", "Modifye", "Edit", "Editar")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="trash"
                      className="text-danger hover:bg-danger/10"
                      onClick={() =>
                        open({
                          type: "confirm",
                          title: "Supprimer cette œuvre ?",
                          body: "Êtes-vous sûr de vouloir supprimer cette œuvre définitivement ? Cette action est irréversible.",
                          confirmLabel: "Confirmer",
                          tone: "danger",
                          onConfirm: () => {
                            deleteWork(w.id);
                            notify({
                              title: "Œuvre supprimée du catalogue",
                              body: "Les clients l'ayant acquise conservent leur accès.",
                              tone: "warn",
                            });
                          },
                        })
                      }
                    >
                      {t("action.delete")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <MuseumAdmin />
    </div>
  );
}

export function Profile({ userId }: { userId?: string }) {
  const { db, user, userById, publicWorks, notify, booting, t, lang, isFollowing, toggleFollow } = useStore();
  const { open, navigate, setQuery, routeLoading } = useUI();
  const profile = userId ? userById(userId) : user;
  const isMe = !!user && profile?.id === user.id;
  const tr = makeTr(lang);
  /* MODULE Suivre : état lu dans le store et persisté dans localStorage.
     Aucun rechargement : le libellé et le fond changent à l'instant. */
  const following = profile ? isFollowing(profile.id) : false;
  const [editing, setEditing] = useState(false);
  /* MODULE Preuve de mérite : badge sélectionné sur le profil public */
  const [proof, setProof] = useState<EarnedBadge | null>(null);
  const loading = booting || routeLoading;

  if (!profile)
    return (
      <EmptyState
        icon="user"
        title="Aucun profil actif"
        hint="Connectez-vous avec un profil de test pour voir un profil complet."
        action={<Button className="mt-2" onClick={() => open({ type: "auth", mode: "login" })}>Choisir un profil</Button>}
      />
    );

  const works = publicWorks.filter((w) => w.creatorId === profile.id);
  const badges = badgesOf(db, profile.id);
  const monthRank = impactRanking(db, "mois").find((r) => r.creatorId === profile.id);
  const premium = isPremium(profile);
  const socials = socialEntries(profile.socials);

  return (
    <div>
      <div className="relative overflow-hidden rounded-[26px] border border-line">
        <div
          className="h-36 sm:h-44"
          style={{
            background: `linear-gradient(120deg, hsl(${profile.hue} 55% 42%), hsl(${(profile.hue + 48) % 360} 48% 28%), color-mix(in srgb, var(--accent-color) 60%, #2a1e0c))`,
          }}
        />
        <div className="grain absolute inset-0" />
        <div className="relative -mt-12 flex flex-wrap items-end gap-4 bg-surface px-5 pt-0 pb-5 sm:px-7">
          <div className="-mt-2 rounded-full border-4 border-surface">
            <Avatar name={profile.name} hue={profile.hue} size={92} />
          </div>
          <div className="min-w-0 flex-1 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[26px] leading-tight font-semibold tracking-tight text-ink sm:text-[32px]">
                {profile.name}
              </h1>
              {premium ? (
                <Tag color="var(--gold)"><Icon name="crown" className="h-3 w-3" /> Premium</Tag>
              ) : profile.isCreator ? (
                <Tag color="var(--muted)">{t("profile.basic")}</Tag>
              ) : (
                <Tag color="var(--info)">{t("profile.visitor")}</Tag>
              )}
            </div>
            <p className="mt-1 text-[13px] text-muted">
              @{profile.handle} · {profile.city} · {profile.followers.toLocaleString("fr-FR")} {tr("abonnés", "abòne", "followers", "seguidores")}
            </p>
            {/* Liens de réseaux sociaux (renseignés via l'édition inline) */}
            {socials.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5" data-testid="profile-socials">
                {socials.map((s) => (
                  <a
                    key={s.key}
                    href={socialHref(s.key, s.value)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-line bg-surface2 px-2.5 py-1 text-[11.5px] font-medium text-inksoft transition hover:border-accent hover:text-ink"
                  >
                    <Icon name={s.icon} className="h-3.5 w-3.5 text-accent" />
                    {socialLabel(s.key, s.value)}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pt-3">
            {isMe ? (
              <>
                <Button
                  variant={editing ? "soft" : "outline"}
                  icon="edit"
                  aria-expanded={editing}
                  onClick={() => setEditing((v) => !v)}
                >
                  {tr("Modifier le profil", "Modifye pwofil la", "Edit Profile", "Editar perfil")}
                </Button>
                {!premium && (
                  <Button icon="crown" onClick={() => open({ type: "premium" })}>
                    {t("action.premium")}
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button icon="heart" onClick={() => (user ? open({ type: "donate", creatorId: profile.id }) : open({ type: "auth", mode: "login" }))}>
                  {tr("Soutenir", "Sipòte", "Support", "Apoyar")}
                </Button>
                <Button
                  variant={following ? "soft" : "outline"}
                  icon={following ? "check" : "plus"}
                  aria-pressed={following}
                  data-testid="follow-button"
                  className={following ? "border-accent" : undefined}
                  onClick={() => {
                    if (!user) return open({ type: "auth", mode: "login" });
                    if (isMe) return notify({ title: t("follow.self"), tone: "info" });
                    const now = toggleFollow(profile.id);
                    notify({
                      title: now ? t("follow.now").replace("{name}", profile.name) : t("follow.stop").replace("{name}", profile.name),
                      body: now ? tr("Simulation locale — abonnement enregistré.", "Abònman anrejistre lokalman.", "Local simulation — subscription saved.", "Simulación local — suscripción guardada.") : undefined,
                      tone: now ? "success" : "info",
                    });
                  }}
                >
                  {following ? t("follow.unfollow") : t("follow.follow")}
                </Button>
                {/* Message direct : ouvre la fenêtre de chat privée (ou l'interposition si non connecté) */}
                <Button variant="outline" icon="chat" onClick={() => open({ type: "dm", userId: profile.id })}>
                  {t("msg.direct")}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* MODULE Édition inline : les champs se déroulent DANS la fiche
            d'identité ; Annuler / Enregistrer restent en bas de cette fiche,
            au-dessus de la grille des œuvres publiées. */}
        {isMe && (
          <Reveal open={editing}>
            <ProfileEditor profile={profile} onClose={() => setEditing(false)} />
          </Reveal>
        )}
      </div>

      {/* Le solde du portefeuille est désormais affiché en permanence dans
          l'en-tête global (module HeaderWallet) — il n'est plus dans ce corps. */}

      {/* MODULE Espace personnel : Bibliothèque (ouverte) / Messages (masqués par défaut) */}
      {isMe && <AccountTabs />}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <p className="text-[14.5px] leading-relaxed text-inksoft">{profile.bio}</p>

          {profile.trades.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[10.5px] font-bold tracking-[0.18em] text-muted uppercase">Badges de métier · {profile.trades.length}/5</p>
              <div className="flex flex-wrap gap-2">
                {profile.trades.map((trade) => (
                  <Chip
                    key={trade}
                    onClick={() => {
                      setQuery(trade);
                      navigate("/recherche");
                    }}
                  >
                    {tradeLabel(trade, lang)}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <section className="mt-8">
            <SectionTitle
              kicker={premium ? "Privilège Premium" : "Calcul public · affichage Premium"}
              title={tr("Distinctions", "Distenksyon", "Awards", "Distinciones")}
            />
            {canDisplayBadges(profile) ? (
              badges.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {badges.map((b, i) => (
                    <button
                      key={i}
                      onClick={() => setProof(b)}
                      data-testid="award-badge"
                      aria-label={`Preuve de mérite : ${b.label}`}
                      className="focus-ring group card relative flex items-center gap-3 overflow-hidden p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-[var(--shadow-md)]"
                      style={{ background: `linear-gradient(140deg, color-mix(in srgb, ${TIER_COLORS[b.tier]} 20%, var(--surface)), var(--surface))` }}
                    >
                      {/* Iconographie stricte : sac / plume / crayon / cerveau / toile / optique / disque */}
                      <span
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
                        style={{
                          background: `color-mix(in srgb, ${
                            b.kind === "impact" ? IMPACT_TIER_COLORS[b.tier] : PROD_TIER_COLORS[b.tier]
                          } 22%, transparent)`,
                        }}
                      >
                        <PrizeIcon iconKey={iconForLabel(b.label)} color={b.kind === "impact" ? IMPACT_TIER_COLORS[b.tier] : PROD_TIER_COLORS[b.tier]} className="h-6 w-6" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-[16px] font-semibold text-ink">{b.label}</p>
                        <p className="truncate text-[12px] text-muted capitalize">{b.scope}</p>
                        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-accent">
                          Preuve de mérite <Icon name="arrowRight" className="h-3 w-3 transition group-hover:translate-x-0.5" />
                        </p>
                      </div>
                      <Icon name="arrowUpRight" className="h-4 w-4 shrink-0 text-muted transition group-hover:text-accent" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="card p-5 text-[13px] text-muted">Aucune distinction ce mois-ci : les classements se recalculent à chaque vente, don et publication.</p>
              )
            ) : (
              <div className="card flex flex-wrap items-center gap-4 p-5">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-accentsoft text-accent">
                  <Icon name="lock" className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink">
                    {badges.length} distinction{badges.length > 1 ? "s" : ""} calculée{badges.length > 1 ? "s" : ""}, non affichée{badges.length > 1 ? "s" : ""}
                  </p>
                  <p className="text-[12.5px] text-muted">
                    Le concours est ouvert à tous ; les badges brillants sont un privilège d'affichage Premium (titres honorifiques).
                  </p>
                </div>
                {isMe && <Button onClick={() => open({ type: "premium" })}>Débloquer l'affichage</Button>}
              </div>
            )}
            {monthRank && (
              <p className="mt-3 text-[12.5px] text-muted">
                Classement d'impact du mois : <strong className="text-ink">rang {monthRank.rank}</strong> ·{" "}
                {toPoints(monthRank.total)} {t("points.word")} ·{" "}
                {monthRank.tier !== null ? IMPACT_PRIZES[monthRank.tier] : "hors podium"}
              </p>
            )}
          </section>

          <section className="mt-9">
            <SectionTitle
              kicker={`${works.length} ${tr("œuvre", "zèv", "work", "obra")}${works.length > 1 ? "s" : ""}`}
              title={tr("Créations publiques", "Kreyasyon piblik", "Public Creations", "Creaciones públicas")}
            />
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : works.length === 0 ? (
              <EmptyState icon="compass" title="Aucune œuvre trouvée dans cette catégorie" hint="Ce profil n'a pas encore publié d'œuvre approuvée." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {works.map((w, i) => (
                  <WorkCard key={w.id} work={w} index={i} creatorName={profile.name} onOpen={() => open({ type: "work", id: w.id })} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          {isMe && (
            <div className="card p-5">
              <p className="flex items-center gap-2 text-[11.5px] font-bold tracking-[0.16em] text-muted uppercase">
                <Icon name="crown" className="h-4 w-4 text-gold" /> {tr("Abonnement", "Abònman", "Subscription", "Suscripción")}
              </p>
              {premium ? (
                <>
                  <p className="mt-3 font-display text-[20px] font-semibold text-ink">Premium {profile.premium?.plan}</p>
                  <p className="mt-1 text-[12.5px] text-muted">
                    Commission 0 % · musées illimités · badges affichés
                    <br />
                    Renouvellement simulé le {new Date(profile.premium!.until).toLocaleDateString("fr-FR")}
                  </p>
                </>
              ) : (
                <>
                  <div className="mt-3 space-y-2">
                    {[
                      { p: PREMIUM_MONTH, l: "par mois" },
                      { p: PREMIUM_YEAR, l: "par an" },
                    ].map((x) => (
                      <div key={x.l} className="flex items-baseline justify-between rounded-xl border border-line px-3 py-2">
                        <span className="font-display text-[19px] font-semibold text-ink">{htg(x.p)}</span>
                        <span className="text-[12px] text-muted">{x.l}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="mt-3 w-full" icon="crown" onClick={() => open({ type: "premium" })}>
                    Passer à Premium
                  </Button>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted">
                    Activation immédiate via la modale OTP (code 0000). Aucun paiement réel.
                  </p>
                </>
              )}
            </div>
          )}

          <div className="card p-5">
            <p className="text-[11.5px] font-bold tracking-[0.16em] text-muted uppercase">{tr("Centres d'intérêt", "Sant enterè", "Interests", "Intereses")}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.interests.length ? (
                profile.interests.map((i) => <Tag key={i} color="var(--sea)">{catLabel(i, lang, true)}</Tag>)
              ) : (
                <span className="text-[12.5px] text-muted">Aucun centre d'intérêt sélectionné.</span>
              )}
            </div>
          </div>

          <div className="card p-5">
            <p className="text-[11.5px] font-bold tracking-[0.16em] text-muted uppercase">{tr("Productivité du mois", "Pwodiktivite mwa a", "Monthly productivity", "Productividad del mes")}</p>
            <div className="mt-3 space-y-2">
              {(Object.keys(PRODUCTIVITY_PRIZES) as CategoryId[])
                .map((c) => ({ c, r: productivityRanking(db, c).find((x) => x.creatorId === profile.id) }))
                .filter((x) => x.r)
                .map(({ c, r }) => (
                  <p key={c} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-muted">{CATEGORIES.find((x) => x.id === c)?.short}</span>
                    <span className="font-semibold text-ink">
                      {r!.total} œuvre{r!.total > 1 ? "s" : ""} · {r!.tier !== null ? PRODUCTIVITY_PRIZES[c][r!.tier] : `rang ${r!.rank}`}
                    </span>
                  </p>
                ))}
              {!(Object.keys(PRODUCTIVITY_PRIZES) as CategoryId[]).some((c) => productivityRanking(db, c).find((x) => x.creatorId === profile.id)) && (
                <span className="text-[12.5px] text-muted">Aucune œuvre admissible publiée ce mois-ci.</span>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* MODULE « Proof of Merit » : tous les badges Premium sont cliquables */}
      {proof && (
        <AwardProofModal
          badge={proof}
          profile={profile}
          onClose={() => setProof(null)}
          onOpenWork={(id) => {
            setProof(null);
            /* Ouverture interne : provenance « none » pour ne pas fausser
               le compteur analytique du créateur. */
            window.setTimeout(() => open({ type: "work", id, source: "none" }), 40);
          }}
        />
      )}
    </div>
  );
}
