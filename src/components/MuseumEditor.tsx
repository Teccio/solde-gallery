/* ============================================================
   MODULE ISOLÉ — CRUD inline d'un Musée Virtuel (Premium)
   · champs déployés DANS le bloc d'en-tête de la galerie ;
   · [Enregistrer] / [Annuler] en bas de CE bloc, au-dessus de la
     grille des œuvres exposées ;
   · photo de profil ronde : fichier local compressé en canvas
     (256 px, JPEG) + réglage de la teinte de l'avatar généré ;
   · persistance via `updateMuseum` → localStorage.
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import type { Museum } from "../lib/types";
import { makeTr } from "../lib/l10n";
import { Button, Field, Icon, inputCls } from "./ui";
import { MuseumAvatar } from "./MuseumAvatar";
import { cn } from "../utils/cn";

/** Compression locale : garde le localStorage léger et la photo ronde nette. */
async function compressImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Image illisible"));
      el.src = url;
    });
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponible");
    /* Fond ivoire : une image transparente ne produit pas un disque invisible */
    ctx.fillStyle = "#f4eee2";
    ctx.fillRect(0, 0, size, size);
    const side = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.78);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function MuseumEditor({ museum, onClose }: { museum: Museum; onClose: () => void }) {
  const { updateMuseum, notify, lang } = useStore();
  const tr = makeTr(lang);
  const [title, setTitle] = useState(museum.title);
  const [editorial, setEditorial] = useState(museum.editorial);
  const [hue, setHue] = useState(museum.hue);
  const [photo, setPhoto] = useState<string | undefined>(museum.photo);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => titleRef.current?.focus({ preventScroll: true }), 140);
    return () => window.clearTimeout(id);
  }, []);

  const preview: Museum = { ...museum, title: title || museum.title, hue, photo };

  const save = () => {
    if (title.trim().length < 3) return setError(tr("Le titre doit contenir au moins 3 caractères.", "Tit la dwe gen omwen 3 karaktè.", "Title needs at least 3 characters.", "El título debe tener al menos 3 caracteres."));
    if (editorial.trim().length < 12) return setError(tr("Description trop courte (12 caractères minimum).", "Deskripsyon twò kout (12 karaktè minimòm).", "Description too short (12 characters minimum).", "Descripción demasiado corta (12 caracteres mínimo)."));
    updateMuseum(museum.id, { title: title.trim(), editorial: editorial.trim(), hue, photo });
    notify({ title: tr("Musée mis à jour", "Mize a ajou", "Museum updated", "Museo actualizado"), body: title.trim(), tone: "success" });
    onClose();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      data-testid="museum-inline-editor"
      aria-label={tr("Modifier le musée", "Modifye mize a", "Edit museum", "Editar museo")}
      className="relative border-t border-line bg-surface2 px-5 pt-5 pb-5 sm:px-7"
    >
      <p className="mb-4 flex items-center gap-2 text-[10.5px] font-bold tracking-[0.18em] text-accent uppercase">
        <Icon name="edit" className="h-3.5 w-3.5" /> {tr("Modifier le musée", "Modifye mize a", "Edit museum", "Editar museo")}
      </p>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-4">
          <Field label={tr("Titre du musée", "Tit mize a", "Museum title", "Título del museo")} error={error && error.includes("3") ? error : undefined}>
            <input ref={titleRef} className={inputCls} value={title} maxLength={60} onChange={(e) => { setTitle(e.target.value); setError(""); }} />
          </Field>
          <Field
            label={tr("Description éditoriale", "Deskripsyon editoryal", "Editorial description", "Descripción editorial")}
            hint={`${editorial.length}/160`}
            error={error && !error.includes("3") ? error : undefined}
          >
            <textarea
              className={cn(inputCls, "min-h-[96px] resize-y leading-relaxed")}
              value={editorial}
              maxLength={160}
              onChange={(e) => { setEditorial(e.target.value); setError(""); }}
            />
          </Field>
        </div>

        {/* Photo de profil ronde */}
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="mb-3 text-[12.5px] font-semibold text-ink">
            {tr("Photo de profil ronde", "Foto pwofil won", "Round profile photo", "Foto de perfil redonda")}
          </p>
          <div className="flex items-center gap-3">
            <MuseumAvatar museum={preview} size={64} ring />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="focus-ring inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-linestrong px-2 py-2 text-[12px] font-semibold text-inksoft transition hover:border-accent hover:text-ink"
            >
              <Icon name="upload" className="h-4 w-4 text-accent" /> {tr("Choisir", "Chwazi", "Choose", "Elegir")}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  setPhoto(await compressImage(f));
                  notify({ title: tr("Photo ajoutée", "Foto ajoute", "Photo added", "Foto añadida"), tone: "success" });
                } catch {
                  setError(tr("Image illisible, essayez un JPG ou PNG.", "Imaj la pa lizib, eseye JPG oswa PNG.", "Unreadable image, try JPG or PNG.", "Imagen ilegible, prueba JPG o PNG."));
                }
              }}
            />
          </div>
          {photo && (
            <button
              type="button"
              onClick={() => setPhoto(undefined)}
              className="focus-ring mt-2 w-full text-[11.5px] font-semibold text-muted hover:text-danger"
            >
              {tr("Retirer la photo", "Retire foto a", "Remove photo", "Quitar foto")}
            </button>
          )}
          <div className="mt-4">
            <Field label={tr("Teinte de l'avatar", "Koulè avatar la", "Avatar hue", "Tono del avatar")} hint={`${hue}°`}>
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
        </div>
      </div>

      {/* Actions immédiatement au bas du bloc d'en-tête, avant la grille */}
      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-end">
        <p className="text-center text-[11.5px] text-muted sm:mr-auto sm:text-left">
          {tr("Enregistré dans ce navigateur.", "Anrejistre nan navigatè sa a.", "Saved in this browser.", "Guardado en este navegador.")}
        </p>
        <Button type="button" variant="outline" onClick={onClose}>
          {tr("Annuler", "Anile", "Cancel", "Cancelar")}
        </Button>
        <Button type="submit" icon="check">
          {tr("Enregistrer", "Anrejistre", "Save", "Guardar")}
        </Button>
      </div>
    </form>
  );
}
