import { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui-context";
import type { Lang } from "../lib/types";
import { Button, Icon } from "./ui";
import { cn } from "../utils/cn";

/* ============================================================
   Agent IA de support — périmètre strictement limité au guidage
   utilisateur. V1.1 :
   · saisie de texte libre (fini l'effet FAQ statique)
   · DÉTECTION AUTOMATIQUE de la langue (FR / Kreyòl / EN / ES)
     et réponse fluide dans la langue de l'utilisateur
   · escalade visuelle immédiate pour l'administrateur en cas
     d'anomalie de paiement simulée
   ============================================================ */

type Msg = { id: string; from: "bot" | "user"; text: string; alert?: boolean };

/* ---- Base de connaissances quadrilingue (support uniquement) ---- */
type KBEntry = { keys: string[]; texts: Record<Lang, string> };

const KB: KBEntry[] = [
  {
    keys: ["bibliothèque", "bibliotheque", "bibliyotèk", "library", "biblioteca", "mes fichiers", "my files", "mis archivos", "fichye mwen"],
    texts: {
      fr: "Vos œuvres acquises (PDF, musique ZIP, plans…) sont rangées dans l'onglet « Bibliothèque » de votre espace personnel (votre profil), ouvert par défaut. Chaque carte permet de retélécharger le fichier avec sa licence nominative ; tout reste stocké localement tant que les données du navigateur ne sont pas effacées.",
      ht: "Zèv ou achte yo (PDF, mizik ZIP, plan…) ranje nan onglet « Bibliyotèk » espas pèsonèl ou (pwofil ou), ki louvri pa defo. Chak kat pèmèt ou telechaje fichye a ankò ak lisans nominatif li ; tout bagay rete lokal toutotan done navigatè a pa efase.",
      en: "Your acquired works (PDF, music ZIP, plans…) live in the “Library” tab of your personal space (your profile), open by default. Each card lets you re-download the file with its personal licence; everything stays stored locally until the browser data is cleared.",
      es: "Tus obras adquiridas (PDF, música ZIP, planos…) están en la pestaña “Biblioteca” de tu espacio personal (tu perfil), abierta por defecto. Cada tarjeta permite volver a descargar el archivo con su licencia nominativa; todo queda guardado localmente hasta que se borren los datos del navegador.",
    },
  },
  {
    keys: ["premium", "primium", "abònman", "abonnement", "premium?", "500", "5000", "cuenta premium"],
    texts: {
      fr: "Premium coûte 500 HTG par mois ou 5 000 HTG par an (démonstration). Il supprime la commission de 3,75 %, débloque la fondation d'un musée virtuel et l'affichage des badges. Activation dans Profil → Passer à Premium, via la modale OTP (code 0000).",
      ht: "Premium koute 500 HTG pa mwa oswa 5 000 HTG pa ane (demonstrasyon). Li retire komisyon 3,75 %, li pèmèt ou fonde yon mize vityèl epi li montre badj yo. Ale nan Profil → Pase an Premium, epi sèvi ak kòd 0000.",
      en: "Premium costs 500 HTG per month or 5 000 HTG per year (demo). It removes the 3.75% fee, unlocks founding a virtual museum and badge display. Activate it in Profile → Go Premium, via the OTP modal (code 0000).",
      es: "Premium cuesta 500 HTG al mes o 5 000 HTG al año (demo). Elimina la comisión del 3,75 %, desbloquea la fundación de un museo virtual y el display de insignias. Actívalo en Perfil → Pasar a Premium, con la modal OTP (código 0000).",
    },
  },
  {
    keys: ["commission", "komisyon", "3,75", "3.75", "frais", "frè", "fee"],
    texts: {
      fr: "La commission plateforme est de 3,75 % pour un Compte Basique et de 0 % pour un Premium. Les frais opérateur sont simulés à 0 HTG. Le récapitulatif détaillé s'affiche avant chaque validation d'achat ou de don.",
      ht: "Komisyon platfòm nan se 3,75 % pou yon Kont Bazik e 0 % pou yon Premium. Frè operatè yo simile a 0 HTG. Ou wè tout detay yo anvan ou valide yon acha oswa yon don.",
      en: "The platform fee is 3.75% for a Basic Account and 0% for Premium. Operator fees are simulated at 0 HTG. A detailed summary appears before every purchase or donation is confirmed.",
      es: "La comisión de la plataforma es del 3,75 % para una Cuenta Básica y 0 % para Premium. Las tarifas del operador están simuladas en 0 HTG. Un desglose detallado aparece antes de cada compra o donación.",
    },
  },
  {
    keys: ["wallet", "portefeuille", "retrait", "retrè", "1000", "retir", "bolsa", "saldo", "retiro"],
    texts: {
      fr: "Votre solde en HTG est affiché en permanence en haut à droite de l'en-tête (cliquez dessus pour ouvrir « Mon Portefeuille SOLDE »). Le bouton « Demander un retrait » ne s'active qu'à partir de 1 000 HTG. Chaque vente ou don crédite le wallet dès la validation du code 0000.",
      ht: "Balans ou an HTG toujou parèt anwo adwat nan antèt la (klike sou li pou louvri « Pòtfèy SOLDE mwen »). Bouton « Mande yon retrè » a aktive sèlman depi 1 000 HTG. Chak vant ak chak don kredite wallet la touswit apre kòd 0000.",
      en: "Your HTG balance is always shown at the top right of the header (click it to open “My SOLDE Wallet”). The withdrawal button only unlocks from 1,000 HTG. Every sale or donation credits the wallet as soon as code 0000 is validated.",
      es: "Tu saldo en HTG se muestra siempre arriba a la derecha del encabezado (haz clic para abrir “Mi Billetera SOLDE”). El botón de retiro solo se activa desde 1 000 HTG. Cada venta o donación acredita el wallet en cuanto se valida el código 0000.",
    },
  },
  {
    keys: ["otp", "code", "kòd", "código", "0000", "payer", "peye", "pay", "payer", "acheter", "achte", "buy", "comprar", "pago", "pays", "peman", "moncash", "natcash", "opérateur", "operatè", "operator"],
    texts: {
      fr: "Le paiement est simulé : saisissez votre numéro (8 chiffres), l'opérateur (MonCash ou NatCash) est détecté automatiquement dès les premiers chiffres, le bouton passe en « Traitement… » contre le double débit, puis entrez le code universel 0000. Le téléchargement démarre et l'achat reste dans « Mes achats » tant que les données du navigateur ne sont pas effacées.",
      ht: "Peman an simile : antre nimewo ou a (8 chif), operatè a (MonCash oswa NatCash) detekte otomatikman depi premye chif yo, bouton an pase an « N ap trete… » pou evite double debi, epi antre kòd inivèsèl 0000. Telechajman an kòmanse e acha a rete nan « Acha m yo » jiskaske ou efase done navigatè a.",
      en: "Payment is simulated: type your 8-digit number, the operator (MonCash or NatCash) is detected automatically from the first digits, the button switches to “Processing…” to prevent double charging, then enter the universal code 0000. The download starts and the purchase stays in “My purchases” until the browser data is cleared.",
      es: "El pago es simulado: escribe tu número de 8 dígitos, el operador (MonCash o NatCash) se detecta automáticamente desde los primeros dígitos, el botón pasa a “Procesando…” para evitar doble cargo, luego ingresa el código universal 0000. La descarga inicia y la compra queda en “Mis compras” hasta borrar los datos del navegador.",
    },
  },
  {
    keys: ["musée", "mize", "museum", "museo", "groupe", "gwoup", "gallery collective"],
    texts: {
      fr: "Seuls les membres Premium fondent un musée : titre, photo de profil ronde et courte ligne éditoriale. Les œuvres de tiers passent par une validation manuelle [Accepter] / [Refuser] de l'administrateur.",
      ht: "Se manm Premium ki ka fonde yon mize : tit, foto won ak yon ti liy editoryal. Zèv lòt moun yo bezwen validasyon [Aksepte] / [Refize] administratè a.",
      en: "Only Premium members can found a museum: a title, a round profile photo and a short editorial line. Third-party works require manual [Accept] / [Refuse] validation by the curator.",
      es: "Solo los miembros Premium pueden fundar un museo: un título, una foto redonda y una corta línea editorial. Las obras de terceros requieren validación manual [Aceptar] / [Rechazar] del administrador.",
    },
  },
  {
    keys: ["prix", "concours", "konkou", "award", "sack", "classement", "clasificación", "ranking", "contest", "concurso", "egalite", "égalité", "badge", "point", "pwen", "puntos"],
    texts: {
      fr: "Deux moteurs : le Prix d'impact (ventes + dons, mensuel et annuel, affiché en Points — 1 000 HTG = 1 Point) et le Prix de productivité (œuvres uniques admissibles du mois). En cas d'égalité parfaite, les ex-æquo partagent le même prix et le suivant reçoit le prix directement inférieur. Le calcul est ouvert à tous ; seuls les Premium affichent les badges.",
      ht: "Gen de motè : Pri enpak (vant + don, chak mwa ak chak ane, an Pwen — 1 000 HTG = 1 Pwen) ak Pri pwodiktivite (zèv inik ki kalifye nan mwa a). Si gen egalite pafè, yo pataje menm pri a e moun ki vini apre a resevwa pri ki pi ba a dirèkteman. Tout moun nan kalkil la ; se sèlman Premium ki montre badj yo.",
      en: "Two engines: the Impact Award (sales + donations, monthly and yearly, displayed in Points — 1,000 HTG = 1 Point) and the Productivity Award (unique eligible works of the month). In case of a perfect tie, the ex-aequo share the same prize and the next creator gets the prize directly below. The calculation is open to everyone; only Premium display the badges.",
      es: "Dos motores: el Premio de Impacto (ventas + donaciones, mensual y anual, mostrado en Puntos — 1 000 HTG = 1 Punto) y el Premio de Productividad (obras únicas admisibles del mes). En caso de igualdad perfecta, los ex-aequo comparten el mismo premio y el siguiente recibe el premio inmediatamente inferior. El cálculo está abierto a todos; solo los Premium muestran las insignias.",
    },
  },
  {
    keys: ["publier", "pibliye", "vendre", "vann", "upload", "fichier", "fichye", "file", "mettre en ligne", "publish", "publicar"],
    texts: {
      fr: "Dans « Mettre en ligne », joignez un fichier (.mp3, .pdf, .zip, .jpg, .png, .dwg), un titre, un prix en HTG et une description. La validation exige plus de 150 caractères ; les concours de productivité exigent plus de 100 caractères et un livrable adapté à la catégorie.",
      ht: "Nan « Mete sou liy », ajoute yon fichye (.mp3, .pdf, .zip, .jpg, .png, .dwg), yon tit, yon pri an HTG ak yon deskripsyon. Validasyon an mande plis pase 150 karaktè ; konkou pwodiktivite yo mande plis pase 100 karaktè ak yon livrabl ki adapte a kategori a.",
      en: "In “Publish”, attach a file (.mp3, .pdf, .zip, .jpg, .png, .dwg), a title, a price in HTG and a description. Validation needs 150+ characters; the productivity contests need 100+ characters and a deliverable matching the category.",
      es: "En “Publicar”, adjunta un archivo (.mp3, .pdf, .zip, .jpg, .png, .dwg), un título, un precio en HTG y una descripción. La validación exige 150+ caracteres; los concursos de productividad exigen 100+ caracteres y un entregable acorde a la categoría.",
    },
  },
  {
    keys: ["supprimer", "efase", "delete", "eliminar", "irreversible", "irréversible"],
    texts: {
      fr: "La suppression demande toujours une confirmation. Une fois confirmée, l'œuvre quitte le catalogue public mais reste accessible dans l'historique des clients qui l'avaient acquise.",
      ht: "Sipresyon an mande yon konfimasyon chak fwa. Apre konfimasyon, zèv la kite katalòg piblik la men li rete nan istorik kliyan ki te achte l yo.",
      en: "Deletion always asks for confirmation. Once confirmed, the work leaves the public catalog but stays accessible in the history of the customers who acquired it.",
      es: "La eliminación siempre pide confirmación. Una vez confirmada, la obra sale del catálogo público pero sigue accesible en el historial de los clientes que la adquirieron.",
    },
  },
  {
    keys: ["promote", "billboard", "publicité", "piblisite", "publicidad", "une", "50"],
    texts: {
      fr: "Le bouton « Promote » du Billboard réserve l'emplacement à la une (œuvres ou musées, jusqu'à 30 éléments en rotation de 8 secondes) pendant 24 heures pour 50 HTG. Le tarif n'apparaît que dans la modale de démonstration. Si un musée est promu, les visiteurs entrent directement dans la galerie.",
      ht: "Bouton « Promote » nan Billboard la rezève espas a la yon an (zèv oswa mize, jiska 30 eleman an rotasyon 8 segonn) pandan 24 èdtan pou 50 HTG. Se sèlman nan modale demonstrasyon an pri a parèt. Si yon mize pwomo, vizitè yo antre dirèkteman nan galri a.",
      en: "The Billboard “Promote” button books the featured slot (works or museums, up to 30 items in an 8-second rotation) for 24 hours at 50 HTG. The price only appears in the demo modal. If a museum is promoted, visitors go straight into the gallery.",
      es: "El botón “Promote” del Billboard reserva el espacio destacado (obras o museos, hasta 30 elementos en rotación de 8 segundos) por 24 horas a 50 HTG. El precio solo aparece en la modal de demo. Si se promueve un museo, los visitantes entran directo a la galería.",
    },
  },
  {
    keys: ["thème", "tem", "couleur", "koulè", "color", "colores", "sombre", "nwa", "dark", "bouton", "bouton yo"],
    texts: {
      fr: "L'icône palette en haut à droite change la couleur des boutons (Or, Rouge, Jaune, Vert, Bleu, Marron…) instantanément, et bascule entre Clair & Or et le mode sombre. En sombre, un fond abstrait suit la saison haïtienne.",
      ht: "Ikon palèt anwo adwat la chanje koulè bouton yo touswit (Ò, Wouj, Jòn, Vèt, Ble, Mawon…) epi li pase ant Klè &Ò ak mòd nwa. Nan mòd nwa, yon fon abstrè swiv sezon an Ayiti.",
      en: "The palette icon (top right) instantly changes the action-button color (Gold, Red, Yellow, Green, Blue, Brown…) and toggles Light & Gold / Dark mode. In dark mode, an abstract background follows the Haitian season.",
      es: "El icono de paleta (arriba a la derecha) cambia al instante el color de los botones (Oro, Rojo, Amarillo, Verde, Azul, Marrón…) y alterna entre Claro y Oro / Modo oscuro. En modo oscuro, un fondo abstracto sigue la estación haitiana.",
    },
  },
  {
    keys: ["langue", "lang", "language", "idioma", "créole", "kreyòl", "kreyol", "français", "anglais", "english", "espagnol", "español", "english?"],
    texts: {
      fr: "L'interface parle français, créole haïtien, anglais et espagnol : palette → Langue. J'adapte aussi mes réponses à la langue de vos messages. La seule devise est la gourde (HTG).",
      ht: "Entèfas la pale franse, kreyòl ayisyen, angle ak espanyòl : palèt → Langue. Mwen adapte repons mwen yo nan lang mesaj ou yo tou. Sèl lajan se goud (HTG).",
      en: "The interface speaks French, Haitian Creole, English and Spanish: palette → Language. I also answer in the language of your messages. The only currency is the gourde (HTG).",
      es: "La interfaz habla francés, criollo haitiano, inglés y español: paleta → Idioma. También respondo en el idioma de tus mensajes. La única moneda es la gourde (HTG).",
    },
  },
  {
    keys: ["vidéo", "video", "videyo", "vídeo", "extrait", "10 secondes", "mp4"],
    texts: {
      fr: "Pour la photographie et vidéo, la V1 n'affiche qu'une vignette statique. Le module d'extrait de 10 secondes est préparé mais en attente : il nécessitera un transcodage serveur en V2.",
      ht: "Pou foto ak videyo, V1 an montre sèlman yon imaj fiks. Modil ekstrè 10 segonn nan prepare men li poko aktive : l ap bezwen transkodaj sèvè nan V2.",
      en: "For photo and video, V1 only shows a static thumbnail. The 10-second clip module is prepared but pending: it will require server transcoding in V2.",
      es: "Para fotografía y vídeo, la V1 solo muestra una miniatura estática. El módulo de clip de 10 segundos está preparado pero pendiente: requerirá transcodificación en servidor en la V2.",
    },
  },
  {
    keys: ["message", "messages", "mesaj", "mensajes", "30 jours", "30 jou", "30 days", "30 días"],
    texts: {
      fr: "Chaque compte possède un bouton « Messages » dans son espace personnel : la boîte privée reste masquée et se déroule au clic. Les échanges sont simulés, chaque message est horodaté et tout message de plus de 30 jours est supprimé automatiquement de la mémoire locale.",
      ht: "Chak kont gen yon bouton « Mesaj » nan espas pèsonèl li : bwat prive a kache e li louvri lè ou klike. Echanj yo simile, chak mesaj gen dat li, e tout mesaj ki gen plis pase 30 jou efase otomatikman nan memwa lokal la.",
      en: "Every account has a “Messages” button in its personal space: the private inbox stays hidden and unfolds on click. Exchanges are simulated, every message is timestamped, and any message older than 30 days is automatically deleted from local memory.",
      es: "Cada cuenta tiene un botón “Mensajes” en su espacio personal: la bandeja privada permanece oculta y se despliega al hacer clic. Los intercambios son simulados, cada mensaje tiene fecha, y cualquier mensaje de más de 30 días se elimina automáticamente de la memoria local.",
    },
  },
];

const BUG_KEYS = [
  "bug", "bogue", "anomalie", "double débit", "debite", "débité deux", "pa mache", "pamache", "arnaque", "volé",
  "erreur de paiement", "echec", "échec", "perdu mon argent", "pèdi", "rembourse", "rembours",
  "bug ", "bug!", "not working", "doesn't work", "double charg", "double charge", "charged twice",
  "no funciona", "cargado dos", "pago falló", "pago fallo", "estafa",
];

const GREETINGS: Record<Lang, string> = {
  fr: "Bonjou… Bonjour ! Je suis l'agent de support SOLDE gallery. Je vous guide sur la plateforme, en français, kreyòl, anglais ou espagnol. Je ne rédige pas de contenu : uniquement de l'aide sur le site. Écrivez-moi librement ci-dessous.",
  ht: "Bonjou ! Mwen se asistan sipò SOLDE gallery a. Mwen ap gide w sou platfòm nan, an franse, kreyòl, angle oswa espanyòl. Mwen pa ekri kontni : sèlman èd sou sit la. Ekri m lib nan chan an anba a.",
  en: "Hello! I'm the SOLDE gallery support agent. I guide you through the platform in French, Kreyòl, English or Spanish. I don't create content: site help only. Feel free to type below.",
  es: "¡Hola! Soy el agente de soporte de SOLDE gallery. Te oriento por la plataforma en francés, criollo, inglés o español. No creo contenido: solo ayuda sobre el sitio. Escribe libremente abajo.",
};

/* Heuristique de détection de langue (ordre : kreyòl → anglais
   → espagnol → français par défaut). */
function detectLang(raw: string): Lang {
  const s = raw.toLowerCase();
  if (/(bonjou|mwen|kreyòl|kreyol|peye|achte|goud|kòman|ki fè|tanpri|poko|dèyè|lòt moun|estidyo)/.test(s)) return "ht";
  if (/\b(hello|hi\b|how |what|my |the |pay|wallet|premium|buy|help|code|otp|message|delete|publish|price|free|account)\b/.test(s)) return "en";
  if (/\b(hola|como|c\u00f3mo|gracias|quiero|pago|comprar|precio|ayuda|c\u00f3digo|cuenta|bolsa|publicar|eliminar|mensajes|para|de |el |la )\b/.test(s)) return "es";
  return "fr";
}

/* ---- Intentions conversationnelles (au-delà de la base de support) ---- */
const GREET_WORDS = ["bonjour", "bonsoir", "salut", "bonjou", "bonswa", "alo", "hello", "hi ", "hey", "hola", "buenas"];
const THANKS_WORDS = ["merci", "mèsi", "mesi", "thanks", "thank you", "gracias"];
const BALANCE_WORDS = ["mon solde", "mon portefeuille", "balans mwen", "pòtfèy mwen", "my balance", "my wallet", "mi saldo", "mi billetera", "combien j'ai", "how much do i have", "cuánto tengo", "konbyen mwen genyen"];

const SMALLTALK: Record<"hello" | "thanks", Record<Lang, string>> = {
  hello: {
    fr: "Bonjour ! Dites-moi ce que vous voulez faire sur SOLDE gallery (acheter, publier, wallet, musées, concours, messages…) et je vous guide.",
    ht: "Bonjou ! Di m sa ou vle fè sou SOLDE gallery (achte, pibliye, wallet, mize, konkou, mesaj…) epi m ap gide w.",
    en: "Hello! Tell me what you'd like to do on SOLDE gallery (buy, publish, wallet, museums, contests, messages…) and I'll guide you.",
    es: "¡Hola! Dime qué quieres hacer en SOLDE gallery (comprar, publicar, wallet, museos, concursos, mensajes…) y te oriento.",
  },
  thanks: {
    fr: "Avec plaisir ! Je reste disponible si vous avez une autre question sur la plateforme.",
    ht: "Avèk plezi ! Mwen la toujou si ou gen yon lòt kesyon sou platfòm nan.",
    en: "You're welcome! I'm here if you have another question about the platform.",
    es: "¡Con gusto! Sigo disponible si tienes otra pregunta sobre la plataforma.",
  },
};

export function Assistant() {
  const { chatOpen, setChatOpen } = useUI();
  const { lang, raiseTicket, notify, user } = useStore();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  /* Salutation dans la langue active au premier ouvert */
  useEffect(() => {
    if (chatOpen && msgs.length === 0) {
      setMsgs([{ id: "hello", from: "bot", text: GREETINGS[lang] }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs, typing, chatOpen]);

  /* Réponse libre : détection de la langue du message puis réponse dans cette langue.
     Ordre de priorité : anomalie de paiement (escalade) → solde → politesse → base de support. */
  const answer = (text: string, userLang: Lang) => {
    const q = text.toLowerCase();
    setMsgs((m) => [...m, { id: `u${Date.now()}`, from: "user", text }]);
    setTyping(true);
    timers.current.push(
      window.setTimeout(() => {
        setTyping(false);
        const say = (reply: string, alert = false) =>
          setMsgs((m) => [...m, { id: `b${Date.now()}`, from: "bot", text: reply, alert }]);

        /* Anomalie de paiement → escalade immédiate visible pour l'administrateur */
        if (BUG_KEYS.some((k) => q.includes(k))) {
          const ticket = raiseTicket("Anomalie de paiement signalée via l'agent", `${user?.name ?? "Visiteur"} : « ${text} »`, "haute");
          notify({ title: "Escalade administrateur", body: `Ticket ${ticket.id} · priorité haute`, tone: "danger" });
          const esc: Record<Lang, string> = {
            fr: `ALERTE — Escalade immédiate. Ticket ${ticket.id} ouvert en priorité haute, affiché à l'administrateur. Aucun débit réel n'existe dans cette démonstration : ne communiquez jamais un vrai code de paiement.`,
            ht: `ALERTE — Escalad imedyat. Ticket ${ticket.id} ouvri an priyorite wo, afiche bay administratè a. Okenn debi reyèl pa genyen nan demonstrasyon sa a : pa janm bay yon kòd peman vre.`,
            en: `ALERT — Immediate escalation. Ticket ${ticket.id} opened with high priority and shown to the administrator. No real charge exists in this demo: never share a real payment code.`,
            es: `ALERTA — Escalada inmediata. Ticket ${ticket.id} abierto con prioridad alta y mostrado al administrador. No existe cargo real en esta demo: nunca compartas un código de pago real.`,
          };
          return say(esc[userLang], true);
        }

        /* Solde réel du portefeuille de la personne connectée */
        if (BALANCE_WORDS.some((k) => q.includes(k))) {
          const amount = user ? new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(user.wallet) : null;
          const bal: Record<Lang, string> = {
            fr: amount ? `Votre solde disponible est de ${amount} HTG (affiché en permanence en haut à droite de l'en-tête). Le retrait s'active à partir de 1 000 HTG.` : "Connectez-vous pour consulter votre portefeuille : votre solde s'affiche alors en permanence en haut à droite de l'en-tête.",
            ht: amount ? `Balans disponib ou se ${amount} HTG (toujou parèt anwo adwat nan antèt la). Retrè a aktive depi 1 000 HTG.` : "Konekte pou wè pòtfèy ou : balans ou ap parèt toujou anwo adwat nan antèt la.",
            en: amount ? `Your available balance is ${amount} HTG (always shown at the top right of the header). Withdrawal unlocks from 1,000 HTG.` : "Sign in to see your wallet: your balance then stays visible at the top right of the header.",
            es: amount ? `Tu saldo disponible es ${amount} HTG (siempre visible arriba a la derecha del encabezado). El retiro se activa desde 1 000 HTG.` : "Inicia sesión para ver tu billetera: tu saldo queda visible arriba a la derecha del encabezado.",
          };
          return say(bal[userLang]);
        }

        if (THANKS_WORDS.some((k) => q.includes(k))) return say(SMALLTALK.thanks[userLang]);

        const hit = KB.find((k) => k.keys.some((w) => q.includes(w)));
        if (hit) return say(hit.texts[userLang]);

        if (GREET_WORDS.some((k) => q.startsWith(k) || q.includes(` ${k}`))) return say(SMALLTALK.hello[userLang]);

        const outOfScope: Record<Lang, string> = {
          fr: "Je suis limité au support de la plateforme (compte, paiement simulé, wallet, musées, concours, publication, messages). Je ne peux pas traiter d'autres demandes — reformulez votre question avec vos propres mots.",
          ht: "Mwen limite nan sipò platfòm nan (kont, peman simile, wallet, mize, konkou, pibliye, mesaj). Mwen pa ka trete lòt demand yo — reformile kesyon ou ak pwòp mo ou.",
          en: "I'm limited to platform support (account, simulated payment, wallet, museums, contests, publishing, messages). I can't handle other requests — please rephrase your question in your own words.",
          es: "Estoy limitado al soporte de la plataforma (cuenta, pago simulado, wallet, museos, concursos, publicación, mensajes). No puedo atender otras solicitudes — reformula tu pregunta con tus propias palabras.",
        };
        say(outOfScope[userLang]);
      }, 650),
    );
  };

  if (!chatOpen) return null;

  return (
    <div id="assistant-panel" data-testid="assistant-panel" className="pop fixed right-3 bottom-[148px] z-[100] flex h-[min(560px,calc(100vh-220px))] w-[min(380px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-line bg-overlay shadow-[var(--shadow-lg)] lg:bottom-[108px]">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="relative grid h-10 w-10 place-items-center rounded-full bg-accent text-accentink">
          <Icon name="sparkles" className="h-5 w-5" />
          <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-overlay bg-success" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-ink">Agent SOLDE</p>
          <p className="truncate text-[11.5px] text-muted">FR · Kreyòl · EN · ES — détection auto · périmètre support</p>
        </div>
        <button onClick={() => setChatOpen(false)} aria-label="Fermer l'assistant" className="focus-ring grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface2 hover:text-ink">
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {msgs.map((m) => (
          <div key={m.id} className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                m.from === "user"
                  ? "bg-accent text-accentink"
                  : m.alert
                    ? "border border-danger/50 bg-danger/10 text-ink"
                    : "border border-line bg-surface2 text-inksoft",
              )}
            >
              {m.alert && (
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-danger uppercase">
                  <Icon name="alert" className="h-3.5 w-3.5" /> Escalade administrateur
                </p>
              )}
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex gap-1.5 px-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
        )}
      </div>

      {/* Champ de saisie libre — seule interaction : plus aucun bouton-FAQ statique */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          answer(input.trim(), detectLang(input));
          setInput("");
        }}
        className="flex items-center gap-2 border-t border-line px-3 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            lang === "ht" ? "Ekri lib an Franse, Kreyòl, Angle oswa Espanyòl…"
            : lang === "en"
              ? "Type freely in French, Kreyòl, English or Spanish…"
              : lang === "es"
                ? "Escribe libremente en francés, criollo, inglés o español…"
                : "Écrivez librement en français, kreyòl, anglais ou espagnol…"
          }
          className="focus-ring h-10 flex-1 rounded-full border border-line bg-surface px-4 text-[13px] text-ink placeholder:text-muted/80 focus:border-accent"
        />
        <Button size="sm" className="h-10 w-10 !px-0" aria-label="Envoyer" type="submit">
          <Icon name="send" className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

/* Bandeau d'alerte administrateur (escalade immédiate) */
export function AdminAlerts() {
  const { db } = useStore();
  const [hidden, setHidden] = useState<string[]>([]);
  const tickets = db.tickets.filter((t) => t.severity === "haute" && !hidden.includes(t.id)).slice(0, 1);
  if (!tickets.length) return null;
  const t = tickets[0];
  return (
    <div className="sticky top-[112px] z-[80] mb-5">
      <div className="pop mx-auto flex max-w-3xl items-start gap-3 rounded-2xl border border-danger/50 bg-overlay p-3.5 shadow-[var(--shadow-lg)]">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-danger/12 text-danger">
          <Icon name="alert" className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-bold tracking-wide text-danger uppercase">
            Alerte administrateur · priorité haute · {t.id}
          </p>
          <p className="mt-0.5 text-[13px] text-ink">{t.subject}</p>
          <p className="mt-0.5 truncate text-[12px] text-muted">{t.message}</p>
        </div>
        <button
          onClick={() => setHidden((h) => [...h, t.id])}
          className="focus-ring rounded-full border border-line px-3 py-1.5 text-[12px] font-semibold text-inksoft transition hover:border-accent"
        >
          Prendre en charge
        </button>
      </div>
    </div>
  );
}
