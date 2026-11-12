import { useStore } from "../lib/store";
import { useUI } from "../lib/ui-context";
import { prioritizeByInterests, orderedCategories } from "../lib/interests";
import { catLabel, makeTr } from "../lib/l10n";
import { CATEGORIES } from "../lib/types";
import type { Work } from "../lib/types";
import { Icon } from "./ui";
import { Cover } from "./Cover";

/** Sélection personnalisée de la page d'accueil : uniquement les univers
 * réellement choisis par le membre. Le visiteur garde l'accueil habituel. */
export function InterestSpotlight() {
  const { user, lang, publicWorks } = useStore();
  const { navigate } = useUI();
  const tr = makeTr(lang);
  const interests = user?.interests ?? [];
  if (!user || !interests.length) return null;

  const categories = orderedCategories(interests).filter((id) => interests.includes(id));
  const works = prioritizeByInterests(publicWorks, interests);

  const destination = (id: Work["category"]) =>
    id === "livres" || id === "projets" ? "/c/livres-projets" : `/c/${id}`;

  return (
    <section className="mb-7" data-testid="interest-priority" aria-label={tr("Vos univers en priorité", "Linivè ou prefere an premey", "Your interests first", "Tus intereses primero")}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[10.5px] font-bold tracking-[0.18em] text-accent uppercase">
            <Icon name="star" className="h-3.5 w-3.5" />
            {tr("Vos univers en priorité", "Linivè ou prefere an premey", "Your interests first", "Tus intereses primero")}
          </p>
          <h2 className="font-display text-[22px] font-semibold tracking-tight text-ink">
            {tr("Une sélection faite pour vous", "Yon seleksyon fèt espesyal pou ou", "A selection made for you", "Una selección hecha para ti")}
          </h2>
        </div>
        <button
          onClick={() => navigate(`/profil/${user.id}`)}
          className="focus-ring inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold text-accent"
        >
          {tr("Personnaliser", "Pèsonalize", "Personalize", "Personalizar")}
          <Icon name="arrowRight" className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((id) => {
          const work = works.find((item) => item.category === id);
          const count = publicWorks.filter((item) => item.category === id).length;
          const category = CATEGORIES.find((item) => item.id === id)!;
          return (
            <button
              key={id}
              data-interest-id={id}
              onClick={() => navigate(destination(id))}
              className="focus-ring group flex min-w-0 items-center gap-3 rounded-[18px] border border-line bg-surface p-3 text-left transition hover:border-accent hover:shadow-[var(--shadow-sm)]"
              style={{ borderLeft: `3px solid ${category.color}` }}
            >
              {work ? (
                <Cover work={work} creatorName="" watermark={false} className="h-14 w-16 shrink-0 rounded-xl" />
              ) : (
                <span className="grid h-14 w-16 shrink-0 place-items-center rounded-xl bg-accentsoft text-accent">
                  <Icon name="grid" className="h-5 w-5" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[17px] font-semibold text-ink">{catLabel(id, lang, true)}</span>
                <span className="mt-0.5 block truncate text-[12px] text-muted">
                  {count
                    ? tr("œuvres en premier", "zèv an premey", "works shown first", "obras primero")
                    : tr("Découvrir l'univers", "Dekouvri linivè sa a", "Explore this universe", "Explorar este universo")}
                </span>
              </span>
              <Icon name="arrowRight" className="h-4 w-4 shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
