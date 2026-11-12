import type { Work } from "./types";

/* ============================================================
   Lecteur persistant SOLDE gallery
   ------------------------------------------------------------
   Le moteur vit HORS de l'arbre React : un seul <audio> est créé
   pour toute la session, la navigation inter-pages ne le démonte
   jamais. La lecture s'interrompt au rechargement manuel ou à la
   fermeture de l'onglet (limite assumée du prototype local).

   NOTE TECHNIQUE — LECTURE EN ARRIÈRE-PLAN (V2)
   Pour conserver la lecture écran verrouillé et afficher les
   commandes dans le panneau média de l'OS, il faudra :
     1. packager la V1 en PWA (manifest + service worker, cache des
        médias et des couvertures) ;
     2. brancher l'API MediaSession :
        navigator.mediaSession.metadata = new MediaMetadata({...})
        navigator.mediaSession.setActionHandler('play'|'pause'|
        'previoustrack'|'nexttrack'|'seekto', ...) ;
     3. pour une application mobile native (Capacitor / React Native),
        déléguer la lecture à un service audio d'avant-plan
        (Foreground Service Android / AVAudioSession iOS) afin que le
        panneau média OS et les commandes au casque pilotent ce même
        moteur. Le composant <Player/> est déjà découplé : seul
        `engine` serait remplacé par l'implémentation native.
   ============================================================ */

type Listener = () => void;

export type RepeatMode = "loop" | "shuffle" | "single";

/* Pré-écoute publique : 8 secondes maximum pour les pistes non acquises. */
export const PREVIEW_SECONDS = 8;
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export interface PlayerState {
  track: Work | null;
  playing: boolean;
  loading: boolean;
  error: string | null;
  queue: Work[];
  index: number;
  volume: number;
  muted: boolean;
  rate: number;
  repeatMode: RepeatMode;
  previewLimited: boolean;
  previewLimit: number;
  previewEnded: boolean;
}

const cache = new Map<string, string>();

/* --- Générateur déterministe : la piste de démonstration est
   synthétisée localement (aucun serveur, aucun fichier distant). --- */
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function encodeWav(samples: Float32Array, rate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  str(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    o += 2;
  }
  return new Blob([view], { type: "audio/wav" });
}

/** Petite composition créole-ambient : pad d'accords, basse, mélodie pentatonique, percussions. */
function synthesize(seed: number, duration: number) {
  const rate = 22050;
  const n = Math.floor(rate * duration);
  const out = new Float32Array(n);
  const rnd = mulberry32(seed * 977 + 13);
  const bpm = 76 + (seed % 5) * 6;
  const beat = 60 / bpm;
  const root = 174.61 * (seed % 3 === 0 ? 1 : seed % 3 === 1 ? 1.122 : 0.891);
  const chords = [
    [0, 3, 7, 10],
    [-4, 0, 5, 8],
    [-2, 2, 5, 9],
    [-5, -1, 2, 7],
  ];
  const penta = [0, 2, 3, 5, 7, 10, 12];
  const semi = (s: number) => Math.pow(2, s / 12);
  let lp = 0;
  let delayIdx = 0;
  const delay = new Float32Array(Math.floor(rate * 0.28));

  // Pré-calcul des notes par demi-temps : évite deux allocations par échantillon
  const eighths = Math.ceil(duration / (beat / 2)) + 2;
  const noteOn = new Uint8Array(eighths);
  const noteFreq = new Float32Array(eighths);
  for (let e = 0; e < eighths; e++) {
    const r1 = mulberry32(seed * 31 + e)();
    const r2 = mulberry32(seed * 17 + e)();
    noteOn[e] = r1 > 0.34 ? 1 : 0;
    noteFreq[e] = root * 2 * semi(penta[Math.floor(r2 * penta.length)]);
  }

  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const barPos = (t / (beat * 4)) % 4;
    const chord = chords[Math.floor(barPos)];
    const beatPhase = (t % beat) / beat;
    const eighth = Math.floor(t / (beat / 2));

    // pad
    let s = 0;
    for (let c = 0; c < chord.length; c++) {
      const f = root * semi(chord[c]);
      s += Math.sin(2 * Math.PI * f * t) * 0.055;
      s += Math.sin(2 * Math.PI * f * 2 * t + c) * 0.018;
    }
    // basse
    const bf = (root / 2) * semi(chord[0]);
    s += Math.sin(2 * Math.PI * bf * t) * 0.16 * Math.exp(-beatPhase * 2.4);
    // mélodie (une note par demi-temps, tenue)
    if (noteOn[eighth]) {
      const mf = noteFreq[eighth];
      const ph = (t % (beat / 2)) / (beat / 2);
      const env = Math.min(1, ph * 12) * Math.exp(-ph * 3.1);
      s += (Math.sin(2 * Math.PI * mf * t) * 0.6 + Math.sin(2 * Math.PI * mf * 3 * t) * 0.12) * env * 0.1;
    }
    // percussions
    const kickPhase = t % (beat * 2);
    if (kickPhase < 0.16) {
      const k = kickPhase / 0.16;
      s += Math.sin(2 * Math.PI * (58 + 60 * Math.exp(-k * 18)) * kickPhase) * Math.exp(-k * 6) * 0.3;
    }
    const hatPhase = t % (beat / 2);
    if (hatPhase < 0.03) s += (rnd() * 2 - 1) * Math.exp(-(hatPhase / 0.03) * 5) * 0.045;

    // fondu global + filtre doux + écho
    const fade = Math.min(1, t / 2.5) * Math.min(1, (duration - t) / 3);
    lp += (s - lp) * 0.28;
    const echo = delay[delayIdx] * 0.26;
    delay[delayIdx] = lp;
    delayIdx = (delayIdx + 1) % delay.length;
    out[i] = (lp + echo) * fade * 0.9;
  }
  return encodeWav(out, rate);
}

