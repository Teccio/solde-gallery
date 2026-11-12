/* ============================================================
   MODULE ISOLÉ — « Proof of Merit » / Preuve de mérite
   ------------------------------------------------------------
   Chaque badge d'Award affiché sur le profil public d'un créateur
   Premium devient cliquable et ouvre cette fenêtre :
   · Prix de productivité (Pen / Brain / Pencil / Canvas / Capture /
     Disc) → liste interactive des fichiers admissibles du mois
     (livres PDF, morceaux ZIP, plans…) ayant décroché le prix.
   · Prix d'impact (Gold / Silver / Bronze Sack) → mention
     honorifique avec le rang et la performance en Points.
   ============================================================ */
import { useMemo } from "react";
import { useStore } from "../lib/store";
import { CATEGORIES, htg } from "../lib/types";
import type { User } from "../lib/types";
import { eligibleWorksForPrize, toPoints } from "../lib/awards";
import type { EarnedBadge } from "../lib/awards";
import { EmptyState, Icon, Modal, Tag } from "./ui";
import { Cover, KindBadge } from "./Cover";
import { PrizeIcon, iconForCategory, iconForLabel, IMPACT_TIER_COLORS, PROD_TIER_COLORS } from "./PrizeIcons";

export function AwardProofModal({
  badge,
  profile,
  onClose,
  onOpenWork,
}: {
  badge: EarnedBadge;
  profile: User;
  onClose: () => void;
  onOpenWork: (workId: string) => void;
}) {
  const { db, t } = useStore();
  const color = badge.kind === "impact" ? IMPACT_TIER_COLORS[badge.tier] : PROD_TIER_COLORS[badge.tier];
  const catMeta = badge.category ? CATEGORIES.find((c) => c.id === badge.category) : undefined;

  /* Sources exactes du prix : mêmes critères anti-spam que le moteur de
     productivité, pour le créateur et la catégorie de ce badge. */
  const files = useMemo(
    () => (badge.kind === "productivite" && badge.category ? eligibleWorksForPrize(db, profile.id, badge.category) : []),
    [db, profile.id, badge.kind, badge.category],
  );

  const periodLabel =
    badge.period === "annee"
      ? `Exercice annuel ${badge.scope} · 1er janvier au 31 décembre`
      : badge.kind === "impact"
        ? `Période mensuelle · ${badge.scope}`
        : `Mois de ${badge.scope.split("·").pop()?.trim() || badge.scope}`;

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-2xl"
      title={badge.label}
      subtitle={`Preuve de mérite · ${profile.name} · ${periodLabel}`}
    >
      <div data-testid="award-proof-modal">
        {/* En-tête du prix */}
        <div
          className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-line p-4"
          style={{ background: `linear-gradient(140deg, color-mix(in srgb, ${color} 22%, var(--surface)), var(--surface))` }}
        >
          <div className="grain absolute inset-0" />
          <span
            className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full"
            style={{ background: `color-mix(in srgb, ${color} 26%, transparent)` }}
          >
            <PrizeIcon
              iconKey={badge.category ? iconForCategory(badge.category) : iconForLabel(badge.label)}
              color={color}
              className="h-9 w-9"
            />
          </span>
          <div className="relative min-w-0">
            <p className="font-display text-[21px] leading-tight font-semibold text-ink">{badge.label}</p>
            <p className="mt-1 text-[12.5px] text-muted">
              {badge.kind === "impact"
                ? "Prix d'impact · ventes et dons simulés"
                : `Prix de productivité · ${catMeta?.fr ?? badge.category}`}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Tag color={color}>Rang {badge.rank ?? 1}</Tag>
              <Tag color="var(--muted)">{badge.scope}</Tag>
            </div>
          </div>
        </div>

        {badge.kind === "impact" ? (
          /* ---------- Prix d'impact : mention honorifique ---------- */
          <div className="mt-5">
            <div className="rounded-2xl border border-accent/35 bg-accentsoft p-5 text-center">
              <Icon name="trophy" className="mx-auto h-6 w-6 text-accent" />
              <p className="mt-3 font-display text-[18px] leading-relaxed font-semibold text-ink" data-testid="impact-honor">
                Lauréat avec un total de {toPoints(badge.total ?? 0)} Points générés au cours de la période
              </p>
              <p className="mt-2 text-[12.5px] text-muted">
                Rang {badge.rank ?? 1} du classement · {periodLabel}
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-surface2 p-4">
                <p className="text-[11.5px] font-bold tracking-[0.14em] text-muted uppercase">Performance</p>
                <p className="mt-1.5 font-display text-[24px] font-semibold text-accent tabular-nums">
                  {toPoints(badge.total ?? 0)} {t("points.word")}
                </p>
                <p className="mt-1 text-[11.5px] text-muted">1 000 HTG de ventes et dons simulés = 1 Point</p>
              </div>
              <div className="rounded-2xl border border-line bg-surface2 p-4">
                <p className="text-[11.5px] font-bold tracking-[0.14em] text-muted uppercase">Règle d'égalité</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-inksoft">
                  En cas d'égalité parfaite, les ex-æquo partagent le même Award ; le créateur suivant reçoit le prix
                  directement inférieur, sans saut de rang pénalisant.
                </p>
              </div>
            </div>
            <p className="mt-4 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-muted">
              <Icon name="info" className="mt-px h-3.5 w-3.5 shrink-0 text-accent" />
              Titre honorifique calculé sur les ventes et dons simulés : aucune récompense physique ou matérielle n'est
              engagée. Le classement reste ouvert à tous les créateurs.
            </p>
          </div>
        ) : (
          /* ---------- Prix de productivité : fichiers sources ---------- */
          <div className="mt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-[17px] font-semibold text-ink">
                Fichiers ayant permis de décrocher le prix
              </p>
              <Tag color={color}>
                {files.length} œuvre{files.length > 1 ? "s" : ""} admissible{files.length > 1 ? "s" : ""}
              </Tag>
            </div>

            {files.length === 0 ? (
              <EmptyState
                icon="file"
                title="Aucun fichier source disponible"
                hint="Les livrables du mois ont peut-être été retirés du catalogue depuis l'attribution du prix."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {files.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => onOpenWork(w.id)}
                    data-testid="award-proof-file"
                    className="focus-ring group card flex items-start gap-3 p-3 text-left transition hover:-translate-y-0.5 hover:border-accent hover:shadow-[var(--shadow-md)]"
                  >
                    <Cover work={w} creatorName={profile.name} className="h-16 w-16 shrink-0 rounded-xl" watermarkSize={13} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[15.5px] font-semibold text-ink">{w.title}</span>
                      <span className="mt-1 block truncate text-[11.5px] text-muted">
                        {w.fileName} · {w.fileSize}
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-1.5">
                        <KindBadge kind={w.kind} />
                        <span className="text-[11px] text-muted">{htg(w.price)}</span>
                      </span>
                      <span className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-accent">
                        Voir l'œuvre <Icon name="arrowRight" className="h-3 w-3 transition group-hover:translate-x-0.5" />
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-line bg-surface2 p-4">
              <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
                <Icon name="shield" className="h-4 w-4 text-accent" /> Critères anti-spam appliqués
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
                Chaque fichier listé comporte un livrable adapté à la catégorie ({catMeta?.fr}), une description de plus
                de 100 caractères et une approbation de curation. Publié dans le mois, il compte comme une œuvre unique.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

