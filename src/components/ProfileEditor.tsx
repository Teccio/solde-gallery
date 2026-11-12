import { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { CATEGORIES, TRADES } from "../lib/types";
import { makeTr, tradeLabel } from "../lib/l10n";
import type { CategoryId, Socials, Trade, User } from "../lib/types";
import { Button, Chip, Field, Icon, inputCls } from "./ui";
import { cn } from "../utils/cn";

/* ============================================================
   MODULE ISOLÉ — Édition inline du profil
   Les champs se déroulent DANS la fiche d'identité supérieure.
   [Annuler] et [Enregistrer les modifications] sont placés en bas
   de cette fiche : donc AU-DESSUS de la grille des œuvres publiées.
   ============================================================ */

export const SOCIAL_FIELDS: { key: keyof Socials; label: string; icon: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", icon: "instagram", placeholder: "@votrecompte" },
  { key: "facebook", label: "Facebook", icon: "facebook", placeholder: "votre.page" },
  { key: "tiktok", label: "TikTok", icon: "tiktok", placeholder: "@votrecompte" },
  { key: "youtube", label: "YouTube", icon: "youtube", placeholder: "@votrechaine" },
  { key: "website", label: "Site web", icon: "link", placeholder: "www.votresite.ht" },
];

const isUrl = (v: string) => /^https?:\/\//i.test(v);

/* Normalisation à l'enregistrement : identifiant sans « @ » ni espaces ;
   une URL complète collée telle quelle est conservée. */
export function normalizeSocial(key: keyof Socials, raw: string): string {
  const v = raw.trim();
  if (!v || isUrl(v)) return v;
  return key === "website" ? v.replace(/\s+/g, "") : v.replace(/^@+/, "").replace(/\s+/g, "");
}

/* Lien sortant construit à partir de l'identifiant saisi */
export function socialHref(key: keyof Socials, value: string): string {
  if (isUrl(value)) return value;
  switch (key) {
    case "instagram":
      return `https://instagram.com/${value}`;
    case "facebook":
      return `https://facebook.com/${value}`;
    case "tiktok":
      return `https://www.tiktok.com/@${value}`;
    case "youtube":
      return `https://www.youtube.com/@${value}`;
    default:
      return `https://${value}`;
  }
}

export function socialLabel(key: keyof Socials, value: string) {
  if (isUrl(value)) return value.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
  return key === "website" ? value.replace(/^www\./i, "") : `@${value}`;
}

/* Liens renseignés, dans l'ordre d'affichage */
export function socialEntries(s?: Socials) {
  return SOCIAL_FIELDS.filter((f) => !!s?.[f.key]).map((f) => ({ ...f, value: s![f.key]! }));
}

export function ProfileEditor({ profile, onClose }: { profile: User; onClose: () => void }) {
  const { updateProfile, notify, lang } = useStore();
  const tr = makeTr(lang);
  const [name, setName] = useState(profile.name);
  const [city, setCity] = useState(profile.city);
  const [bio, setBio] = useState(profile.bio);
  const [socials, setSocials] = useState<Socials>({ ...(profile.socials ?? {}) });
  const [trades, setTrades] = useState<Trade[]>(profile.trades);
  const [interests, setInterests] = useState<CategoryId[]>(profile.interests);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 160);
    return () => window.clearTimeout(id);
  }, []);

  const save = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 3) e.name = "Le nom public doit contenir au moins 3 caractères.";
    const clean: Socials = {};
    SOCIAL_FIELDS.forEach(({ key }) => {
      const v = normalizeSocial(key, socials[key] ?? "");
      if (!v) return;
      if (key === "website" && !isUrl(v) && !/^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(v)) e[key] = "Adresse web invalide (ex. www.monsite.ht).";
      else if (key !== "website" && !isUrl(v) && !/^[\w.-]{2,60}$/.test(v)) e[key] = "Identifiant invalide : lettres, chiffres, point ou tiret.";
      clean[key] = v;
    });
    setErrors(e);
    if (Object.keys(e).length) {
      notify({ title: "Vérifiez les champs signalés", tone: "danger" });
      return;
    }
    updateProfile({ name: name.trim(), city: city.trim() || profile.city, bio: bio.trim(), socials: clean, trades, interests });
    notify({ title: "Profil mis à jour", body: "Modifications enregistrées dans ce navigateur.", tone: "success" });
    onClose();
  };

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        save();
      }}
      onKeyDown={(ev) => ev.key === "Escape" && onClose()}
      aria-label={tr("Modifier le profil", "Modifye pwofil la", "Edit Profile", "Editar perfil")}
      data-testid="profile-inline-editor"
      className="relative border-t border-line bg-surface2 px-5 pt-5 pb-5 sm:px-7"
    >
      <p className="mb-4 flex items-center gap-2 text-[10.5px] font-bold tracking-[0.18em] text-accent uppercase">
        <Icon name="edit" className="h-3.5 w-3.5" /> {tr("Modifier le profil", "Modifye pwofil la", "Edit Profile", "Editar perfil")}
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr("Nom public", "Non piblik", "Public name", "Nombre público")} error={errors.name}>
              <input ref={nameRef} className={inputCls} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label={tr("Ville", "Vil", "City", "Ciudad")}>
              <input className={inputCls} value={city} maxLength={40} onChange={(e) => setCity(e.target.value)} />
            </Field>
          </div>
          <Field label={tr("Biographie", "Biyografi", "Biography", "Biografía")} hint={`${bio.length}/280`}>
            <textarea
              className={cn(inputCls, "min-h-[124px] resize-y leading-relaxed")}
              value={bio}
              maxLength={280}
              onChange={(e) => setBio(e.target.value)}
            />
          </Field>
        </div>

        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink">
            {tr("Réseaux sociaux", "Rezo sosyal", "Social links", "Redes sociales")} <span className="font-normal text-muted">· {tr("facultatif", "opsyonèl", "optional", "opcional")}</span>
          </p>
          <div className="space-y-2">
            {SOCIAL_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 transition focus-within:border-accent">
                  <Icon name={f.icon} className="h-[18px] w-[18px] text-accent" />
                  <span className="w-[74px] shrink-0 text-[12px] font-semibold text-inksoft">{f.label}</span>
                  <input
                    aria-label={f.label}
                    className="h-10 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted/70"
                    value={socials[f.key] ?? ""}
                    placeholder={f.placeholder}
                    maxLength={120}
                    onChange={(e) => setSocials((s) => ({ ...s, [f.key]: e.target.value }))}
                  />
                </label>
                {errors[f.key] && (
                  <p className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-danger">
                    <Icon name="alert" className="h-3.5 w-3.5" /> {errors[f.key]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Field label={tr("Badges de métier", "Badj metye", "Trade badges", "Insignias de oficio")} hint={`${trades.length}/5 {tr("maximum", "maksimòm", "maximum", "máximo")}`}>
          <div className="flex flex-wrap gap-2 pt-1">
            {TRADES.map((trade) => (
              <Chip
                key={trade}
                type="button"
                active={trades.includes(trade)}
                onClick={() =>
                  setTrades((cur) => {
                    if (cur.includes(trade)) return cur.filter((x) => x !== trade);
                    if (cur.length >= 5) {
                      notify({ title: "Maximum 5 métiers", tone: "warn" });
                      return cur;
                    }
                    return [...cur, trade];
                  })
                }
              >
                {tradeLabel(trade, lang)}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label={tr("Centres d'intérêt", "Sant enterè", "Interests", "Intereses")} hint="aucune limite">
          <div className="flex flex-wrap gap-2 pt-1">
            {CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                type="button"
                active={interests.includes(c.id)}
                onClick={() => setInterests((cur) => (cur.includes(c.id) ? cur.filter((x) => x !== c.id) : [...cur, c.id]))}
              >
                {c.fr}
              </Chip>
            ))}
          </div>
        </Field>
      </div>

      {/* Actions en bas de la fiche d'identité — avant la grille des œuvres */}
      <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-end">
        <p className="text-center text-[11.5px] text-muted sm:mr-auto sm:text-left">{tr("Enregistré localement dans ce navigateur.", "Anrejistre lokalman nan navigatè sa a.", "Saved locally in this browser.", "Guardado localmente en este navegador.")}</p>
        <Button type="button" variant="outline" onClick={onClose}>
          {tr("Annuler", "Anile", "Cancel", "Cancelar")}
        </Button>
        <Button type="submit" icon="check">
          {tr("Enregistrer les modifications", "Anrejistre chanjman yo", "Save changes", "Guardar cambios")}
        </Button>
      </div>
    </form>
  );
}
