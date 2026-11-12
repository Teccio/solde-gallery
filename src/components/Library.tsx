import { useMemo, useState, useSyncExternalStore } from "react";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui-context";
import { engine } from "../lib/audio";
import type { CategoryId, FileKind, Lang, LedgerEntry, Work } from "../lib/types";
import { Button, EmptyState, Icon, IconButton } from "./ui";
import { Cover } from "./Cover";
import { downloadLicence } from "./Modals";
import { cn } from "../utils/cn";

/* ============================================================
   MODULE ISOLÉ — Bibliothèque de l'espace personnel
   · une carte par œuvre acquise (achat le plus récent conservé),
     y compris les œuvres gratuites obtenues ;
   · les œuvres supprimées par leur créateur restent présentes :
     l'accès acquis est conservé (licence nominative) ;
   · données lues dans le registre local (localStorage) : la
     bibliothèque subsiste tant que le navigateur n'est pas vidé.
   ============================================================ */

type Group = "musique" | "photo" | "art" | "architecture" | "livres-projets";

const GROUP_OF = (c: CategoryId): Group => (c === "livres" || c === "projets" ? "livres-projets" : c);

const GROUP_LABELS: Record<Group, Record<Lang, string>> = {
  musique: { fr: "Musique", ht: "Mizik", en: "Music", es: "Música" },
  photo: { fr: "Photo & vidéo", ht: "Foto ak videyo", en: "Photo & video", es: "Foto y vídeo" },
  art: { fr: "Art & tableaux", ht: "Atizay ak tablo", en: "Art & paintings", es: "Arte y cuadros" },
  architecture: { fr: "Architecture", ht: "Achitekti", en: "Architecture", es: "Arquitectura" },
  "livres-projets": { fr: "Livres et projets", ht: "Liv ak pwojè", en: "Books & projects", es: "Libros y proyectos" },
};

/* Libellé du livrable affiché sur la carte (PDF, musique ZIP, plans…) */
function deliverable(kind: FileKind, cat: CategoryId) {
  if (cat === "musique") return kind === "zip" ? "ZIP · Album / EP" : "MP3 · Single";
  if (cat === "architecture") return `${kind.toUpperCase()} · Plans`;
  if (kind === "mp4") return "MP4 · Vidéo";
  return kind.toUpperCase();
}

const LOCALES: Record<Lang, string> = { fr: "fr-FR", ht: "fr-FR", en: "en-US", es: "es-ES" };
const INITIAL = 6;

