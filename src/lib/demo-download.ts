interface DemoDownload {
  fileName: string;
  title: string;
  buyer: string;
  reference: string;
}

const encoder = new TextEncoder();

function licenceText({ fileName, title, buyer, reference }: DemoDownload): string {
  return [
    "SOLDE gallery - DOCUMENT DE DEMONSTRATION",
    `Oeuvre : ${title}`,
    `Fichier presente dans le catalogue : ${fileName}`,
    `Licence nominative : ${buyer}`,
    `Reference : ${reference}`,
    `Date : ${new Date().toLocaleString("fr-FR")}`,
    "",
    "Licence personnelle et non transferable.",
    "Aucun paiement reel n'a ete effectue.",
    "Ce fichier de demonstration ne contient pas l'oeuvre originale.",
  ].join("\n");
}

const winAnsi: Record<string, number> = {
  "€": 0x80,
  "Œ": 0x8c,
  "œ": 0x9c,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "–": 0x96,
  "—": 0x97,
};

function pdfText(value: string): string {
  return Array.from(value, (character) => {
    const code = character.codePointAt(0) ?? 0;
    const byte = winAnsi[character] ?? ((code >= 32 && code <= 126) || (code >= 160 && code <= 255) ? code : 63);
    if (byte > 126) return `\\${byte.toString(8).padStart(3, "0")}`;
    return String.fromCharCode(byte).replace(/[\\()]/g, "\\$&");
  }).join("");
}

function pdfDocument(text: string): Blob {
  const lines = text.split("\n").flatMap((line) => line.match(/.{1,85}/gu) ?? [""]);
  const content = [
    "BT /F1 11 Tf 50 790 Td 17 TL",
    ...lines.map((line) => `(${pdfText(line)}) Tj T*`),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([pdf], { type: "application/pdf" });
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Archive ZIP sans compression : deux documents locaux, avec leur licence, sans dépendance externe.
function zipDocument(text: string): Blob {
  const entries = [
    { name: "LISEZMOI.txt", content: "Ce telechargement est une demonstration SOLDE gallery.\nL'oeuvre originale n'est pas incluse.\n" },
    { name: "LICENCE_SOLDE.txt", content: text },
  ];
  const localParts: Uint8Array[] = [];
  const directoryParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const data = encoder.encode(entry.content);
    const checksum = crc32(data);
    const local = new Uint8Array(30);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(12, 33, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, name.length, true);
    localParts.push(local, name, data);

    const directory = new Uint8Array(46);
    const directoryView = new DataView(directory.buffer);
    directoryView.setUint32(0, 0x02014b50, true);
    directoryView.setUint16(4, 20, true);
    directoryView.setUint16(6, 20, true);
    directoryView.setUint16(8, 0x0800, true);
    directoryView.setUint16(14, 33, true);
    directoryView.setUint32(16, checksum, true);
    directoryView.setUint32(20, data.length, true);
    directoryView.setUint32(24, data.length, true);
    directoryView.setUint16(28, name.length, true);
    directoryView.setUint32(42, offset, true);
    directoryParts.push(directory, name);
    offset += local.length + name.length + data.length;
  }

  const directorySize = directoryParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, directorySize, true);
  endView.setUint32(16, offset, true);

  const parts = [...localParts, ...directoryParts, end];
  const archive = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let position = 0;
  parts.forEach((part) => {
    archive.set(part, position);
    position += part.length;
  });
  return new Blob([archive.buffer], { type: "application/zip" });
}

/** Génère un court fichier audio WAV (démo multimédia jouable dans le
    navigateur) — utilisé pour les œuvres audio (.mp3) afin que le fichier
    multimédia de démonstration s'ouvre et se joue immédiatement. */
function wavDocument(seconds = 5): Blob {
  const rate = 44100;
  const n = Math.floor(rate * seconds);
  const data = new Float32Array(n);
  const base = 330;
  const notes = [base, base * 1.25, base * 1.5, base * 1.667, base * 2];
  const noteLen = seconds / notes.length;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const idx = Math.min(notes.length - 1, Math.floor(t / noteLen));
    const f = notes[idx];
    const local = (t % noteLen) / noteLen;
    const env = Math.min(1, local * 10) * (1 - local);
    data[i] = (Math.sin(2 * Math.PI * f * t) * 0.32 + Math.sin(2 * Math.PI * f * 2 * t) * 0.06) * env;
  }
  const buffer = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buffer);
  const ws = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  ws(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  ws(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  ws(36, "data");
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** Simulation de téléchargement : génère un fichier de démonstration
    (PDF pour les documents, fichier multimédia WAV pour l'audio) et le fait
    OUVRIR immédiatement dans un onglet, en le téléchargeant en secours.
    Chaque document embarque la licence nominative de l'œuvre acquise. */
export function downloadDemoFile(details: DemoDownload): string {
  const base = details.fileName.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|\x00-\x1f]/g, "-") || "oeuvre";
  const isAudio = /\.mp3$/i.test(details.fileName);
  const isPdf = /\.pdf$/i.test(details.fileName);
  const ext = isAudio ? "wav" : isPdf ? "pdf" : "zip";
  const filename = `${base}-demonstration.${ext}`;
  const text = licenceText(details);
  const blob = isAudio ? wavDocument() : isPdf ? pdfDocument(text) : zipDocument(text);
  const url = URL.createObjectURL(blob);
  // Ouverture immédiate du document / du fichier multimédia dans un onglet.
  try {
    window.open(url, "_blank", "noopener");
  } catch {
    /* certains navigateurs bloquent l'ouverture dans un onglet :
       le téléchargement ci-dessous prend le relais. */
  }
  // Téléchargement en secours (fichier effectivement enregistré).
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  return filename;
}