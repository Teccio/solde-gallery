import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { engine, fmtTime, PREVIEW_SECONDS, PLAYBACK_RATES } from "../lib/audio";
import type { RepeatMode } from "../lib/audio";
import type { Work } from "../lib/types";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui-context";
import { Cover } from "./Cover";
import { Icon } from "./ui";
import { cn } from "../utils/cn";

/* Disque virtuel : pochette ronde qui tourne pendant la lecture.
   `animation-play-state` fige la rotation instantanément en pause/stop. */
function VinylDisc({
  work,
  spinning,
  className,
  testId,
}: {
  work: Work;
  spinning: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      className={cn("relative shrink-0", className)}
      data-testid={testId}
      data-spinning={spinning ? "true" : "false"}
      aria-hidden="true"
    >
      <div
        className="vinyl-spin h-full w-full overflow-hidden rounded-full border border-line shadow-[var(--shadow-md)]"
        style={{ animationPlayState: spinning ? "running" : "paused" }}
      >
        {work.cover ? (
          <img src={work.cover} alt="" draggable={false} className="h-full w-full object-cover" />
        ) : (
          <Cover work={work} creatorName="" watermark={false} className="h-full w-full" />
        )}
        <div className="vinyl-grooves pointer-events-none absolute inset-0 rounded-full" />
        <div className="absolute inset-0 grid place-items-center">
          <span
            className="grid h-[27%] w-[27%] place-items-center rounded-full border border-white/40"
            style={{ background: "var(--gold)" }}
          >
            <span className="h-[32%] w-[32%] rounded-full bg-surface" />
          </span>
        </div>
      </div>
    </div>
  );
}

/* File d'écoute éditable : lecture, réordonnancement, retrait, vidage.
   Le titre en cours reste verrouillé pour ne jamais casser la lecture. */