const PLAYER_PREFS_KEY = "solde.gallery.player.v1";

class Engine {
  audio: HTMLAudioElement;
  state: PlayerState = {
    track: null,
    playing: false,
    loading: false,
    error: null,
    queue: [],
    index: 0,
    volume: 0.7,
    muted: false,
    rate: 1,
    repeatMode: "loop",
    previewLimited: false,
    previewLimit: PREVIEW_SECONDS,
    previewEnded: false,
  };
  private listeners = new Set<Listener>();
  /* Droit d'écoute intégrale fourni par l'interface (propriété/achat).
     Sans résolveur, les pistes payantes restent bridées par prudence. */
  private accessResolver: ((work: Work) => boolean) | null = null;
  private shuffleHistory: number[] = [];

  constructor() {
    this.audio = typeof Audio !== "undefined" ? new Audio() : ({ addEventListener: () => {} } as unknown as HTMLAudioElement);
    try {
      const raw = localStorage.getItem(PLAYER_PREFS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Pick<PlayerState, "rate" | "repeatMode">>;
        if (typeof saved.rate === "number" && saved.rate >= 0.25 && saved.rate <= 3) this.state.rate = saved.rate;
        if (saved.repeatMode === "loop" || saved.repeatMode === "shuffle" || saved.repeatMode === "single") {
          this.state.repeatMode = saved.repeatMode;
        }
      }
    } catch {
      /* préférences indisponibles : valeurs par défaut */
    }
    if (this.audio instanceof HTMLAudioElement) {
      this.audio.preload = "auto";
      this.audio.playbackRate = this.state.rate;
      this.audio.addEventListener("ended", () => this.handleEnded());
      this.audio.addEventListener("timeupdate", () => this.enforcePreviewLimit());
      this.audio.addEventListener("play", () => this.patch({ playing: true }));
      this.audio.addEventListener("pause", () => this.patch({ playing: false }));
      this.audio.addEventListener("error", () =>
        this.patch({ playing: false, loading: false, error: "Lecture impossible sur ce navigateur. Réessayez." }),
      );
    }
  }

  subscribe = (fn: Listener) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getSnapshot = () => this.state;
  private patch(p: Partial<PlayerState>) {
    this.state = { ...this.state, ...p };
    this.listeners.forEach((l) => l());
  }

  get time() {
    return this.audio.currentTime || 0;
  }
  get duration() {
    const d = this.audio.duration;
    return Number.isFinite(d) && d > 0 ? d : this.state.track?.duration ?? 0;
  }