export function LibraryPanel() {
  const { user, db, userById, purchasesOf, notify, t, lang } = useStore();
  const { open, navigate } = useUI();
  const player = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const [group, setGroup] = useState<Group | "all">("all");
  const [showAll, setShowAll] = useState(false);

  const items = useMemo(() => {
    if (!user) return [] as { entry: LedgerEntry; work?: Work; cat: CategoryId }[];
    const latest = new Map<string, LedgerEntry>();
    purchasesOf(user.id).forEach((e) => {
      if (!e.workId) return;
      const cur = latest.get(e.workId);
      if (!cur || +new Date(e.date) > +new Date(cur.date)) latest.set(e.workId, e);
    });
    return [...latest.values()]
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .map((entry) => {
        const work = db.works.find((w) => w.id === entry.workId);
        return { entry, work, cat: (work?.category ?? entry.snapshot?.category ?? "livres") as CategoryId };
      });
  }, [user, purchasesOf, db.works]);

  if (!user) return null;

  const counts = items.reduce<Record<string, number>>((acc, it) => {
    const g = GROUP_OF(it.cat);
    acc[g] = (acc[g] ?? 0) + 1;
    return acc;
  }, {});
  const filtered = group === "all" ? items : items.filter((it) => GROUP_OF(it.cat) === group);
  const visible = showAll ? filtered : filtered.slice(0, INITIAL);
  const mp3Queue = items.filter((it) => it.work && !it.work.deleted && it.work.kind === "mp3").map((it) => it.work!) as Work[];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-[10.5px] font-bold tracking-[0.18em] text-accent uppercase">
            {items.length} · {t("nav.library")}
          </p>
          <p className="max-w-xl text-[13px] text-muted">{t("library.sub")}</p>
        </div>
        <button onClick={() => navigate("/achats")} className="focus-ring inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-accent">
          {t("library.history")} <Icon name="arrowRight" className="h-3.5 w-3.5" />
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="library"
          title={t("library.empty")}
          hint={t("library.emptyHint")}
          action={
            <Button className="mt-2" icon="compass" onClick={() => navigate("/categories")}>
              {t("library.explore")}
            </Button>
          }
        />
      ) : (
        <>
          <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 py-0.5">
            {(["all", ...(Object.keys(GROUP_LABELS) as Group[]).filter((g) => counts[g])] as (Group | "all")[]).map((g) => (
              <button
                key={g}
                onClick={() => {
                  setGroup(g);
                  setShowAll(false);
                }}
                className={cn(
                  "focus-ring shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition",
                  group === g ? "border-transparent bg-accent text-accentink" : "border-line bg-surface text-inksoft hover:border-linestrong",
                )}
              >
                {g === "all" ? t("library.all") : GROUP_LABELS[g][lang]}
                <span className="ml-1.5 tabular-nums opacity-70">{g === "all" ? items.length : counts[g]}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="library-grid">
            {visible.map(({ entry, work, cat }, i) => {
              const removed = !work || !!work.deleted;
              const title = entry.snapshot?.title ?? work?.title ?? entry.workTitle ?? "Œuvre";
              const creatorName = entry.snapshot?.creatorName ?? userById(entry.creatorId)?.name ?? "";
              const kind = (work?.kind ?? entry.snapshot?.kind ?? "pdf") as FileKind;
              const fileName = entry.snapshot?.fileName ?? work?.fileName ?? "fichier";
              const playing = !!work && player.track?.id === work.id && player.playing;
              return (
                <article
                  key={entry.workId}
                  className="group card rise flex flex-col overflow-hidden p-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
                  style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                >
                  <div className="relative overflow-hidden rounded-2xl">
                    {work ? (
                      <Cover work={work} creatorName={creatorName} className="aspect-[4/3] w-full rounded-2xl" />
                    ) : (
                      <div className="grid aspect-[4/3] w-full place-items-center rounded-2xl bg-surface2">
                        <Icon name="file" className="h-8 w-8 text-muted" />
                      </div>
                    )}
                    <span className="absolute top-2.5 right-2.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white backdrop-blur-sm">
                      {deliverable(kind, cat)}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col px-1.5 pt-3 pb-1">
                    <h3 className="truncate font-display text-[16.5px] leading-snug font-semibold text-ink">{title}</h3>
                    <p className="truncate text-[12.5px] text-muted">
                      {creatorName} · {fileName}
                    </p>
                    {removed && (
                      <span className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-full bg-warning/12 px-2 py-0.5 text-[10.5px] font-semibold text-warning">
                        <Icon name="lock" className="h-3 w-3" /> {t("library.removed")}
                      </span>
                    )}
                    <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted">
                      <Icon name="shield" className="h-3.5 w-3.5 text-accent" />
                      {t("library.license")}{" "}
                      {new Date(entry.date).toLocaleDateString(LOCALES[lang], { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        icon="download"
                        onClick={() => {
                          downloadLicence(fileName, title, user.name, entry.id);
                          notify({ title: t("action.download"), body: fileName, tone: "success" });
                        }}
                      >
                        {t("action.download")}
                      </Button>
                      {work && !removed && work.kind === "mp3" && (
                        <Button size="sm" variant="outline" icon={playing ? "pause" : "play"} onClick={() => void engine.play(work, mp3Queue)}>
                          {playing ? t("action.pause") : t("action.play")}
                        </Button>
                      )}
                      {work && !removed && (
                        <IconButton name="eye" label={t("library.view")} className="h-9 w-9" onClick={() => open({ type: "work", id: work.id })} />
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {filtered.length > INITIAL && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm" icon={showAll ? "chevronDown" : "plus"} onClick={() => setShowAll((v) => !v)}>
                {showAll ? t("library.less") : `${t("library.more")} (${filtered.length})`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
