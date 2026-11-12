import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui-context";
import {
  CATEGORIES,
  CATEGORY_FILE_KINDS,
  KIND_LABELS,
  MIN_WITHDRAWAL,
  PREMIUM_MONTH,
  PREMIUM_YEAR,
  PROMO_PRICE,
  TRADES,
  commissionRate,
  htg,
  isPremium,
} from "../lib/types";
import type { CategoryId, FileKind, Trade, Work } from "../lib/types";
import { TEST_PROFILES } from "../lib/seed";
import { engine } from "../lib/audio";
import { hasSufficientBalance, INSUFFICIENT_BALANCE_MESSAGE } from "../lib/transaction-guard";
import { downloadDemoFile } from "../lib/demo-download";
import { Avatar, Button, Chip, Field, Icon, Modal, Tag, inputCls } from "./ui";
import { Cover, KindBadge } from "./Cover";
import { makeTr } from "../lib/l10n";
import { DirectMessageModal } from "./Messages";
import { cn } from "../utils/cn";

/* Téléchargement simulé : on produit un fichier texte local portant
   la licence nominative, aucune ressource serveur n'est appelée. */
export function downloadLicence(fileName: string, title: string, buyer: string, ref: string) {
  const body = [
    "SOLDE gallery — FICHIER DE DÉMONSTRATION",
    "=========================================",
    `Œuvre : ${title}`,
    `Fichier d'origine : ${fileName}`,
    `Licence nominative attribuée à : ${buyer}`,
    `Référence de transaction : ${ref}`,
    `Date : ${new Date().toLocaleString("fr-FR")}`,
    "",
    "Licence d'utilisation nominative, personnelle et non transférable.",
    "Toute rediffusion, revente ou usage commercial nécessite l'accord écrit du créateur.",
    "",
    "Prototype local : aucun paiement réel n'a été effectué, aucun média n'est distribué.",
  ].join("\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName.replace(/\.[^.]+$/, "")}-licence-SOLDE.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* MODULE Détection automatique d'opérateur — aucun choix manuel :
   NATCOM (NatCash) : préfixes 32 33 40 41 42 43 55 22
   DIGICEL (MonCash) : tout numéro commençant par 3 ou 4 hors
   des préfixes Natcom. Le logo correspondant s'allume dès les
   premiers chiffres saisis. */
const NATCOM_PREFIXES = ["32", "33", "40", "41", "42", "43", "55", "22"];

function detectOperator(phoneRaw: string): "natcom" | "digicel" | null {
  const d = phoneRaw.replace(/\D/g, "");
  if (d.length < 2) return null;
  if (NATCOM_PREFIXES.includes(d.slice(0, 2))) return "natcom";
  if (d[0] === "3" || d[0] === "4") return "digicel";
  return null;
}

function OperatorChip({ active, name, dot }: { active: boolean; name: string; dot: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all duration-200",
        active ? "scale-105 border-accent bg-accentsoft text-ink shadow-[var(--shadow-sm)]" : "border-line text-muted opacity-40 grayscale",
      )}
    >
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot }} />
      {name}
    </span>
  );
}

function DemoBanner() {
  return (
    <div
      className="mb-4 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-bold tracking-wide text-white"
      style={{ background: "linear-gradient(90deg, #c8232c, #8f1119)" }}
    >
      <Icon name="alert" className="h-4 w-4" />
      Démonstration — Aucun paiement réel
    </div>
  );
}