function QueueList() {
  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const { userById } = useStore();
  if (!state.queue.length) {
    return <p className="px-2 py-6 text-center text-[12.5px] text-muted">File d'écoute vide.</p>;
  }
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="playlist-editor">
      <div className="flex items-center justify-between px-2 pt-1 pb-2">
        <p className="text-[11px] font-semibold text-muted">
          {state.queue.length} titre{state.queue.length > 1 ? "s" : ""}
        </p>
        <button
          onClick={() => engine.clearQueue()}
          disabled={state.queue.length <= 1}
          className="focus-ring rounded-full px-2 py-1 text-[11px] font-semibold text-muted transition hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
        >
          Vider la file
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2 pt-0">
        {state.queue.map((w, i) => (
          <div
            key={`${w.id}-${i}`}
            className={cn(
              "flex w-full items-center gap-1.5 rounded-xl p-1.5 transition",
              i === state.index ? "bg-accentsoft" : "hover:bg-surface2",
            )}
          >
            <button
              onClick={() => void engine.play(w, state.queue)}
              className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-lg p-0.5 text-left"
              aria-label={`Lire ${w.title}`}
            >
              <Cover work={w} creatorName="" watermark={false} className="h-10 w-10 shrink-0 rounded-lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">{w.title}</span>
                <span className="block truncate text-[11px] text-muted">{userById(w.creatorId)?.name}</span>
              </span>
              {i === state.index && state.playing && (
                <span className="flex h-4 shrink-0 items-end gap-[2px]">
                  {[0, 1, 2].map((b) => (
                    <span key={b} className="eq-bar block w-[2px] rounded-full bg-accent" style={{ height: 10, animationDelay: `${b * 0.15}s` }} />
                  ))}
                </span>
              )}
            </button>
            <span className="flex shrink-0 items-center">
              <button
                onClick={() => engine.moveInQueue(i, i - 1)}
                disabled={i === 0}
                aria-label={`Monter ${w.title} dans la file`}
                title="Monter"
                className="focus-ring grid h-7 w-7 place-items-center rounded-full text-muted transition hover:bg-surface2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Icon name="chevronDown" className="h-4 w-4 rotate-180" />
              </button>
              <button
                onClick={() => engine.moveInQueue(i, i + 1)}
                disabled={i === state.queue.length - 1}
                aria-label={`Descendre ${w.title} dans la file`}
                title="Descendre"
                className="focus-ring grid h-7 w-7 place-items-center rounded-full text-muted transition hover:bg-surface2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Icon name="chevronDown" className="h-4 w-4" />
              </button>
              <button
                onClick={() => engine.removeFromQueue(w.id)}
                disabled={i === state.index}
                aria-label={`Retirer ${w.title} de la file`}
                title={i === state.index ? "Titre en cours de lecture" : "Retirer de la file"}
                data-testid={i === state.index ? undefined : "playlist-remove"}
                data-work-id={w.id}
                className="focus-ring grid h-7 w-7 place-items-center rounded-full text-muted transition hover:bg-surface2 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PLAY_MODES: { id: RepeatMode; label: string; icon: string }[] = [
  { id: "loop", label: "En boucle", icon: "refresh" },
  { id: "shuffle", label: "Aléatoire", icon: "shuffle" },
  { id: "single", label: "Lecture unique", icon: "repeatOne" },
];

/* Le lecteur est monté une seule fois à la racine : la navigation
   interne ne le démonte jamais, la lecture reste donc continue. */
export function Player() {
  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const { userById, db, setPrefs, user, toggleFavorite, favoritesOf, purchasesOf, notify } = useStore();
  const { open, navigate } = useUI();
  const [time, setTime] = useState(0);
  const [panel, setPanel] = useState<"none" | "lyrics" | "queue">("none");
  const [expanded, setExpanded] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [overlayTab, setOverlayTab] = useState<"lyrics" | "queue">("lyrics");
  const [previewDismissed, setPreviewDismissed] = useState(false);
  const raf = useRef(0);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLParagraphElement>(null);
  const speedRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<HTMLDivElement>(null);
  const previewToastRef = useRef<string | null>(null);
  const prevPreviewRef = useRef<{ id: string | null; limited: boolean }>({ id: null, limited: false });

  const track = state.track;
  const creator = track ? userById(track.creatorId) : undefined;
  const fav = user && track ? favoritesOf(user.id).includes(track.id) : false;

  /* Droit d'écoute intégrale : œuvre gratuite, auteur, admin ou achat.
     Tout le reste est bridé à l'aperçu de 8 secondes. */
  const ownedIds = user ? purchasesOf(user.id).map((p) => p.workId) : [];
  const ownedKey = ownedIds.join(",");
  useEffect(() => {
    engine.setAccessResolver((work) => {
      if (work.kind !== "mp3") return true;
      if ((work.price ?? 0) <= 0) return true;
      if (!user) return false;
      if (user.id === work.creatorId) return true;
      if (user.isAdmin) return true;
      return purchasesOf(user.id).some((p) => p.workId === work.id);
    });
    engine.refreshPreviewAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, ownedKey, db.ledger]);

  const previewLimited = state.previewLimited && !!track;
  const previewEnded = state.previewEnded && !!track;
  const fullDuration = engine.duration || track?.duration || 0;
  const effectiveDuration = previewLimited ? Math.min(fullDuration || PREVIEW_SECONDS, PREVIEW_SECONDS) : fullDuration;
  const displayTime = Math.min(time, effectiveDuration || 0);

  /* Boucle d'animation unique, active seulement pendant la lecture */
  useEffect(() => {
    if (!state.playing) {
      setTime(engine.time);
      return;
    }
    const tick = () => {
      setTime(engine.time);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [state.playing, state.track?.id]);

  /* Le volume n'est persisté qu'en fin de geste : on évite d'écrire
     dans localStorage à chaque pixel du curseur. */
  useEffect(() => {
    if (state.volume === db.prefs.volume) return;
    const id = window.setTimeout(() => setPrefs({ volume: state.volume }), 400);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.volume]);

  /* Défilement des paroles : la ligne active est centrée dans son conteneur */
  const lyrics = track?.lyrics ?? [];
  const activeIdx = lyrics.reduce((acc, l, i) => (displayTime >= l.t ? i : acc), -1);
  useEffect(() => {
    if (panel !== "lyrics" && !expanded) return;
    const c = lyricsRef.current;
    const el = activeRef.current;
    if (c && el) c.scrollTo({ top: el.offsetTop - c.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
  }, [activeIdx, panel, expanded]);

  /* Fin d'aperçu : invitation unique par titre, puis état réarmé au changement de piste. */
  useEffect(() => {
    if (state.previewEnded && track && previewToastRef.current !== track.id) {
      previewToastRef.current = track.id;
      notify({
        title: "Aperçu de 8 secondes terminé",
        body: `${track.title} — achetez l'œuvre pour écouter l'intégralité.`,
        tone: "warn",
      });
    }
  }, [state.previewEnded, track, notify]);

  /* Déblocage après achat : le titre en cours passe en écoute intégrale. */
  useEffect(() => {
    const prev = prevPreviewRef.current;
    if (prev.id === (track?.id ?? null) && prev.limited && !state.previewLimited && track) {
      notify({ title: "Morceau débloqué", body: `${track.title} — écoute intégrale disponible.`, tone: "success" });
    }
    prevPreviewRef.current = { id: track?.id ?? null, limited: state.previewLimited };
  }, [state.previewLimited, track, notify]);

  useEffect(() => {
    setPreviewDismissed(false);
  }, [track?.id]);

  /* Fermeture des mini-panneaux vitesse / mode : clic extérieur ou Échap. */
  useEffect(() => {
    if (!speedOpen && !modeOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (speedRef.current?.contains(t) || modeRef.current?.contains(t)) return;
      setSpeedOpen(false);
      setModeOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSpeedOpen(false);
        setModeOpen(false);
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [speedOpen, modeOpen]);

  const pct = effectiveDuration ? Math.min(100, (displayTime / effectiveDuration) * 100) : 0;
  const modeMeta = PLAY_MODES.find((m) => m.id === state.repeatMode) ?? PLAY_MODES[0];

  const buyCurrent = () => {
    if (!track) return;
    if (user) open({ type: "buy", workId: track.id });
    else open({ type: "auth", mode: "login" });
  };

  const Seek = ({ className }: { className?: string }) => (
    <input
      type="range"
      min={0}
      max={Math.max(1, effectiveDuration)}
      step={0.1}
      value={displayTime}
      onChange={(e) => {
        const v = Number(e.target.value);
        engine.seek(v);
        setTime(previewLimited ? Math.min(v, PREVIEW_SECONDS) : v);
      }}
      aria-label="Position de lecture"
      style={{ ["--fill" as string]: `${pct}%` }}
      className={cn("h-4 w-full", className)}
    />
  );

  const LyricsBlock = (
    <div ref={lyricsRef} className="relative h-full space-y-3 overflow-y-auto px-5 py-6 text-center">
      {lyrics.length === 0 ? (
        <p className="pt-10 text-sm text-muted">Aucune parole disponible pour cette œuvre.</p>
      ) : (
        lyrics.map((l, i) => (
          <p
            key={i}
            ref={i === activeIdx ? activeRef : undefined}
            data-time={l.t}
            onClick={() => engine.seek(l.t)}
            className={cn(
              "lyric-line cursor-pointer font-display leading-snug",
              i === activeIdx ? "scale-[1.03] text-[21px] font-semibold text-accent" : "text-[16px] text-muted opacity-60 hover:opacity-100",
            )}
          >
            {db.prefs.lang === "ht" ? (l.ht ?? l.fr) : l.fr}
          </p>
        ))
      )}
    </div>
  );

  const showBanner = !!track && previewLimited && previewEnded && !previewDismissed;

  return (
    <>
      {/* Panneau paroles / file d'écoute (bureau) */}
      {panel !== "none" && track && (
        <div className="pop fixed right-3 bottom-[104px] z-[70] hidden h-[340px] w-[340px] flex-col overflow-hidden rounded-2xl border border-line bg-overlay shadow-[var(--shadow-lg)] lg:flex">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <div className="flex gap-1">
              {(["lyrics", "queue"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setPanel(k)}
                  className={cn(
                    "focus-ring rounded-full px-3 py-1 text-[12px] font-semibold transition",
                    panel === k ? "bg-accentsoft text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  {k === "lyrics" ? "Paroles" : `Playlist (${state.queue.length})`}
                </button>
              ))}
            </div>
            <button onClick={() => setPanel("none")} aria-label="Fermer" className="focus-ring text-muted hover:text-ink">
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
          {panel === "lyrics" ? (
            LyricsBlock
          ) : (
            <div className="min-h-0 flex-1 p-2">
              <QueueList />
            </div>
          )}
        </div>
      )}

      {/* Vue plein écran (tous écrans) */}
      {expanded && track && (
        <div className="fixed inset-0 z-[110] overflow-y-auto bg-ivory" data-testid="player-fullscreen" role="dialog" aria-label="Lecteur plein écran">
          <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-6 py-4">
            <div className="flex items-center justify-between py-2">
              <button onClick={() => setExpanded(false)} className="focus-ring text-ink" aria-label="Réduire le lecteur">
                <Icon name="chevronDown" className="h-6 w-6" />
              </button>
              <p className="text-[11px] font-bold tracking-[0.18em] text-muted uppercase">En écoute</p>
              <button onClick={() => open({ type: "work", id: track.id })} className="focus-ring text-ink" aria-label="Détails">
                <Icon name="info" className="h-5 w-5" />
              </button>
            </div>
            <div className="flex justify-center py-2">
              <VinylDisc
                work={track}
                spinning={state.playing && !state.loading}
                testId="vinyl-disc-full"
                className="h-[min(56vw,230px)] w-[min(56vw,230px)]"
              />
            </div>
            <div className="pt-4 text-center">
              <h3 className="font-display text-2xl font-semibold text-ink">{track.title}</h3>
              <p className="text-sm text-muted">{creator?.name}</p>
              {previewLimited && (
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-accentsoft px-3 py-1 text-[11px] font-bold tracking-wide text-accent uppercase">
                  <Icon name="clock" className="h-3.5 w-3.5" /> Aperçu 8 s
                </span>
              )}
            </div>
            {previewLimited && previewEnded && (
              <div className="mt-4 rounded-2xl border border-gold/50 bg-accentsoft p-4 text-center" data-testid="preview-banner-full">
                <p className="text-[13px] font-semibold text-ink">Aperçu terminé — débloquez le morceau complet</p>
                <p className="mt-1 text-[12px] text-muted">8 secondes écoutées. Achetez l'œuvre pour l'écouter en intégralité.</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={buyCurrent} className="focus-ring btn-accent flex-1 rounded-full px-4 py-2.5 text-[13px] font-semibold">
                    Acheter l'œuvre
                  </button>
                  <button
                    onClick={() => engine.toggle()}
                    className="focus-ring flex-1 rounded-full border border-line px-4 py-2.5 text-[13px] font-semibold text-ink transition hover:border-accent"
                  >
                    Rejouer l'extrait
                  </button>
                </div>
              </div>
            )}
            <div className="mt-4">
              <Seek />
              <div className="flex justify-between text-[11px] text-muted">
                <span>{fmtTime(displayTime)}</span>
                <span title={previewLimited ? `Extrait de 8 s sur ${fmtTime(fullDuration)}` : undefined}>
                  {previewLimited ? `${fmtTime(PREVIEW_SECONDS)} · extrait` : fmtTime(fullDuration)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-center gap-5">
                <button onClick={() => engine.prev()} className="focus-ring text-ink" aria-label="Précédent">
                  <Icon name="prev" className="h-7 w-7" />
                </button>
                <button onClick={() => engine.toggle()} className="focus-ring btn-accent grid h-16 w-16 place-items-center rounded-full" aria-label={state.playing ? "Pause" : "Lecture"}>
                  {state.loading ? (
                    <span className="h-6 w-6 rounded-full border-2 border-current border-t-transparent spin-slow" />
                  ) : (
                    <Icon name={state.playing ? "pause" : "play"} className="h-7 w-7" />
                  )}
                </button>
                <button onClick={() => engine.stopPlayback()} className="focus-ring text-ink" aria-label="Stop">
                  <Icon name="stop" className="h-6 w-6" />
                </button>
                <button onClick={() => engine.next()} className="focus-ring text-ink" aria-label="Suivant">
                  <Icon name="next" className="h-7 w-7" />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2">
                {PLAY_MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => engine.setRepeatMode(m.id)}
                    aria-pressed={state.repeatMode === m.id}
                    title={m.label}
                    className={cn(
                      "focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition",
                      state.repeatMode === m.id ? "border-accent bg-accentsoft text-accent" : "border-line text-inksoft",
                    )}
                  >
                    <Icon name={m.icon} className="h-4 w-4" /> {m.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <span className="text-[11px] font-semibold text-muted">Vitesse</span>
                {PLAYBACK_RATES.map((r) => (
                  <button
                    key={r}
                    onClick={() => engine.setRate(r)}
                    aria-pressed={state.rate === r}
                    className={cn(
                      "focus-ring rounded-full px-2.5 py-1 text-[11.5px] font-bold tabular-nums transition",
                      state.rate === r ? "bg-accent text-accentink" : "text-muted hover:bg-surface2 hover:text-ink",
                    )}
                  >
                    {r}×
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button onClick={() => engine.toggleMute()} aria-label="Couper le son" className="focus-ring text-inksoft">
                  <Icon name={state.muted || state.volume === 0 ? "volumeX" : "volume"} className="h-5 w-5" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={state.muted ? 0 : state.volume}
                  onChange={(e) => engine.setVolume(Number(e.target.value))}
                  aria-label="Volume"
                  style={{ ["--fill" as string]: `${(state.muted ? 0 : state.volume) * 100}%` }}
                  className="h-4 w-40"
                />
                <button
                  onClick={() => {
                    setExpanded(false);
                    navigate("/bibliotheque");
                  }}
                  aria-label="Bibliothèque"
                  title="Bibliothèque"
                  className="focus-ring grid h-9 w-9 place-items-center rounded-full border border-line text-inksoft"
                >
                  <Icon name="library" className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-4 flex gap-1 border-b border-line pb-2">
              {(["lyrics", "queue"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setOverlayTab(k)}
                  className={cn(
                    "focus-ring rounded-full px-3 py-1.5 text-[12px] font-semibold transition",
                    overlayTab === k ? "bg-accentsoft text-ink" : "text-muted",
                  )}
                >
                  {k === "lyrics" ? "Paroles" : `Playlist (${state.queue.length})`}
                </button>
              ))}
            </div>
            <div className="max-h-72 min-h-0 flex-1 overflow-hidden py-2">
              {overlayTab === "lyrics" ? LyricsBlock : <QueueList />}
            </div>
            <div className="h-6" />
          </div>
        </div>
      )}

      {/* Barre de lecture persistante */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-[62px] z-[65] border-t border-line bg-surface/95 shadow-[0_-12px_40px_-18px_rgba(50,36,12,0.35)] backdrop-blur-xl lg:bottom-0",
          "h-[70px] lg:h-[92px]",
        )}
      >
        <div className="absolute inset-x-0 top-0 h-[2px] bg-line lg:hidden">
          <div className="h-full bg-accent transition-[width] duration-150" style={{ width: `${pct}%` }} />
        </div>

        {/* Invitation d'achat à la fin de l'aperçu de 8 secondes */}
        {showBanner && track && (
          <div
            className="absolute inset-x-0 bottom-full border-t border-gold/40 bg-overlay/97 backdrop-blur-xl"
            data-testid="preview-banner"
            role="status"
          >
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 py-2.5 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-accentsoft px-2.5 py-1 text-[11px] font-bold tracking-wide text-accent uppercase">
                <Icon name="clock" className="h-3.5 w-3.5" /> Aperçu 8 s terminé
              </span>
              <p className="text-[12.5px] text-inksoft">
                <strong className="text-ink">{track.title}</strong> — achetez l'œuvre pour débloquer le morceau complet.
              </p>
              <span className="flex items-center gap-2">
                <button
                  onClick={buyCurrent}
                  data-testid="preview-buy"
                  className="focus-ring btn-accent rounded-full px-4 py-1.5 text-[12.5px] font-semibold"
                >
                  Acheter l'œuvre
                </button>
                <button
                  onClick={() => engine.toggle()}
                  className="focus-ring rounded-full border border-line px-3 py-1.5 text-[12px] font-semibold text-inksoft transition hover:border-accent hover:text-ink"
                >
                  Rejouer l'extrait
                </button>
                <button
                  onClick={() => setPreviewDismissed(true)}
                  aria-label="Masquer l'invitation"
                  className="focus-ring grid h-7 w-7 place-items-center rounded-full text-muted transition hover:bg-surface2 hover:text-ink"
                >
                  <Icon name="x" className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          </div>
        )}

        {!track ? (
          <div className="flex h-full items-center justify-center gap-3 px-4 text-[13px] text-muted">
            <Icon name="music" className="h-4 w-4 text-accent" />
            Choisissez une œuvre pour démarrer l'écoute — la lecture continue pendant votre navigation.
          </div>
        ) : (
          <div className="flex h-full items-center gap-2 px-3 sm:gap-3 sm:px-5">
            <button
              onClick={() => (window.innerWidth < 1024 ? setExpanded(true) : open({ type: "work", id: track.id }))}
              className="focus-ring flex min-w-0 flex-1 items-center gap-3 text-left lg:w-[250px] lg:flex-none"
            >
              <VinylDisc
                work={track}
                spinning={state.playing && !state.loading}
                testId="vinyl-disc"
                className="h-11 w-11 lg:h-14 lg:w-14"
              />
              <span className="min-w-0">
                <span className="block truncate font-display text-[15px] font-semibold text-ink">{track.title}</span>
                <span className="block truncate text-[12px] text-muted">{creator?.name}</span>
                {previewLimited && (
                  <span className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-gold/50 bg-accentsoft px-2 py-px text-[10px] font-bold tracking-wide text-accent uppercase">
                    Extrait 0:08
                  </span>
                )}
              </span>
            </button>

            {state.error && (
              <span className="hidden items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1 text-[11.5px] font-semibold text-danger lg:flex">
                <Icon name="alert" className="h-3.5 w-3.5" /> {state.error}
              </span>
            )}

            <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
              <div className="flex shrink-0 items-center gap-1.5">
                <button onClick={() => engine.prev()} aria-label="Précédent" title="Précédent" className="focus-ring grid h-9 w-9 place-items-center rounded-full text-inksoft transition hover:bg-surface2 hover:text-ink">
                  <Icon name="prev" className="h-[18px] w-[18px]" />
                </button>
                <button
                  onClick={() => engine.toggle()}
                  aria-label={state.playing ? "Pause" : "Lecture"}
                  title={state.playing ? "Pause" : "Lecture"}
                  className="focus-ring btn-accent grid h-12 w-12 place-items-center rounded-full"
                >
                  {state.loading ? (
                    <span className="h-5 w-5 rounded-full border-2 border-current border-t-transparent spin-slow" />
                  ) : (
                    <Icon name={state.playing ? "pause" : "play"} className="h-5 w-5" />
                  )}
                </button>
                <button onClick={() => engine.stopPlayback()} aria-label="Stop" title="Stop — reprend depuis le début" data-testid="player-stop" className="focus-ring grid h-9 w-9 place-items-center rounded-full text-inksoft transition hover:bg-surface2 hover:text-ink">
                  <Icon name="stop" className="h-[17px] w-[17px]" />
                </button>
                <button onClick={() => engine.next()} aria-label="Suivant" title="Suivant" className="focus-ring grid h-9 w-9 place-items-center rounded-full text-inksoft transition hover:bg-surface2 hover:text-ink">
                  <Icon name="next" className="h-[18px] w-[18px]" />
                </button>
              </div>
              <span className="w-10 shrink-0 text-right text-[11.5px] tabular-nums text-muted">{fmtTime(displayTime)}</span>
              <Seek className="min-w-0 flex-1" />
              <span
                className="w-auto shrink-0 text-[11.5px] tabular-nums text-muted"
                title={previewLimited ? `Extrait de 8 s sur ${fmtTime(fullDuration)} — achetez pour débloquer` : undefined}
              >
                {previewLimited ? `${fmtTime(PREVIEW_SECONDS)} · extrait` : fmtTime(fullDuration)}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => setPanel(panel === "lyrics" ? "none" : "lyrics")}
                aria-label="Paroles synchronisées"
                title="Paroles synchronisées"
                className={cn(
                  "focus-ring hidden h-9 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition xl:flex",
                  panel === "lyrics" ? "border-accent bg-accentsoft text-accent" : "border-line text-inksoft hover:text-ink",
                )}
              >
                <Icon name="quote" className="h-4 w-4" /> Paroles
              </button>
              <button
                onClick={() => setPanel(panel === "queue" ? "none" : "queue")}
                aria-label="Playlist éditable"
                title={`Playlist éditable (${state.queue.length} titres)`}
                data-testid="player-playlist"
                className={cn(
                  "focus-ring hidden h-9 w-9 place-items-center rounded-full border transition lg:grid",
                  panel === "queue" ? "border-accent bg-accentsoft text-accent" : "border-line text-inksoft hover:text-ink",
                )}
              >
                <Icon name="list" className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate("/bibliotheque")}
                aria-label="Bibliothèque"
                title="Bibliothèque"
                data-testid="player-library"
                className="focus-ring hidden h-9 w-9 place-items-center rounded-full border border-line text-inksoft transition hover:text-ink lg:grid"
              >
                <Icon name="library" className="h-4 w-4" />
              </button>

              <div className="relative hidden lg:block" ref={speedRef}>
                <button
                  onClick={() => {
                    setSpeedOpen((v) => !v);
                    setModeOpen(false);
                  }}
                  aria-label="Vitesse de lecture"
                  title="Vitesse de lecture"
                  aria-expanded={speedOpen}
                  data-testid="player-speed"
                  className={cn(
                    "focus-ring grid h-9 min-w-9 place-items-center rounded-full border px-2 text-[12px] font-bold tabular-nums transition",
                    speedOpen || state.rate !== 1 ? "border-accent bg-accentsoft text-accent" : "border-line text-inksoft hover:text-ink",
                  )}
                >
                  {state.rate}×
                </button>
                {speedOpen && (
                  <div className="pop absolute right-0 bottom-[calc(100%+10px)] z-[80] w-40 overflow-hidden rounded-2xl border border-line bg-overlay p-1.5 shadow-[var(--shadow-lg)]">
                    <p className="px-2.5 py-1 text-[10.5px] font-bold tracking-[0.14em] text-muted uppercase">Vitesse</p>
                    {PLAYBACK_RATES.map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          engine.setRate(r);
                          setSpeedOpen(false);
                        }}
                        aria-pressed={state.rate === r}
                        className={cn(
                          "focus-ring flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-[12.5px] font-semibold transition",
                          state.rate === r ? "bg-accentsoft text-accent" : "text-inksoft hover:bg-surface2",
                        )}
                      >
                        {r}×
                        {state.rate === r && <Icon name="check" className="h-3.5 w-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative hidden lg:block" ref={modeRef}>
                <button
                  onClick={() => {
                    setModeOpen((v) => !v);
                    setSpeedOpen(false);
                  }}
                  aria-label={`Mode de lecture : ${modeMeta.label}`}
                  title={`Mode : ${modeMeta.label}`}
                  aria-expanded={modeOpen}
                  data-testid="player-mode"
                  className={cn(
                    "focus-ring grid h-9 w-9 place-items-center rounded-full border transition",
                    modeOpen || state.repeatMode !== "loop" ? "border-accent bg-accentsoft text-accent" : "border-line text-inksoft hover:text-ink",
                  )}
                >
                  <Icon name={modeMeta.icon} className="h-4 w-4" />
                </button>
                {modeOpen && (
                  <div className="pop absolute right-0 bottom-[calc(100%+10px)] z-[80] w-44 overflow-hidden rounded-2xl border border-line bg-overlay p-1.5 shadow-[var(--shadow-lg)]">
                    <p className="px-2.5 py-1 text-[10.5px] font-bold tracking-[0.14em] text-muted uppercase">Mode de lecture</p>
                    {PLAY_MODES.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          engine.setRepeatMode(m.id);
                          setModeOpen(false);
                        }}
                        aria-pressed={state.repeatMode === m.id}
                        data-testid={`player-mode-${m.id}`}
                        className={cn(
                          "focus-ring flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold transition",
                          state.repeatMode === m.id ? "bg-accentsoft text-accent" : "text-inksoft hover:bg-surface2",
                        )}
                      >
                        <Icon name={m.icon} className="h-4 w-4" /> {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="hidden items-center gap-1.5 lg:flex">
                <button onClick={() => engine.toggleMute()} aria-label="Couper le son" title="Volume" className="focus-ring grid h-9 w-9 place-items-center rounded-full text-inksoft transition hover:bg-surface2 hover:text-ink">
                  <Icon name={state.muted || state.volume === 0 ? "volumeX" : "volume"} className="h-[18px] w-[18px]" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={state.muted ? 0 : state.volume}
                  onChange={(e) => engine.setVolume(Number(e.target.value))}
                  aria-label="Volume"
                  style={{ ["--fill" as string]: `${(state.muted ? 0 : state.volume) * 100}%` }}
                  className="h-4 w-20"
                />
              </div>

              <button
                onClick={() => user && toggleFavorite(track.id)}
                aria-label="Ajouter aux favoris"
                title="Ajouter aux favoris"
                className={cn("focus-ring hidden h-9 w-9 place-items-center rounded-full transition lg:grid", fav ? "text-[var(--danger)]" : "text-inksoft hover:text-ink")}
              >
                <Icon name="heart" className="h-[18px] w-[18px]" strokeWidth={fav ? 0 : 1.7} />
              </button>

              <button
                onClick={() => setExpanded(true)}
                aria-label="Plein écran"
                title="Plein écran"
                data-testid="player-fullscreen"
                className="focus-ring hidden h-9 w-9 place-items-center rounded-full border border-line text-inksoft transition hover:text-ink lg:grid"
              >
                <Icon name="expand" className="h-4 w-4" />
              </button>

              <button
                onClick={() => engine.toggle()}
                aria-label={state.playing ? "Pause" : "Lecture"}
                className="focus-ring btn-accent grid h-10 w-10 place-items-center rounded-full lg:hidden"
              >
                {state.loading ? (
                  <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent spin-slow" />
                ) : (
                  <Icon name={state.playing ? "pause" : "play"} className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => setExpanded(true)}
                aria-label="Agrandir le lecteur"
                className="focus-ring grid h-10 w-10 place-items-center rounded-full text-inksoft lg:hidden"
              >
                <Icon name="chevronDown" className="h-5 w-5 rotate-180" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