  /** `work.audioUrl` (fichier .mp3 réel) est prioritaire ; sinon piste synthétisée. */
  private async sourceFor(work: Work) {
    const custom = (work as Work & { audioUrl?: string }).audioUrl;
    if (custom) return custom;
    const key = `${work.id}:${work.synthSeed ?? 1}`;
    const hit = cache.get(key);
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 20));
    const url = URL.createObjectURL(synthesize(work.synthSeed ?? 3, work.duration ?? 90));
    cache.set(key, url);
    return url;
  }

  /* Pont restrictif : l'écoute intégrale exige un accès (achat, gratuité,
     auteur ou admin). Les pistes non MP3 et gratuites restent libres. */
  setAccessResolver(fn: ((work: Work) => boolean) | null) {
    this.accessResolver = fn;
  }

  private canPlayFull(work: Work): boolean {
    if (!work || work.kind !== "mp3") return true;
    if ((work.price ?? 0) <= 0) return true;
    if (!this.accessResolver) return false;
    try {
      return !!this.accessResolver(work);
    } catch {
      return false;
    }
  }

  /* Recalcule le droit du titre en cours (ex. juste après un achat),
     sans recharger la piste ni couper le lecteur. */
  refreshPreviewAccess() {
    const track = this.state.track;
    if (!track) return;
    const limited = !this.canPlayFull(track);
    if (!limited && this.state.previewLimited) {
      this.patch({ previewLimited: false, previewEnded: false });
      return;
    }
    if (limited && !this.state.previewLimited) {
      this.patch({ previewLimited: true, previewLimit: PREVIEW_SECONDS });
      this.enforcePreviewLimit();
    }
  }

  /* Verrou des 8 secondes : interruption propre + invitation à acquérir. */
  private enforcePreviewLimit() {
    if (!this.state.previewLimited || this.state.previewEnded) return;
    if (!(this.audio instanceof HTMLAudioElement)) return;
    const limit = this.state.previewLimit;
    if (this.audio.currentTime >= limit - 0.05) {
      this.audio.currentTime = Math.min(this.audio.currentTime, limit);
      this.audio.pause();
      this.patch({ playing: false, previewEnded: true });
    }
  }

  private persistPlayerPrefs() {
    try {
      localStorage.setItem(PLAYER_PREFS_KEY, JSON.stringify({ rate: this.state.rate, repeatMode: this.state.repeatMode }));
    } catch {
      /* stockage indisponible */
    }
  }

  private pickShuffleIndex(exclude: number, length: number): number {
    if (length <= 1) return 0;
    let n = exclude;
    let guard = 0;
    while (n === exclude && guard++ < 12) n = Math.floor(Math.random() * length);
    return n;
  }

  private handleEnded() {
    if (this.state.previewLimited) return; // l'aperçu se termine en pause, sans enchaîner
    if (this.state.repeatMode === "single") {
      this.audio.currentTime = 0;
      this.patch({ playing: false });
      this.listeners.forEach((l) => l());
      return;
    }
    if (this.state.repeatMode === "shuffle") {
      const { queue, index } = this.state;
      if (!queue.length) return;
      const n = this.pickShuffleIndex(index, queue.length);
      this.shuffleHistory.push(n);
      const w = queue[n];
      if (w) void this.play(w, queue);
      return;
    }
    this.next();
  }

  async play(work: Work, queue?: Work[]) {
    const q = queue && queue.length ? queue : [work];
    const index = Math.max(0, q.findIndex((w) => w.id === work.id));
    if (this.state.track?.id === work.id && this.audio.src) {
      const limited = !this.canPlayFull(work);
      this.patch({ queue: q, index, previewLimited: limited, previewLimit: PREVIEW_SECONDS, previewEnded: false });
      if (limited) this.shuffleHistory = [index];
      return this.toggle();
    }
    const limited = !this.canPlayFull(work);
    this.shuffleHistory = [index];
    this.patch({ track: work, queue: q, index, loading: true, error: null, playing: false, previewLimited: limited, previewLimit: PREVIEW_SECONDS, previewEnded: false });
    try {
      const src = await this.sourceFor(work);
      if (this.state.track?.id !== work.id) return; // l'utilisateur a changé de titre entre-temps
      this.audio.src = src;
      this.audio.playbackRate = this.state.rate;
      this.audio.volume = this.state.muted ? 0 : this.state.volume;
      await this.audio.play();
      this.patch({ loading: false, playing: true });
    } catch {
      this.patch({ loading: false, playing: false, error: "Audio indisponible. Cliquez à nouveau sur Écouter." });
    }
  }

  toggle() {
    if (!this.state.track) return;
    if (this.state.previewLimited && this.state.previewEnded && this.audio.paused) {
      this.audio.currentTime = 0;
      this.patch({ previewEnded: false });
    }
    if (this.audio.paused) {
      this.audio.play().catch(() => this.patch({ error: "Lecture bloquée par le navigateur." }));
    } else {
      this.audio.pause();
    }
  }

  next() {
    const { queue, index } = this.state;
    if (!queue.length) return;
    if (this.state.repeatMode === "shuffle") {
      const n = this.pickShuffleIndex(index, queue.length);
      this.shuffleHistory.push(n);
      const w = queue[n];
      if (w) void this.play(w, queue);
      return;
    }
    const n = (index + 1) % queue.length;
    const w = queue[n];
    if (w) void this.play(w, queue);
  }
  prev() {
    const { queue, index } = this.state;
    if (!queue.length) return;
    if (this.audio.currentTime > 3) return this.seek(0);
    if (this.state.repeatMode === "shuffle" && this.shuffleHistory.length > 1) {
      this.shuffleHistory.pop();
      const n = this.shuffleHistory[this.shuffleHistory.length - 1] ?? 0;
      const w = queue[n];
      if (w) void this.play(w, queue);
      return;
    }
    const n = (index - 1 + queue.length) % queue.length;
    const w = queue[n];
    if (w) void this.play(w, queue);
  }
  seek(t: number) {
    if (!Number.isFinite(t)) return;
    if (this.state.previewLimited) {
      const limit = this.state.previewLimit;
      const clamped = Math.max(0, Math.min(t, limit));
      this.audio.currentTime = clamped;
      if (clamped >= limit - 0.05) {
        this.audio.pause();
        this.patch({ playing: false, previewEnded: true });
      } else if (this.state.previewEnded) {
        this.patch({ previewEnded: false });
      }
      this.listeners.forEach((l) => l());
      return;
    }
    this.audio.currentTime = Math.max(0, Math.min(t, this.duration || t));
    this.listeners.forEach((l) => l());
  }

  setRate(v: number) {
    const rate = Math.max(0.25, Math.min(3, v));
    this.audio.playbackRate = rate;
    this.patch({ rate });
    this.persistPlayerPrefs();
  }

  setRepeatMode(mode: RepeatMode) {
    if (mode === "shuffle") this.shuffleHistory = [this.state.index];
    this.patch({ repeatMode: mode });
    this.persistPlayerPrefs();
  }

  removeFromQueue(workId: string) {
    const { queue, index, track } = this.state;
    const idx = queue.findIndex((w) => w.id === workId);
    if (idx < 0 || idx === index) return; // le titre en cours reste verrouillé
    const next = queue.filter((w) => w.id !== workId);
    this.patch({ queue: next, index: idx < index ? index - 1 : index });
    this.shuffleHistory = this.shuffleHistory.filter((i) => i !== idx).map((i) => (i > idx ? i - 1 : i));
    void track;
  }

  moveInQueue(from: number, to: number) {
    const { queue, index } = this.state;
    if (from < 0 || to < 0 || from >= queue.length || to >= queue.length || from === to) return;
    const next = [...queue];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    let nIndex = index;
    if (from === index) nIndex = to;
    else if (from < index && to >= index) nIndex = index - 1;
    else if (from > index && to <= index) nIndex = index + 1;
    this.patch({ queue: next, index: nIndex });
  }

  clearQueue() {
    const { track } = this.state;
    this.shuffleHistory = [0];
    this.patch({ queue: track ? [track] : [], index: 0 });
  }
  setVolume(v: number) {
    const vol = Math.max(0, Math.min(1, v));
    this.audio.volume = vol;
    this.patch({ volume: vol, muted: vol === 0 });
  }
  toggleMute() {
    const m = !this.state.muted;
    this.audio.volume = m ? 0 : this.state.volume || 0.6;
    this.patch({ muted: m });
  }
  /* Stop : pause immédiate + retour à zéro, le titre reste chargé. */
  stopPlayback() {
    this.audio.pause();
    try {
      this.audio.currentTime = 0;
    } catch {
      /* flux non positionnable */
    }
    this.patch({ playing: false, previewEnded: false });
    this.listeners.forEach((l) => l());
  }

  stop() {
    this.audio.pause();
    this.patch({ playing: false, track: null, queue: [], index: 0, previewLimited: false, previewEnded: false });
  }
}

export const engine = new Engine();

export const fmtTime = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
};

/** Module en attente — extrait vidéo de 10 secondes (V2).
   La V1 n'expose qu'une vignette statique pour les fichiers vidéo. */
export const videoPreviewModule = {
  enabled: false,
  seconds: 10,
  status: "placeholder" as const,
  describe: () => "Extrait de 10 s — module en attente (transcodage serveur requis en V2)",
};
