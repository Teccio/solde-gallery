/* ============================================================
   MODULE ISOLÉ — Affichage privé des statistiques de provenance
   Réservé au Dashboard (Studio) du créateur connecté : le public
   ne voit jamais ces compteurs.
   ============================================================ */
import type { Work } from "../lib/types";
import type { ClickStats, WorkClicks } from "../lib/click-analytics";
import { makeTr } from "../lib/l10n";
import { useStore } from "../lib/store";
import { Icon } from "./ui";

/** Ligne compacte insérée sous chaque œuvre du catalogue personnel. */
export function WorkClickLine({ stat }: { stat?: WorkClicks }) {
  const { lang } = useStore();
  const tr = makeTr(lang);
  const total = stat?.total ?? 0;
  const fromBillboard = stat?.billboard ?? 0;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="work-click-line">
      <span className="inline-flex items-center gap-1 text-[11.5px] text-muted">
        <Icon name="eye" className="h-3.5 w-3.5" />
        {total} {tr("clic", "klik", "click", "clic")}{total > 1 ? "s" : ""} {tr("au total", "an total", "in total", "en total")}
      </span>
      {/* Mention textuelle exigée, affichée uniquement quand l'œuvre a été
          ouverte depuis le Billboard « À la une ». */}
      {fromBillboard > 0 && (
        <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-accent" data-testid="billboard-click-mention">
          <Icon name="flame" className="h-3.5 w-3.5" />
          {fromBillboard} {tr("clic", "klik", "click", "clic")}{fromBillboard > 1 ? "s" : ""}{" "}
          ({tr("depuis le billboard", "depi billboard la", "from the billboard", "desde el billboard")})
        </span>
      )}
    </div>
  );
}

/** Carte de synthèse du Dashboard : provenance des clics sur l'ensemble du catalogue. */
export function CreatorClickStats({ works, stats }: { works: Work[]; stats: ClickStats }) {
  const { lang } = useStore();
  const tr = makeTr(lang);
  const rows = works.map((w) => ({ work: w, stat: stats[w.id] }));
  const total = rows.reduce((s, r) => s + (r.stat?.total ?? 0), 0);
  const grid = rows.reduce((s, r) => s + (r.stat?.grid ?? 0), 0);
  const billboard = rows.reduce((s, r) => s + (r.stat?.billboard ?? 0), 0);
  const top = [...rows].sort((a, b) => (b.stat?.total ?? 0) - (a.stat?.total ?? 0))[0];
  const pct = total > 0 ? Math.round((billboard / total) * 100) : 0;

  return (
    <div className="card relative overflow-hidden p-5" data-testid="creator-click-stats">
      <div className="grain absolute inset-0" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11.5px] font-bold tracking-[0.16em] text-muted uppercase">{tr("Provenance des clics", "Orijin klik yo", "Click sources", "Origen de los clics")}</p>
            <p className="mt-1 text-[12px] text-muted">{tr("Statistiques privées · enregistrées dans ce navigateur", "Estatistik prive · anrejistre nan navigatè sa a", "Private statistics · stored in this browser", "Estadísticas privadas · guardadas en este navegador")}</p>
          </div>
          <span className="rounded-full border border-line bg-surface2 px-3 py-1 text-[11px] font-semibold text-inksoft">
            {works.length} {tr("œuvre", "zèv", "work", "obra")}{works.length > 1 ? "s" : ""} {tr("suivie", "swivi", "tracked", "seguida")}{works.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { label: tr("Total des clics", "Total klik", "Total clicks", "Total de clics"), value: total, icon: "eye", color: "var(--accent-color)" },
            { label: tr("Grille / catalogue", "Griy / katalòg", "Grid / catalog", "Cuadrícula / catálogo"), value: grid, icon: "grid", color: "var(--sea)" },
            { label: tr("Depuis le billboard", "Depi billboard la", "From the billboard", "Desde el billboard"), value: billboard, icon: "flame", color: "var(--hibiscus)" },
          ].map((x) => (
            <div key={x.label} className="rounded-2xl border border-line bg-surface2 p-3.5">
              <p className="flex items-center gap-1.5 text-[11.5px] text-muted">
                <Icon name={x.icon} className="h-3.5 w-3.5" />
                {x.label}
              </p>
              <p className="mt-1 font-display text-[27px] leading-none font-semibold tabular-nums" style={{ color: x.color }}>
                {x.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-[11.5px] text-muted">
            <span>{tr("Part des clics venant du Billboard", "Pati klik ki soti nan Billboard", "Share of clicks from the Billboard", "Parte de clics desde el Billboard")}</span>
            <span className="font-semibold text-ink">{pct} %</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {top && (top.stat?.total ?? 0) > 0 && (
          <p className="mt-3 text-[12px] text-muted">
            {tr("Œuvre la plus consultée", "Zèv ki pi konsilte", "Most viewed work", "Obra más vista")} : <strong className="text-ink">{top.work.title}</strong> · {top.stat!.total} {tr("clics", "klik", "clicks", "clics")}
            {top.stat!.billboard > 0 && ` · ${top.stat!.billboard} ${tr("clics (depuis le billboard)", "klik (depi billboard la)", "clicks (from the billboard)", "clics (desde el billboard)")}`}
          </p>
        )}
      </div>
    </div>
  );
}