function Recap({
  amount,
  rate,
  recipient,
  label = "Montant",
  hideBreakdown,
}: {
  amount: number;
  rate: number;
  recipient: string;
  label?: string;
  hideBreakdown?: boolean;
}) {
  const commission = Math.round(amount * rate * 100) / 100;
  /* Confidentialité acheteur/donateur : aucun pourcentage ni ventilation
     des frais n'est affiché. Seul le montant choisi est confirmé. */
  if (hideBreakdown)
    return (
      <div className="rounded-2xl border border-line bg-surface2 p-4">
        <p className="mb-3 text-[11px] font-bold tracking-[0.16em] text-muted uppercase">Récapitulatif</p>
        <div className="flex items-baseline justify-between">
          <span className="font-display text-[15px] font-semibold text-ink">Montant à confirmer</span>
          <span className="font-display text-2xl font-semibold text-accent">{htg(amount)}</span>
        </div>
      </div>
    );
  return (
    <div className="rounded-2xl border border-line bg-surface2 p-4">
      <p className="mb-3 text-[11px] font-bold tracking-[0.16em] text-muted uppercase">Récapitulatif</p>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">{label}</dt>
          <dd className="font-semibold text-ink">{htg(amount)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">
            Commission plateforme ({(rate * 100).toFixed(2).replace(".", ",")} %)
          </dt>
          <dd className={cn("font-semibold", commission === 0 ? "text-success" : "text-ink")}>{htg(commission)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Frais opérateur (simulés)</dt>
          <dd className="font-semibold text-ink">0 HTG</dd>
        </div>
        <div className="hairline my-2" />
        <div className="flex justify-between">
          <dt className="text-muted">Reversé à {recipient}</dt>
          <dd className="font-semibold text-success">{htg(amount - commission)}</dd>
        </div>
        <div className="flex items-baseline justify-between pt-1">
          <dt className="font-display text-[15px] font-semibold text-ink">Total débité</dt>
          <dd className="font-display text-2xl font-semibold text-accent">{htg(amount)}</dd>
        </div>
      </dl>
      <p className="mt-3 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-muted">
        <Icon name="info" className="mt-px h-3.5 w-3.5 shrink-0" />
        {rate === 0
          ? "Créateur Premium : 0 % de commission, il conserve 100 % de ses gains directs."
          : "Compte Basique : 3,75 % crédités sur le wallet de la plateforme."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------
   Flux OTP mutualisé (achat, don, Premium, promotion).
   Séquence : récapitulatif → traitement (anti-double débit) → code
   universel 0000 → validation → crédit des wallets fictifs.
   ------------------------------------------------------------------ */
type Step = "recap" | "otp" | "done";

function OtpFlow({
  amount,
  rate,
  recipient,
  cta,
  successTitle,
  successBody,
  onValidate,
  downloadLabel,
  onDownload,
  skipPhone,
  extra,
  hideBreakdown,
  requirePositiveAmount,
}: {
  hideBreakdown?: boolean;
  requirePositiveAmount?: boolean;
  amount: number;
  rate: number;
  recipient: string;
  cta: string;
  successTitle: string;
  successBody: string;
  onValidate: () => boolean;
  downloadLabel?: string;
  onDownload?: () => string;
  skipPhone?: boolean;
  extra?: React.ReactNode;
}) {
  const { user } = useStore();
  const [step, setStep] = useState<Step>(skipPhone ? "otp" : "recap");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const lock = useRef(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const invalidAmount = !Number.isFinite(amount) || amount < 0 || (!!requirePositiveAmount && amount === 0);
  const insufficient = !invalidAmount && !hasSufficientBalance(user?.wallet, amount);
  const blocked = invalidAmount || insufficient;
  const message = insufficient
    ? INSUFFICIENT_BALANCE_MESSAGE
    : invalidAmount
      ? "Veuillez indiquer un montant valide supérieur à 0 HTG."
      : error;

  const start = () => {
    if (lock.current) return;
    if (blocked) return;
    if (!skipPhone && !/^(\+?509)?\s?[34]\d{3}\s?\d{4}$/.test(phone.trim())) {
      setError("Numéro invalide. Format attendu : 3701 2345 (8 chiffres, Haïti).");
      return;
    }
    setError(null);
    lock.current = true;
    setBusy(true);
    timers.current.push(
      window.setTimeout(() => {
        setBusy(false);
        lock.current = false;
        setStep("otp");
      }, 1400),
    );
  };

  const validate = () => {
    if (lock.current) return;
    if (blocked) return;
    if (code.trim() !== "0000") {
      setError("Code incorrect. Le code de démonstration universel est 0000.");
      return;
    }
    setError(null);
    lock.current = true;
    setBusy(true);
    timers.current.push(
      window.setTimeout(() => {
        const succeeded = onValidate();
        setBusy(false);
        lock.current = false;
        if (!succeeded) {
          setError(INSUFFICIENT_BALANCE_MESSAGE);
          return;
        }
        setStep("done");
      }, 1100),
    );
  };

  if (step === "done")
    return (
      <div className="text-center">
        <div className="pulse-ring mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/12 text-success">
          <Icon name="check" className="h-8 w-8" strokeWidth={2.4} />
        </div>
        <h3 className="mt-4 font-display text-xl font-semibold text-ink">{successTitle}</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">{successBody}</p>
        {downloadLabel && onDownload && (
          <Button
            className="mt-5 w-full"
            icon="download"
            onClick={() => {
              try {
                setDownloadStatus(`Document ouvert dans un onglet et téléchargé : ${onDownload()}`);
              } catch {
                setDownloadStatus("Le téléchargement n'a pas pu être lancé. Veuillez réessayer.");
              }
            }}
          >
            {downloadLabel}
          </Button>
        )}
        {downloadStatus && (
          <p role="status" className="mt-3 flex items-center justify-center gap-1.5 text-[12.5px] font-medium text-success">
            <Icon name="check" className="h-3.5 w-3.5" /> {downloadStatus}
          </p>
        )}
        {downloadLabel && !downloadStatus && (
          <p className="mt-2 text-[11.5px] text-muted">
            Le clic ouvre le document de démonstration dans un onglet et le télécharge ; il contient votre licence
            nominative, l'œuvre originale n'est pas incluse.
          </p>
        )}
        <p className="mt-4 text-[11.5px] text-muted">
          Transaction enregistrée dans l'historique local · aucune donnée n'a quitté ce navigateur.
        </p>
      </div>
    );

  return (
    <div>
      <DemoBanner />
      {step === "recap" ? (
        <>
          {extra}
          <Recap amount={amount} rate={rate} recipient={recipient} hideBreakdown={hideBreakdown} />
          <div className="mt-3 flex items-center justify-between text-[13px] text-muted">
            <span>Solde disponible</span>
            <span className="font-semibold text-ink">{htg(user?.wallet ?? 0)}</span>
          </div>
          <div className="mt-4">
            <Field label="Numéro de téléphone (simulation)" hint="+509">
              <input
                className={inputCls}
                inputMode="tel"
                placeholder="3701 2345"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={busy}
              />
            </Field>
            {/* Détection automatique de l'opérateur, instantanée */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10.5px] font-bold tracking-[0.14em] text-muted uppercase">Opérateur</span>
              <OperatorChip active={detectOperator(phone) === "digicel"} name="MonCash" dot="#0aa38e" />
              <OperatorChip active={detectOperator(phone) === "natcom"} name="NatCash" dot="#e53935" />
            </div>
          </div>
          {message && (
            <p role="alert" className="mt-3 flex items-center gap-1.5 text-[12.5px] font-medium text-danger">
              <Icon name="alert" className="h-4 w-4" /> {message}
            </p>
          )}
          <Button className="mt-4 w-full" size="lg" loading={busy} disabled={blocked} onClick={start}>
            {busy ? "Traitement…" : `${cta} · ${htg(amount)}`}
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted">
            Le bouton se verrouille pendant le traitement pour éviter tout double débit.
          </p>
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-line bg-surface2 p-4 text-center">
            <p className="text-[13px] text-muted">
              Un code a été envoyé au numéro <span className="font-semibold text-ink">{phone || "3701 2345"}</span>
            </p>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="••••"
              disabled={busy}
              className="focus-ring mt-3 w-40 rounded-xl border border-linestrong bg-surface py-3 text-center font-display text-3xl tracking-[0.5em] text-ink outline-none focus:border-accent"
            />
            <p className="mt-3 text-[12px] font-semibold text-accent">Code de démonstration universel : 0000</p>
            <button
              onClick={() => setCode("0000")}
              className="focus-ring mt-1 text-[11.5px] text-muted underline underline-offset-4 hover:text-ink"
            >
              Pré-remplir le code
            </button>
          </div>
          {message && (
            <p role="alert" className="mt-3 flex items-center gap-1.5 text-[12.5px] font-medium text-danger">
              <Icon name="alert" className="h-4 w-4" /> {message}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5 text-sm">
            <span className="text-muted">Total à débiter</span>
            <span className="font-display text-lg font-semibold text-accent">{htg(amount)}</span>
          </div>
          <Button className="mt-4 w-full" size="lg" loading={busy} disabled={blocked} onClick={validate}>
            {busy ? "Traitement…" : "Valider la transaction"}
          </Button>
          {!skipPhone && (
            <button
              onClick={() => setStep("recap")}
              className="focus-ring mt-2 w-full text-[12px] text-muted hover:text-ink"
            >
              Modifier le numéro
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Auth / Onboarding ---------------- */
function AuthModal({ mode, reason }: { mode: "login" | "signup"; reason?: string }) {
  const { close } = useUI();
  const { login, register, notify, db } = useStore();
  const [tab, setTab] = useState(mode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [isCreator, setIsCreator] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [interests, setInterests] = useState<CategoryId[]>([]);
  const [err, setErr] = useState<Record<string, string>>({});

  const submit = () => {
    const e: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) e.email = "Une adresse e-mail valide est obligatoire.";
    if (tab === "signup" && name.trim().length < 3) e.name = "Indiquez votre nom public (3 caractères minimum).";
    if (tab === "signup" && isCreator && trades.length === 0) e.trades = "Sélectionnez au moins un métier.";
    setErr(e);
    if (Object.keys(e).length) return;
    if (tab === "login") {
      const found = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!found) {
        setErr({ email: "Aucun compte local avec cet e-mail. Utilisez un profil de test ou inscrivez-vous." });
        return;
      }
      login(found.id);
      notify({ title: `Bienvenue, ${found.name.split(" ")[0]}`, body: "Session locale ouverte.", tone: "success" });
    } else {
      const u = register({ name, email, city, isCreator, trades, interests });
      notify({
        title: "Compte créé",
        body: isCreator ? `${u.name} · studio ouvert` : `${u.name} · compte lecteur`,
        tone: "success",
      });
    }
    close();
  };

  const toggleTrade = (t: Trade) => {
    setTrades((cur) => {
      if (cur.includes(t)) return cur.filter((x) => x !== t);
      if (cur.length >= 5) {
        notify({ title: "Maximum 5 métiers", body: "Retirez un badge avant d'en ajouter un autre.", tone: "warn" });
        return cur;
      }
      return [...cur, t];
    });
  };

  return (
    <Modal
      open
      onClose={close}
      width="max-w-xl"
      title={tab === "login" ? "Connexion locale" : "Rejoindre SOLDE gallery"}
      subtitle="Simulation propre à ce navigateur — aucun serveur, aucune donnée transmise."
    >
      {/* Modale d'interposition : invite à créer un compte Basique avant une action protégée */}
      {reason && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-accent/40 bg-accentsoft p-3.5 text-[13px] leading-relaxed text-ink">
          <Icon name="chat" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <span>{reason}</span>
        </div>
      )}
      <div className="mb-5 flex gap-2 rounded-full border border-line bg-surface2 p-1">
        {(["login", "signup"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "focus-ring flex-1 rounded-full py-2 text-[13px] font-semibold transition",
              tab === k ? "bg-accent text-accentink shadow-[var(--shadow-sm)]" : "text-muted hover:text-ink",
            )}
          >
            {k === "login" ? "J'ai un compte" : "Créer un compte"}
          </button>
        ))}
      </div>

      {tab === "login" && (
        <div className="mb-5">
          <p className="mb-2.5 text-[11px] font-bold tracking-[0.16em] text-muted uppercase">Profils de test</p>
          <div className="space-y-2">
            {TEST_PROFILES.map((p) => {
              const u = db.users.find((x) => x.id === p.id)!;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    login(p.id);
                    notify({ title: `Profil actif : ${u.name}`, body: p.note, tone: "success" });
                    close();
                  }}
                  className="focus-ring flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition hover:border-accent hover:bg-accentsoft"
                >
                  <Avatar name={u.name} hue={u.hue} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{u.name}</span>
                    <span className="block truncate text-[12px] text-muted">
                      {p.label} · {p.note}
                    </span>
                  </span>
                  {isPremium(u) && <Tag color="var(--gold)">Premium</Tag>}
                  <Icon name="arrowRight" className="h-4 w-4 text-muted" />
                </button>
              );
            })}
          </div>
          <div className="my-4 flex items-center gap-3">
            <span className="hairline flex-1" />
            <span className="text-[11px] tracking-widest text-muted uppercase">ou par e-mail</span>
            <span className="hairline flex-1" />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {tab === "signup" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom public" error={err.name}>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom d'artiste ou nom complet" />
            </Field>
            <Field label="Ville" hint="facultatif">
              <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Port-au-Prince" />
            </Field>
          </div>
        )}
        <Field label="Adresse e-mail" hint="obligatoire" error={err.email}>
          <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.ht" />
        </Field>

        {tab === "signup" && (
          <>
            <button
              onClick={() => setIsCreator((v) => !v)}
              className={cn(
                "focus-ring flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition",
                isCreator ? "border-accent bg-accentsoft" : "border-line bg-surface hover:border-linestrong",
              )}
            >
              <span
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-md border transition",
                  isCreator ? "border-accent bg-accent text-accentink" : "border-linestrong",
                )}
              >
                {isCreator && <Icon name="check" className="h-4 w-4" strokeWidth={3} />}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-ink">Je veux aussi publier des œuvres</span>
                <span className="block text-[12px] text-muted">
                  Facultatif — un compte lecteur suffit pour acheter, soutenir et collectionner.
                </span>
              </span>
            </button>

            {isCreator && (
              <Field label="Badges de métier" hint={`${trades.length}/5 maximum`} error={err.trades}>
                <div className="flex flex-wrap gap-2 pt-1">
                  {TRADES.map((t) => (
                    <Chip key={t} active={trades.includes(t)} onClick={() => toggleTrade(t)}>
                      {t}
                    </Chip>
                  ))}
                </div>
              </Field>
            )}

            <Field label="Centres d'intérêt" hint="aucune limite">
              <div className="flex flex-wrap gap-2 pt-1">
                {CATEGORIES.map((c) => (
                  <Chip
                    key={c.id}
                    active={interests.includes(c.id)}
                    onClick={() =>
                      setInterests((cur) => (cur.includes(c.id) ? cur.filter((x) => x !== c.id) : [...cur, c.id]))
                    }
                  >
                    {c.fr}
                  </Chip>
                ))}
              </div>
            </Field>
          </>
        )}
      </div>

      <Button className="mt-6 w-full" size="lg" onClick={submit}>
        {tab === "login" ? "Ouvrir ma session locale" : "Créer mon compte"}
      </Button>
      <p className="mt-3 text-center text-[11.5px] leading-relaxed text-muted">
        Les comptes, paniers, wallets et favoris sont stockés dans le localStorage de ce navigateur et disparaissent
        si vous effacez ses données.
      </p>
    </Modal>
  );
}

/* ---------------- Fiche œuvre ---------------- */
function WorkModal({ id, museumId, source }: { id: string; museumId?: string; source?: import("../lib/click-analytics").ClickSource }) {
  const { close, open, navigate } = useUI();
  const { workById, userById, user, db, toggleFavorite, favoritesOf, purchasesOf, notify, deleteWork } = useStore();
  const work = workById(id);
  if (!work) return null;
  const creator = userById(work.creatorId);
  const owned = user ? purchasesOf(user.id).some((p) => p.workId === work.id) : false;
  const mine = user?.id === work.creatorId;
  const fav = user ? favoritesOf(user.id).includes(work.id) : false;
  const masked = !!work.confidential && !owned && !mine;

  return (
    <Modal open onClose={close} width="max-w-4xl" title={work.title} subtitle={`${creator?.name} · ${work.subtitle}`}>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="group overflow-hidden rounded-2xl border border-line">
            <Cover work={work} creatorName={creator?.name ?? ""} className="aspect-[4/3] w-full" watermarkSize={44} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <KindBadge kind={work.kind} />
            {work.tags.map((t) => (
              <Tag key={t} color="var(--muted)">
                {t}
              </Tag>
            ))}
            <Tag color="var(--info)">{work.fileSize}</Tag>
          </div>

          <h3 className="mt-5 font-display text-lg font-semibold text-ink">Description</h3>
          <p className="mt-2 text-[14.5px] leading-relaxed text-inksoft">{work.description}</p>

          {work.kind === "mp4" && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-line bg-surface2 p-3.5 text-[12.5px] text-muted">
              <Icon name="info" className="mt-px h-4 w-4 shrink-0 text-info" />
              <span>
                Les fichiers vidéo n'exposent qu'une <strong className="text-ink">image statique</strong> dans la V1.
                L'extrait de 10 secondes est préparé côté module, en attente de transcodage (V2).
              </span>
            </div>
          )}

          {masked ? (
            <div className="relative mt-4 overflow-hidden rounded-2xl border border-line">
              <div className="space-y-2 p-4 blur-[6px] select-none" aria-hidden="true">
                {["Sommaire détaillé", "Chapitre 1 — Étude de marché", "Chapitre 2 — Prévisionnel 36 mois", "Annexes et modèles"].map(
                  (l) => (
                    <div key={l} className="flex items-center gap-2 text-sm text-inksoft">
                      <Icon name="file" className="h-4 w-4" /> {l}
                    </div>
                  ),
                )}
              </div>
              <div className="absolute inset-0 grid place-items-center bg-surface/70 backdrop-blur-[2px]">
                <div className="text-center">
                  <Icon name="lock" className="mx-auto h-5 w-5 text-accent" />
                  <p className="mt-1.5 px-4 text-[12.5px] font-semibold text-ink">Contenu profond masqué avant achat</p>
                  <p className="px-4 text-[11.5px] text-muted">
                    La décision se fait sur la couverture et la description détaillée.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            owned && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-success/40 bg-success/8 p-3.5 text-[12.5px] text-ink">
                <Icon name="check" className="h-4 w-4 text-success" />
                Œuvre acquise — {work.fileName} · licence nominative à votre nom.
              </div>
            )
          )}
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <p className="font-display text-3xl font-semibold text-accent">
              {work.price === 0 ? "Gratuit" : htg(work.price)}
            </p>

            <div className="mt-4 space-y-2">
              {mine ? (
                <>
                  <Button className="w-full" icon="edit" onClick={() => open({ type: "publish", workId: work.id })}>
                    Modifier l'œuvre
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    icon="trash"
                    onClick={() =>
                      open({
                        type: "confirm",
                        title: "Supprimer cette œuvre ?",
                        body: "Êtes-vous sûr de vouloir supprimer cette œuvre définitivement ? Cette action est irréversible.",
                        confirmLabel: "Confirmer",
                        tone: "danger",
                        onConfirm: () => {
                          deleteWork(work.id);
                          notify({
                            title: "Œuvre supprimée",
                            body: "Elle reste accessible dans l'historique des clients l'ayant acquise.",
                            tone: "warn",
                          });
                          close();
                        },
                      })
                    }
                  >
                    Supprimer
                  </Button>
                </>
              ) : owned ? (
                <Button
                  className="w-full"
                  icon="download"
                  onClick={() => {
                    downloadLicence(work.fileName, work.title, user!.name, "achat-local");
                    notify({ title: "Téléchargement lancé", body: work.fileName, tone: "success" });
                  }}
                >
                  Télécharger à nouveau
                </Button>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  icon="bag"
                  onClick={() => (user ? open({ type: "buy", workId: work.id, museumId, source }) : open({ type: "auth", mode: "login" }))}
                >
                  {work.price === 0 ? "Obtenir gratuitement" : "Acheter"}
                </Button>
              )}

              {work.kind === "mp3" && (
                <Button
                  variant="soft"
                  className="w-full"
                  icon="play"
                  onClick={() => {
                    void engine.play(work, db.works.filter((w) => w.kind === "mp3" && !w.deleted && w.approved));
                    notify({ title: "Lecture lancée", body: `${work.title} — ${creator?.name}`, tone: "info" });
                  }}
                >
                  Écouter l'extrait intégral
                </Button>
              )}

              {!mine && (
                <Button
                  variant="outline"
                  className="w-full"
                  icon="heart"
                  onClick={() => (user ? open({ type: "donate", creatorId: work.creatorId, workId: work.id }) : open({ type: "auth", mode: "login" }))}
                >
                  Soutenir le créateur
                </Button>
              )}

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    if (!user) return open({ type: "auth", mode: "login" });
                    toggleFavorite(work.id);
                    notify({ title: fav ? "Retiré des favoris" : "Ajouté aux favoris", tone: "info" });
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    <span style={{ color: fav ? "var(--accent-color)" : "currentColor" }}>
                      <Icon name="heart" className="h-4 w-4" fill={fav ? "var(--accent-color)" : "none"} />
                    </span>
                    Favori · {work.favoritesCount ?? 0}
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  icon="globe"
                  onClick={() => (user ? open({ type: "submit", workId: work.id }) : open({ type: "auth", mode: "login" }))}
                >
                  Musée
                </Button>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              close();
              navigate(`/profil/${work.creatorId}`);
            }}
            className="focus-ring card flex w-full items-center gap-3 p-3.5 text-left transition hover:border-accent"
          >
            <Avatar name={creator?.name ?? "?"} hue={creator?.hue ?? 30} size={44} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-ink">{creator?.name}</span>
                {isPremium(creator) && <Icon name="crown" className="h-3.5 w-3.5 text-gold" />}
              </span>
              <span className="block truncate text-[12px] text-muted">{creator?.city}</span>
            </span>
            <Icon name="arrowRight" className="h-4 w-4 text-muted" />
          </button>

          <p className="flex items-start gap-1.5 px-1 text-[11.5px] leading-relaxed text-muted">
            <Icon name="shield" className="mt-px h-3.5 w-3.5 shrink-0 text-accent" />
            Chaque couverture porte la signature d'authenticité du créateur. Licence nominative, non transférable.
          </p>
        </aside>
      </div>
    </Modal>
  );
}

/* ---------------- Achat ---------------- */
function BuyModal({ workId, museumId, source }: { workId: string; museumId?: string; source?: import("../lib/click-analytics").ClickSource }) {
  const { close } = useUI();
  const { workById, userById, user, recordSale, notify } = useStore();
  const work = workById(workId);
  const ref = useRef<string>("");
  if (!work || !user) return null;
  const creator = userById(work.creatorId);
  const free = work.price === 0;


  return (
    <Modal
      open
      onClose={close}
      title={free ? "Obtenir l'œuvre" : "Finaliser l'achat"}
      subtitle={`${work.title} — ${creator?.name}`}
      width="max-w-md"
    >
      <OtpFlow
        amount={work.price}
        rate={commissionRate(creator)}
        recipient={creator?.name ?? "le créateur"}
        cta={free ? "Obtenir" : "Payer"}
        skipPhone={free}
        hideBreakdown
        successTitle={free ? "Œuvre ajoutée à votre bibliothèque" : "Achat simulé confirmé"}
        successBody={
          free
            ? "Cette œuvre est offerte par son créateur. Elle est disponible dans votre bibliothèque locale."
            : `${htg(work.price)} débités fictivement. Merci pour votre achat : l'œuvre est ajoutée à votre bibliothèque.`
        }
        extra={
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-line p-3">
            <Cover work={work} creatorName={creator?.name ?? ""} className="h-16 w-16 rounded-xl" watermark={false} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{work.title}</p>
              <p className="truncate text-[12px] text-muted">
                {work.fileName} · {work.fileSize}
              </p>
            </div>
          </div>
        }
        onValidate={() => {
          const entry = recordSale(work.id, museumId, source);
          if (!entry) return false;
          ref.current = entry.id;
          notify({
            title: free ? "Œuvre obtenue" : "Paiement simulé validé",
            body: `${work.title} · ${htg(work.price)}`,
            tone: "success",
          });
          return true;
        }}
        downloadLabel="Télécharger le fichier + licence"
        onDownload={() => downloadDemoFile({ fileName: work.fileName, title: work.title, buyer: user.name, reference: ref.current })}
      />
    </Modal>
  );
}

/* ---------------- Don ---------------- */
function DonateModal({ creatorId, workId }: { creatorId: string; workId?: string }) {
  const { close } = useUI();
  const { userById, recordDonation, notify } = useStore();
  const creator = userById(creatorId);
  const [amount, setAmount] = useState(500);
  if (!creator) return null;
  return (
    <Modal open onClose={close} width="max-w-md" title={`Soutenir ${creator.name}`} subtitle="Don direct, sans contrepartie matérielle.">
      <div className="mb-4 flex flex-wrap gap-2">
        {[100, 250, 500, 1000, 2500].map((v) => (
          <Chip key={v} active={amount === v} onClick={() => setAmount(v)}>
            {htg(v)}
          </Chip>
        ))}
      </div>
      <Field label="Montant libre (HTG)">
        <input
          className={inputCls}
          type="number"
          min={10}
          value={amount}
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
        />
      </Field>
      <div className="mt-4">
        <OtpFlow
          key={amount}
          amount={amount}
          rate={commissionRate(creator)}
          recipient={creator.name}
          cta="Envoyer le don"
          hideBreakdown
          requirePositiveAmount
          successTitle="Merci pour votre soutien"
          successBody={`${htg(amount)} versés fictivement à ${creator.name}. Ce don compte dans le Prix d'impact du mois.`}
          onValidate={() => {
            if (!recordDonation(creatorId, amount, workId)) return false;
            notify({ title: "Don simulé envoyé", body: `${htg(amount)} → ${creator.name}`, tone: "success" });
            return true;
          }}
        />
      </div>
    </Modal>
  );
}

/* ---------------- Premium ---------------- */
function PremiumModal() {
  const { close } = useUI();
  const { user, activatePremium, notify } = useStore();
  const [plan, setPlan] = useState<"mensuel" | "annuel">("mensuel");
  /* L'état « déjà Premium » est figé à l'ouverture : sinon l'activation
     ferait disparaître l'écran de confirmation du flux OTP. */
  const [wasPremium] = useState(() => isPremium(user));
  if (!user) return null;
  const amount = plan === "mensuel" ? PREMIUM_MONTH : PREMIUM_YEAR;
  return (
    <Modal open onClose={close} width="max-w-lg" title="Passer à Premium" subtitle="Tarifs de démonstration, en gourdes.">
      {wasPremium ? (
        <div className="rounded-2xl border border-gold/40 bg-accentsoft p-5 text-center">
          <Icon name="crown" className="mx-auto h-7 w-7 text-gold" />
          <p className="mt-2 font-display text-lg font-semibold text-ink">Vous êtes déjà Premium</p>
          <p className="mt-1 text-sm text-muted">
            Formule {user.premium?.plan} · actif jusqu'au{" "}
            {new Date(user.premium!.until).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            {(
              [
                { k: "mensuel", price: PREMIUM_MONTH, per: "par mois", note: "Sans engagement" },
                { k: "annuel", price: PREMIUM_YEAR, per: "par an", note: "2 mois offerts" },
              ] as const
            ).map((p) => (
              <button
                key={p.k}
                onClick={() => setPlan(p.k)}
                className={cn(
                  "focus-ring rounded-2xl border p-4 text-left transition",
                  plan === p.k ? "border-accent bg-accentsoft shadow-[var(--shadow-sm)]" : "border-line hover:border-linestrong",
                )}
              >
                <span className="text-[11px] font-bold tracking-[0.16em] text-muted uppercase">{p.k}</span>
                <span className="mt-1 block font-display text-2xl font-semibold text-ink">{htg(p.price)}</span>
                <span className="block text-[12px] text-muted">
                  {p.per} · {p.note}
                </span>
              </button>
            ))}
          </div>
          <ul className="mb-4 space-y-2 rounded-2xl border border-line bg-surface2 p-4 text-[13px] text-inksoft">
            {[
              "0 % de commission : vous conservez 100 % de vos ventes et dons",
              "Posséder et administrer votre Musée Virtuel",
              "Affichage des badges brillants (Sack Awards, Pen, Brain, Disc…)",
              "Mise en avant prioritaire dans les sélections éditoriales",
            ].map((l) => (
              <li key={l} className="flex items-start gap-2">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {l}
              </li>
            ))}
          </ul>
          <OtpFlow
            key={plan}
            amount={amount}
            rate={0}
            recipient="SOLDE gallery"
            cta="Activer Premium"
            successTitle="Statut Premium activé"
            successBody="Votre compte bascule instantanément en Premium dans ce navigateur : commission 0 %, musées et badges débloqués."
            onValidate={() => {
              if (!activatePremium(plan)) return false;
              notify({ title: "Premium activé", body: `Formule ${plan} · ${htg(amount)}`, tone: "success" });
              return true;
            }}
          />
        </>
      )}
    </Modal>
  );
}

/* ---------------- Promotion Billboard ---------------- */
function PromoteModal({ workId }: { workId: string }) {
  const { close } = useUI();
  const { user, db, workById, bookPromotion, notify } = useStore();
  const mine = db.works.filter((w) => w.creatorId === user?.id && !w.deleted);
  const [selected, setSelected] = useState(mine.some((w) => w.id === workId) ? workId : (mine[0]?.id ?? workId));
  const work = workById(selected);
  if (!user) return null;
  return (
    <Modal
      open
      onClose={close}
      width="max-w-md"
      title="Réserver le Billboard"
      subtitle="Emplacement « À la une », en tête de la grille Bento, pendant 24 heures."
    >
      {mine.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface2 p-5 text-center text-sm text-muted">
          Publiez d'abord une œuvre pour réserver l'emplacement à la une.
        </div>
      ) : (
        <>
          <Field label="Œuvre à mettre en avant">
            <select className={inputCls} value={selected} onChange={(e) => setSelected(e.target.value)}>
              {mine.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </select>
          </Field>
          <div className="mt-4 mb-4 flex items-center gap-3 rounded-2xl border border-line p-3">
            {work && <Cover work={work} creatorName={user.name} className="h-16 w-20 rounded-xl" watermark={false} />}
            <div className="text-[12.5px] text-muted">
              <p className="font-semibold text-ink">Visibilité maximale</p>
              <p>Premier bloc vu par les visiteurs · rotation unique 24 h</p>
            </div>
          </div>
          <OtpFlow
            amount={PROMO_PRICE}
            rate={0}
            recipient="SOLDE gallery"
            cta="Réserver 24 h"
            successTitle="Emplacement réservé"
            successBody={`« ${work?.title} » occupe le Billboard pour les prochaines 24 heures (simulation).`}
            onValidate={() => {
              if (!bookPromotion({ workId: selected })) return false;
              notify({ title: "Billboard réservé", body: `${work?.title} · 24 h · ${htg(PROMO_PRICE)}`, tone: "success" });
              return true;
            }}
          />
        </>
      )}
    </Modal>
  );
}

/* ---------------- Publication / édition d'œuvre ---------------- */
/* Types de fichiers autorisés par univers : source unique partagée avec
   l'anti-spam de productivité (voir CATEGORY_FILE_KINDS dans types.ts). */
const KIND_BY_CAT = CATEGORY_FILE_KINDS;

const PALETTES: Record<CategoryId, [string, string, string]> = {
  musique: ["#2b2340", "#b5296b", "#e5c07b"],
  photo: ["#0e6f8a", "#e0a106", "#f4e7d2"],
  art: ["#c2542c", "#1f8a5b", "#f0c04a"],
  architecture: ["#3f4a34", "#8a8a6a", "#e9e2d0"],
  livres: ["#1f4d3a", "#c08a2e", "#f4ead6"],
  projets: ["#1d4ed8", "#4a2c1a", "#f0e3cd"],
};

function PublishModal({ workId }: { workId?: string }) {
  const { close } = useUI();
  const { user, workById, publishWork, updateWork, notify } = useStore();
  const existing = workId ? workById(workId) : undefined;
  const [title, setTitle] = useState(existing?.title ?? "");
  const [subtitle, setSubtitle] = useState(existing?.subtitle ?? "");
  const [category, setCategory] = useState<CategoryId>(existing?.category ?? "musique");
  const [kind, setKind] = useState<FileKind>(existing?.kind ?? "mp3");
  const [price, setPrice] = useState(existing?.price ?? 500);
  /* Option « œuvre gratuite » : initialisée à true si l'œuvre éditée est déjà
     à 0 HTG, et reste modifiable après publication. */
  const [free, setFree] = useState((existing?.price ?? 500) === 0);
  const lastPrice = useRef(existing?.price && existing.price > 0 ? existing.price : 500);
  const [description, setDescription] = useState(existing?.description ?? "");
  const [fileName, setFileName] = useState(existing?.fileName ?? "");
  const [fileSize, setFileSize] = useState(existing?.fileSize ?? "—");
  const [tags, setTags] = useState(existing?.tags.join(", ") ?? "");
  const [err, setErr] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;
  const confidential = category === "livres" || category === "projets";
  const descLen = description.trim().length;

  const save = () => {
    const e: Record<string, string> = {};
    if (title.trim().length < 3) e.title = "Titre trop court.";
    if (!fileName) e.file = "Joignez un fichier de démonstration (.mp3, .pdf, .zip, .jpg, .png, .dwg).";
    if (descLen <= 150) e.description = `Description trop courte : ${descLen}/151 caractères minimum pour être validée.`;
    if (price < 0) e.price = "Le prix ne peut pas être négatif.";
    setErr(e);
    if (Object.keys(e).length) {
      notify({ title: "Formulaire incomplet", body: "Corrigez les champs signalés en rouge.", tone: "danger" });
      return;
    }
    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim() || CATEGORIES.find((c) => c.id === category)!.fr,
      category,
      kind,
      price: free ? 0 : price,
      description: description.trim(),
      fileName,
      fileSize,
      palette: existing?.palette ?? PALETTES[category],
      motif: existing?.motif ?? (category === "musique" ? "disc" : category === "architecture" ? "plan" : confidential ? "page" : category === "photo" ? "lens" : "brush"),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 4),
      cover: existing?.cover,
      confidential,
      deleted: false,
      /* Seul un morceau unique (.mp3) est lisible dans le lecteur ; un .zip
         musical (album, EP, pack d'instrumentales) se télécharge après achat. */
      duration: category === "musique" && kind === "mp3" ? 90 : undefined,
      synthSeed: existing?.synthSeed ?? Math.floor(Math.random() * 90) + 3,
      lyrics: existing?.lyrics,
    } as Omit<Work, "id" | "createdAt" | "approved" | "plays" | "creatorId">;

    if (existing) {
      updateWork(existing.id, { ...payload, approved: descLen > 150 && !!fileName });
      notify({ title: "Œuvre mise à jour", body: payload.title, tone: "success" });
    } else {
      const w = publishWork(payload);
      notify({
        title: w?.approved ? "Œuvre publiée et approuvée" : "Œuvre enregistrée, en attente de validation",
        body: w?.approved ? "Elle rejoint le catalogue public et le concours de productivité." : "Complétez la description pour l'approuver.",
        tone: w?.approved ? "success" : "warn",
      });
    }
    close();
  };

  return (
    <Modal
      open
      onClose={close}
      width="max-w-2xl"
      title={existing ? "Modifier l'œuvre" : "Mettre une œuvre en ligne"}
      subtitle="Le fichier reste sur votre machine : seule son empreinte descriptive est simulée."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titre" error={err.title}>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'œuvre" />
        </Field>
        <Field label="Sous-titre" hint="format, édition…">
          <input className={inputCls} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Single · 3 titres" />
        </Field>
        <Field label="Univers">
          <select
            className={inputCls}
            value={category}
            onChange={(e) => {
              const c = e.target.value as CategoryId;
              setCategory(c);
              setKind(KIND_BY_CAT[c][0]);
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fr}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type de fichier" hint={category === "musique" ? "Single ou projet complet" : undefined}>
          <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as FileKind)}>
            {KIND_BY_CAT[category].map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[category]?.[k] ?? `.${k}`}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Pièce jointe de démonstration" error={err.file} hint=".mp3 .pdf .zip .jpg .png .dwg">
          <div
            onClick={() => fileRef.current?.click()}
            className="focus-ring flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-linestrong bg-surface2 p-4 transition hover:border-accent"
          >
            <Icon name="upload" className="h-5 w-5 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{fileName || "Choisir un fichier…"}</p>
              <p className="text-[12px] text-muted">{fileName ? fileSize : "Aucun envoi réseau — lecture locale du nom et du poids"}</p>
            </div>
            {fileName && <Tag color="var(--success)">Joint</Tag>}
          </div>
        </Field>
        <input
          ref={fileRef}
          type="file"
          accept=".mp3,.pdf,.zip,.jpg,.jpeg,.png,.dwg,.mp4"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setFileName(f.name);
            setFileSize(`${(f.size / 1048576).toFixed(1).replace(".", ",")} Mo`);
            const ext = f.name.split(".").pop()?.toLowerCase() as FileKind;
            if (["mp3", "pdf", "zip", "jpg", "png", "dwg", "mp4"].includes(ext)) setKind(ext === ("jpeg" as string) ? "jpg" : ext);
          }}
        />
      </div>

      <div className="mt-4">
        <Field
          label="Description détaillée"
          hint={`${descLen} caractère${descLen > 1 ? "s" : ""} · 151 minimum`}
          error={err.description}
        >
          <textarea
            className={cn(inputCls, "min-h-28 resize-y leading-relaxed")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contexte de création, contenu exact, format livré, usage autorisé…"
          />
        </Field>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, (descLen / 151) * 100)}%`,
              background: descLen > 150 ? "var(--success)" : "var(--accent-color)",
            }}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Prix (HTG)" hint={free ? "Œuvre gratuite" : "0 = gratuit"} error={err.price}>
          <input
            className={cn(inputCls, free && "cursor-not-allowed opacity-60")}
            type="number"
            min={0}
            value={free ? 0 : price}
            disabled={free}
            onChange={(e) => {
              const v = Number(e.target.value);
              setPrice(v);
              if (v > 0) lastPrice.current = v;
            }}
          />
        </Field>
        <Field label="Étiquettes" hint="séparées par des virgules">
          <input className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Rasin, Live, Créole" />
        </Field>
      </div>

      {/* Case « Rendre cette œuvre gratuite » — prix forcé à 0, aucun frais. */}
      <label
        className={cn(
          "mt-4 flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition",
          free ? "border-success/50 bg-success/8" : "border-line bg-surface2 hover:border-linestrong",
        )}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={free}
          onChange={(e) => {
            const checked = e.target.checked;
            setFree(checked);
            if (checked) {
              if (price > 0) lastPrice.current = price;
              setPrice(0);
            } else {
              setPrice(lastPrice.current || 500);
            }
          }}
        />
        <span
          className={cn(
            "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition",
            free ? "border-success bg-success text-white" : "border-linestrong bg-surface",
          )}
          aria-hidden="true"
        >
          {free && <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink">Rendre cette œuvre gratuite</span>
          <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">
            Le prix passe à 0 HTG et aucun frais n'est prélevé. Vous pouvez la rendre payante à tout moment, même après publication.
          </span>
        </span>
      </label>

      {confidential && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-surface2 p-3 text-[12.5px] text-muted">
          <Icon name="lock" className="mt-px h-4 w-4 shrink-0 text-accent" />
          Section confidentielle : seul le couple couverture + description sera visible avant achat. Le contenu profond
          reste masqué et le téléchargement portera une licence nominative.
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={close}>
          Annuler
        </Button>
        <Button icon={existing ? "check" : "upload"} onClick={save}>
          {existing ? "Enregistrer les modifications" : "Publier l'œuvre"}
        </Button>
      </div>
    </Modal>
  );
}

/* ---------------- Promotion Billboard d'un musée ---------------- */
function PromoteMuseumModal({ museumId }: { museumId: string }) {
  const { close, open } = useUI();
  const { db, user, bookPromotion, notify } = useStore();
  const m = db.museums.find((x) => x.id === museumId);
  if (!m || !user) return null;
  return (
    <Modal
      open
      onClose={close}
      width="max-w-md"
      title="Réserver le Billboard"
      subtitle={`Musée virtuel « ${m.title} » — en tête de la grille pendant 24 heures.`}
    >
      {!isPremium(user) ? (
        <div className="rounded-2xl border border-gold/40 bg-accentsoft p-5 text-center">
          <Icon name="crown" className="mx-auto h-7 w-7 text-gold" />
          <p className="mt-2 text-sm text-ink">Réserver le Billboard pour un musée est un privilège Premium.</p>
          <Button className="mt-4 w-full" onClick={() => open({ type: "premium" })}>
            Passer à Premium · {htg(PREMIUM_MONTH)}/mois
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-line p-3">
            <Avatar name={m.title} hue={m.hue} size={48} />
            <div className="min-w-0 text-[12.5px] text-muted">
              <p className="truncate text-sm font-semibold text-ink">{m.title}</p>
              <p className="truncate">
                {m.members} membres · {m.workIds.length} œuvres · ligne éditoriale complète en vitrine
              </p>
            </div>
          </div>
          <OtpFlow
            amount={PROMO_PRICE}
            rate={0}
            recipient="SOLDE gallery"
            cta="Réserver 24 h"
            successTitle="Emplacement réservé"
            successBody={`Le musée « ${m.title} » occupe le Billboard pour 24 h. Chaque visiteur du Billboard entre directement dans la galerie (simulation).`}
            onValidate={() => {
              if (!bookPromotion({ museumId: m.id })) return false;
              notify({ title: "Billboard réservé", body: `${m.title} · 24 h · ${htg(PROMO_PRICE)}`, tone: "success" });
              return true;
            }}
          />
        </>
      )}
    </Modal>
  );
}

/* ---------------- Musée : création ---------------- */
function MuseumModal() {
  const { close, open, navigate } = useUI();
  const { user, createMuseum, notify, lang } = useStore();
  const tr = makeTr(lang);
  const [title, setTitle] = useState("");
  const [editorial, setEditorial] = useState("");
  const [hue, setHue] = useState(32);
  if (!user) return null;

  if (!isPremium(user))
    return (
      <Modal open onClose={close} width="max-w-md" title={tr("Fonder un musée virtuel", "Fonde yon mize vityèl", "Found a virtual museum", "Fundar un museo virtual")} subtitle={tr("Privilège réservé aux membres Premium.", "Privilèj rezève pou manm Premium.", "Premium members only.", "Privilegio solo para miembros Premium.")}>
        <div className="rounded-2xl border border-gold/40 bg-accentsoft p-5 text-center">
          <Icon name="crown" className="mx-auto h-7 w-7 text-gold" />
          <p className="mt-2 text-sm text-ink">
            Seuls les créateurs Premium peuvent fonder un musée et valider les œuvres de tiers.
          </p>
          <Button className="mt-4 w-full" onClick={() => open({ type: "premium" })}>
            Passer à Premium · {htg(PREMIUM_MONTH)}/mois
          </Button>
        </div>
      </Modal>
    );

  return (
    <Modal open onClose={close} width="max-w-lg" title={tr("Fonder un musée virtuel", "Fonde yon mize vityèl", "Found a virtual museum", "Fundar un museo virtual")} subtitle={tr("Un fil éditorial : un titre, une photo ronde et une ligne claire.", "Yon fil editoryal : yon tit, yon foto won ak yon liy klè.", "An editorial feed: a title, a round photo and a clear line.", "Un hilo editorial: un título, una foto redonda y una línea clara.")}>
      <div className="mb-5 flex items-center gap-4 rounded-2xl border border-line bg-surface2 p-4">
        <Avatar name={title || "Musée"} hue={hue} size={64} />
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold text-ink">{title || "Titre du musée"}</p>
          <p className="line-clamp-2 text-[12.5px] text-muted">{editorial || "Votre ligne éditoriale apparaîtra ici."}</p>
        </div>
      </div>
      <div className="space-y-4">
        <Field label="Titre du musée">
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lakou Sonore" />
        </Field>
        <Field label="Ligne éditoriale" hint={`${editorial.length}/160`}>
          <textarea
            className={cn(inputCls, "min-h-20 resize-y")}
            maxLength={160}
            value={editorial}
            onChange={(e) => setEditorial(e.target.value)}
            placeholder="Ce que vous publiez, à quel rythme, pour qui."
          />
        </Field>
        <Field label="Teinte de la photo de profil" hint={`${hue}°`}>
          <input
            type="range"
            min={0}
            max={359}
            value={hue}
            onChange={(e) => setHue(Number(e.target.value))}
            style={{ ["--fill" as string]: `${(hue / 359) * 100}%` }}
            className="w-full"
          />
        </Field>
      </div>
      <Button
        className="mt-6 w-full"
        size="lg"
        disabled={title.trim().length < 3 || editorial.trim().length < 12}
        onClick={() => {
          const m = createMuseum({ title: title.trim(), editorial: editorial.trim(), hue });
          notify({ title: "Musée fondé", body: `${title} est en ligne.`, tone: "success" });
          close();
          if (m) navigate(`/musees/${m.id}`);
        }}
      >
        {tr("Fonder le musée", "Fonde mize a", "Found the museum", "Fundar el museo")}
      </Button>
    </Modal>
  );
}

/* ---------------- Proposer une œuvre à un musée ---------------- */
function SubmitModal({ workId }: { workId: string }) {
  const { close, navigate } = useUI();
  const { db, workById, userById, submitToMuseum, notify, user } = useStore();
  const work = workById(workId);
  if (!work || !user) return null;
  const isAuthor = work.creatorId === user.id;
  if (!isAuthor) {
    const author = userById(work.creatorId);
    return (
      <Modal open onClose={close} width="max-w-md" title="Soumission réservée à l’auteur" subtitle={`Œuvre : ${work.title}`}>
        <div role="alert" className="rounded-2xl border border-danger/35 bg-danger/8 p-5">
          <Icon name="shield" className="h-6 w-6 text-danger" />
          <p className="mt-3 text-sm font-semibold text-ink">Vous ne pouvez pas soumettre cette œuvre à un musée.</p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            Elle a été créée par {author?.name ?? "un autre artiste"}. Seul le créateur connecté peut proposer ses propres œuvres.
          </p>
        </div>
        <Button className="mt-4 w-full" icon="grid" onClick={() => { close(); navigate("/studio"); }}>
          Voir mes propres créations
        </Button>
      </Modal>
    );
  }
  return (
    <Modal open onClose={close} width="max-w-md" title="Proposer à un musée" subtitle={`Œuvre : ${work.title}`}>
      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-success/35 bg-success/8 p-3.5 text-[12.5px] text-inksoft">
        <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        <span><strong className="text-ink">Auteur vérifié : {user.name}.</strong> Vous pouvez soumettre cette œuvre à un musée tiers.</span>
      </div>
      <div className="space-y-2">
        {db.museums.map((m) => {
          const owner = userById(m.ownerId);
          return (
            <button
              key={m.id}
              onClick={() => {
                const r = submitToMuseum(m.id, workId);
                if (r === "not-owner") {
                  notify({ title: "Soumission refusée", body: "Vous devez être le créateur de cette œuvre.", tone: "danger" });
                  return;
                }
                notify({
                  title:
                    r === "ok"
                      ? m.ownerId === user.id
                        ? "Œuvre ajoutée au musée"
                        : "Proposition envoyée"
                      : r === "duplicate"
                        ? "Déjà présente"
                        : "Proposition déjà en attente",
                  body:
                    r === "ok" && m.ownerId !== user.id
                      ? `${owner?.name} doit valider manuellement votre œuvre.`
                      : m.title,
                  tone: r === "ok" ? "success" : "warn",
                });
                close();
              }}
              className="focus-ring flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition hover:border-accent hover:bg-accentsoft"
            >
              <Avatar name={m.title} hue={m.hue} size={44} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{m.title}</span>
                <span className="block truncate text-[12px] text-muted">{m.editorial}</span>
              </span>
              <Icon name="arrowRight" className="h-4 w-4 text-muted" />
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-[11.5px] leading-relaxed text-muted">
        Toute intégration d'une œuvre de tiers est soumise à la validation manuelle de l'administrateur Premium du musée.
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        Authenticité : l’intégration future de « Codes uniques générés automatiquement » permettra de renforcer cette validation.
      </p>
    </Modal>
  );
}

/* ---------------- Retrait wallet ---------------- */
function WithdrawModal() {
  const { close } = useUI();
  const { user, requestWithdrawal, notify } = useStore();
  const [amount, setAmount] = useState(user ? Math.floor(user.wallet) : 0);
  if (!user) return null;
  const ok = amount >= MIN_WITHDRAWAL && amount <= user.wallet;
  return (
    <Modal open onClose={close} width="max-w-md" title="Demander un retrait" subtitle="Virement simulé vers MonCash / Natcash.">
      <div className="rounded-2xl border border-line bg-surface2 p-4">
        <p className="text-[12px] text-muted">Solde disponible</p>
        <p className="font-display text-3xl font-semibold text-accent">{htg(user.wallet)}</p>
        <p className="mt-1 text-[12px] text-muted">Seuil minimum : {htg(MIN_WITHDRAWAL)}</p>
      </div>
      <div className="mt-4">
        <Field
          label="Montant à retirer (HTG)"
          error={amount > user.wallet ? "Montant supérieur au solde." : amount < MIN_WITHDRAWAL ? `Minimum ${htg(MIN_WITHDRAWAL)}.` : undefined}
        >
          <input className={inputCls} type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </Field>
      </div>
      <Button
        className="mt-5 w-full"
        size="lg"
        disabled={!ok}
        onClick={() => {
          if (requestWithdrawal(amount)) {
            notify({ title: "Retrait demandé", body: `${htg(amount)} · traitement simulé sous 48 h`, tone: "success" });
            close();
          }
        }}
      >
        Confirmer la demande
      </Button>
    </Modal>
  );
}

/* ---------------- Confirmation CRUD ---------------- */
function ConfirmModal(m: Extract<import("../lib/ui-context").ModalState, { type: "confirm" }>) {
  const { close } = useUI();
  return (
    <Modal
      open
      onClose={close}
      width="max-w-md"
      tone={m.tone === "danger" ? "danger" : "default"}
      title={m.title}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={close}>
            Annuler
          </Button>
          <Button
            variant={m.tone === "danger" ? "danger" : "accent"}
            icon={m.tone === "danger" ? "trash" : "check"}
            onClick={() => {
              m.onConfirm();
              close();
            }}
          >
            {m.confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
          style={{
            background: m.tone === "danger" ? "color-mix(in srgb, var(--danger) 12%, transparent)" : "var(--accent-soft)",
            color: m.tone === "danger" ? "var(--danger)" : "var(--accent-color)",
          }}
        >
          <Icon name="alert" className="h-5 w-5" />
        </span>
        <p className="text-[14.5px] leading-relaxed text-inksoft">{m.body}</p>
      </div>
    </Modal>
  );
}

export function ModalHost() {
  const { modal } = useUI();
  const { user, userById } = useStore();
  const needsAuth = ["buy", "donate", "premium", "publish", "museum", "withdraw", "promote", "promote-museum", "submit"].includes(modal.type);
  const effective = useMemo(() => {
    /* Message direct sans session : modale d'interposition invitant à créer un compte Basique */
    if (modal.type === "dm" && !user) {
      const to = userById(modal.userId)?.name ?? "ce membre";
      return {
        type: "auth" as const,
        mode: "signup" as const,
        reason: `Créez un compte Basique pour écrire à ${to}. L'adresse e-mail est obligatoire, aucun métier n'est requis.`,
      };
    }
    return needsAuth && !user ? { type: "auth" as const, mode: "login" as const, reason: undefined } : modal;
  }, [needsAuth, user, modal, userById]);

  switch (effective.type) {
    case "auth":
      return <AuthModal mode={effective.mode} reason={effective.reason} />;
    case "dm":
      return <DirectMessageModal userId={effective.userId} />;
    case "work":
      return <WorkModal id={effective.id} museumId={effective.museumId} source={effective.source} />;
    case "buy":
      return <BuyModal workId={effective.workId} museumId={effective.museumId} source={effective.source} />;
    case "donate":
      return <DonateModal creatorId={effective.creatorId} workId={effective.workId} />;
    case "premium":
      return <PremiumModal />;
    case "promote":
      return <PromoteModal workId={effective.workId} />;
    case "promote-museum":
      return <PromoteMuseumModal museumId={effective.museumId} />;
    case "publish":
      return <PublishModal workId={effective.workId} />;
    case "museum":
      return <MuseumModal />;
    case "submit":
      return <SubmitModal workId={effective.workId} />;
    case "withdraw":
      return <WithdrawModal />;
    case "confirm":
      return <ConfirmModal {...effective} />;
    default:
      return null;
  }
}
