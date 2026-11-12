import type { DB, LedgerEntry, User, Work, Museum, Message } from "./types";
import { commissionRate, MUSEUM_ADMIN_RATE, MUSEUM_TOTAL_RATE } from "./types";
import billboard from "../assets/billboard.jpg";
import soley from "../assets/soley.jpg";
import bluehour from "../assets/bluehour.jpg";
import artImg from "../assets/art.jpg";
import archi from "../assets/archi.jpg";
import book from "../assets/book.jpg";
import photo from "../assets/photo.jpg";

export const HERO_IMAGE = billboard;

const now = new Date();
const Y = now.getFullYear();
const M = now.getMonth();
const D = now.getDate();

/** Date du mois courant, jamais dans le futur (classements mensuels toujours peuplés). */
const thisMonth = (day: number, h = 11) =>
  new Date(Y, M, Math.min(day, D), h, (day * 7) % 60).toISOString();
/** Date d'un mois antérieur de l'année en cours (classement annuel). */
const earlier = (mAgo: number, day = 12) => new Date(Y, M - mAgo, day, 15, 20).toISOString();

const premium = (plan: "mensuel" | "annuel", mAgo: number) => ({
  active: true,
  plan,
  since: earlier(mAgo, 3),
  until: new Date(Y + 1, M, 3).toISOString(),
});

const users: User[] = [
  {
    id: "u_marie",
    name: "Marie Toussaint",
    handle: "marie.t",
    email: "marie.toussaint@demo.ht",
    city: "Pétion-Ville",
    bio: "Collectionneuse de sons et de récits. Je soutiens les créateurs indépendants d'Haïti, un titre à la fois.",
    hue: 32,
    isCreator: false,
    premium: null,
    trades: [],
    interests: ["musique", "livres", "photo"],
    wallet: 0,
    joinedAt: earlier(5, 8),
    followers: 0,
  },
  {
    id: "u_milo",
    name: "Milo Grey",
    handle: "milogrey",
    email: "milo.grey@demo.ht",
    city: "Port-au-Prince",
    bio: "Producteur et guitariste. Je compose entre le jazz créole et les rythmes rara, la nuit, quand la ville respire.",
    socials: { instagram: "milogrey.music", youtube: "milogrey" },
    hue: 212,
    isCreator: true,
    premium: null,
    trades: ["Musicien", "Entrepreneur"],
    interests: ["musique", "photo"],
    wallet: 1240,
    joinedAt: earlier(9, 2),
    followers: 1284,
  },
  {
    id: "u_nadia",
    name: "Nadia Pierre",
    handle: "nadiapierre",
    email: "nadia.pierre@demo.ht",
    city: "Cap-Haïtien",
    bio: "Rédactrice de projets et autrice. J'écris des business plans qui tiennent debout sur le terrain haïtien.",
    socials: { website: "nadiapierre.ht", facebook: "nadiapierre.conseil" },
    hue: 320,
    isCreator: true,
    premium: premium("annuel", 4),
    trades: ["Écrivain", "Rédacteur de projets", "Entrepreneur"],
    interests: ["livres", "projets", "art"],
    wallet: 4820,
    joinedAt: earlier(11, 14),
    followers: 2140,
  },
  {
    id: "u_lea",
    name: "Léa Joseph",
    handle: "leajoseph",
    email: "lea.joseph@demo.ht",
    city: "Jacmel",
    bio: "Voix, textes et lumière. Je chante le Sud-Est, ses matins de poussière et ses soirées de sel.",
    socials: { instagram: "leajoseph", tiktok: "leajoseph.chante" },
    hue: 18,
    isCreator: true,
    premium: premium("mensuel", 2),
    trades: ["Musicien", "Écrivain"],
    interests: ["musique", "livres"],
    wallet: 620,
    joinedAt: earlier(8, 21),
    followers: 3310,
  },
  {
    id: "u_numa",
    name: "Atelier Numa",
    handle: "ateliernuma",
    email: "studio@numa.demo.ht",
    city: "Kenscoff",
    bio: "Agence d'architecture tropicale. Nous dessinons des maisons qui respirent, à l'ombre et au vent.",
    socials: { website: "ateliernuma.ht", instagram: "atelier.numa" },
    hue: 96,
    isCreator: true,
    premium: premium("mensuel", 3),
    trades: ["Architecte", "Entrepreneur"],
    interests: ["architecture", "photo"],
    wallet: 9150,
    joinedAt: earlier(10, 5),
    followers: 1760,
  },
  {
    id: "u_wide",
    name: "Widelène Bazile",
    handle: "widelene",
    email: "widelene.bazile@demo.ht",
    city: "Les Cayes",
    bio: "Peintre. La couleur comme mémoire : marchés, tap-tap, visages et lumières du Sud.",
    hue: 348,
    isCreator: true,
    premium: null,
    trades: ["Artiste / Peintre"],
    interests: ["art", "photo"],
    wallet: 380,
    joinedAt: earlier(6, 17),
    followers: 940,
  },
  {
    id: "u_kenji",
    name: "Kenji Auguste",
    handle: "kenji.auguste",
    email: "kenji.auguste@demo.ht",
    city: "Jacmel",
    bio: "Photographe documentaire. Je marche les rues au petit matin, argentique et numérique mêlés.",
    hue: 190,
    isCreator: true,
    premium: null,
    trades: ["Photographe / Vidéaste", "Entrepreneur"],
    interests: ["photo", "art"],
    wallet: 210,
    joinedAt: earlier(7, 9),
    followers: 1120,
  },
  {
    id: "u_fabiola",
    name: "Fabiola Saint-Louis",
    handle: "fabiola.sl",
    email: "fabiola.sl@demo.ht",
    city: "Port-au-Prince",
    bio: "Réalisatrice et curatrice. Je documente les fêtes populaires et je monte des expositions collectives.",
    hue: 268,
    isCreator: true,
    premium: premium("mensuel", 1),
    trades: ["Photographe / Vidéaste", "Entrepreneur", "Rédacteur de projets"],
    interests: ["photo", "projets"],
    wallet: 2680,
    joinedAt: earlier(9, 26),
    followers: 1990,
  },
  {
    id: "u_ronald",
    name: "Ronald Étienne",
    handle: "ronald.etienne",
    email: "ronald.etienne@demo.ht",
    city: "Gonaïves",
    bio: "Rédacteur de projets agricoles. Je transforme les idées de coopératives en dossiers finançables.",
    hue: 142,
    isCreator: true,
    premium: null,
    trades: ["Rédacteur de projets", "Entrepreneur"],
    interests: ["projets", "livres"],
    wallet: 760,
    joinedAt: earlier(4, 11),
    followers: 430,
  },
  /* Administrateur de la plateforme : n'est pas créateur mais consulte
     l'intégralité des flux privés (notifications d'achat/téléchargement). */
  {
    id: "u_admin",
    name: "Direction SOLDE",
    handle: "direction.solde",
    email: "direction@solde.demo.ht",
    city: "Port-au-Prince",
    bio: "Équipe d'administration de la plateforme SOLDE gallery.",
    hue: 220,
    isCreator: false,
    isAdmin: true,
    premium: null,
    trades: [],
    interests: [],
    wallet: 0,
    joinedAt: earlier(12, 1),
    followers: 0,
  },
];

const L = (t: number, fr: string, ht: string) => ({ t, fr, ht });

const works: Work[] = [
  {
    id: "w_blue",
    title: "Blue Hour",
    creatorId: "u_milo",
    category: "musique",
    kind: "mp3",
    price: 480,
    subtitle: "Single · Jazz créole",
    description:
      "Enregistré entre minuit et l'aube dans un studio de fortune de Turgeau. Guitare nylon, contrebasse ronde et nappes de synthétiseur analogique : Blue Hour raconte la ville quand elle arrête de crier. Mixage analogique, master 24 bits.",
    fileName: "blue-hour-master.mp3",
    fileSize: "8,4 Mo",
    cover: bluehour,
    palette: ["#1b3a63", "#3f6f9e", "#e8dcc0"],
    motif: "waves",
    createdAt: thisMonth(3),
    approved: true,
    tags: ["Jazz", "Nuit", "Instrumental"],
    duration: 96,
    synthSeed: 7,
    plays: 4820,
    favoritesCount: 128,
    lyrics: [
      L(0, "Lanp yo ap etenn tou dousman", "Lanp yo ap etenn tou dousman"),
      L(9, "Les lampes s'éteignent une à une", "Lanp yo ap etenn youn pa youn"),
      L(18, "La ville retient son souffle", "Vil la kenbe souf li"),
      L(27, "Blue hour, blue hour", "Blue hour, blue hour"),
      L(36, "Le sel reste sur nos mains", "Sèl la rete sou men nou"),
      L(46, "Et la mer compte nos pas", "Epi lanmè a konte pa nou"),
      L(56, "Kenbe fèm, ti frè mwen", "Kenbe fèm, ti frè mwen"),
      L(66, "Tiens bon, mon petit frère", "Kenbe fèm, ti frè mwen"),
      L(76, "Demain nous ouvre encore", "Demen ap louvri pou nou ankò"),
      L(86, "Blue hour… blue hour…", "Blue hour… blue hour…"),
    ],
  },
  {
    id: "w_soley",
    title: "Soley Leve",
    creatorId: "u_lea",
    category: "musique",
    kind: "mp3",
    price: 350,
    subtitle: "EP · Rasin soul",
    description:
      "Quatre titres écrits face à la baie de Jacmel, portés par une voix chaude, un tambour battant et des chœurs de quartier. Soley Leve parle de recommencement, de marché du samedi et de la patience des femmes qui portent le pays.",
    fileName: "soley-leve-ep.mp3",
    fileSize: "11,2 Mo",
    cover: soley,
    palette: ["#c2542c", "#e8a06a", "#f6e3c6"],
    motif: "sun",
    createdAt: thisMonth(5),
    approved: true,
    tags: ["Rasin", "Soul", "Créole"],
    duration: 108,
    synthSeed: 21,
    plays: 7310,
    favoritesCount: 214,
    lyrics: [
      L(0, "Soley leve sou mòn yo", "Soley leve sou mòn yo"),
      L(10, "Le soleil se lève sur les mornes", "Soley leve sou mòn yo"),
      L(20, "Machann yo pran lari a", "Machann yo pran lari a"),
      L(30, "Les marchandes prennent la rue", "Machann yo pran lari a"),
      L(40, "Chak jou se yon chans", "Chak jou se yon chans"),
      L(50, "Chaque jour est une chance", "Chak jou se yon chans"),
      L(60, "Nou p ap lage men an", "Nou p ap lage men an"),
      L(70, "Nous ne lâchons pas la main", "Nou p ap lage men an"),
      L(82, "Soley leve, soley leve", "Soley leve, soley leve"),
      L(94, "Le pays respire encore", "Peyi a ap respire toujou"),
    ],
  },
  {
    id: "w_rara",
    title: "Rara Nou",
    creatorId: "u_milo",
    category: "musique",
    kind: "mp3",
    price: 0,
    subtitle: "Single · Offert à la communauté",
    description:
      "Un vaksin enregistré en une prise, offert librement à la communauté SOLDE gallery. Rythme rara traditionnel, sifflets et percussions, capté lors d'une répétition de quartier à Bel Air. Téléchargement libre, licence personnelle.",
    fileName: "rara-nou-live.mp3",
    fileSize: "6,1 Mo",
    palette: ["#7a1f3d", "#c8232c", "#f0c04a"],
    motif: "disc",
    createdAt: thisMonth(9),
    approved: true,
    tags: ["Rara", "Live", "Gratuit"],
    duration: 84,
    synthSeed: 42,
    plays: 2140,
    favoritesCount: 96,
    lyrics: [
      L(0, "Vaksin ap rele", "Vaksin ap rele"),
      L(12, "Le vaksin appelle", "Vaksin ap rele"),
      L(24, "Lari a louvri", "Lari a louvri"),
      L(36, "La rue s'ouvre", "Lari a louvri"),
      L(48, "Nou mache ansanm", "Nou mache ansanm"),
      L(60, "Nous marchons ensemble", "Nou mache ansanm"),
      L(72, "Rara nou, rara nou", "Rara nou, rara nou"),
    ],
  },
  {
    id: "w_lakou",
    title: "Lakou Nocturne",
    creatorId: "u_lea",
    category: "musique",
    kind: "mp3",
    price: 620,
    subtitle: "Album · 9 titres",
    description:
      "Neuf titres enregistrés dans une cour familiale de Jacmel, avec les bruits du soir laissés volontairement dans le mix : grillons, tôles, rires lointains. Un album intime sur la mémoire des maisons créoles.",
    fileName: "lakou-nocturne-album.mp3",
    fileSize: "42,7 Mo",
    palette: ["#2b2340", "#6b4b8a", "#e5c07b"],
    motif: "disc",
    createdAt: thisMonth(14),
    approved: true,
    tags: ["Album", "Ambient", "Créole"],
    duration: 90,
    synthSeed: 63,
    plays: 3050,
    favoritesCount: 87,
    lyrics: [
      L(0, "Lakou a ap dòmi", "Lakou a ap dòmi"),
      L(14, "La cour s'endort", "Lakou a ap dòmi"),
      L(28, "Mwen sonje tout bagay", "Mwen sonje tout bagay"),
      L(42, "Je me souviens de tout", "Mwen sonje tout bagay"),
      L(58, "Lapli sou tòl la", "Lapli sou tòl la"),
      L(74, "La pluie sur la tôle", "Lapli sou tòl la"),
    ],
  },
  {
    id: "w_jacmel",
    title: "Jacmel, l'heure dorée",
    creatorId: "u_kenji",
    category: "photo",
    kind: "jpg",
    price: 900,
    subtitle: "Tirage numérique · 6000 px",
    description:
      "Coucher de soleil sur les façades pastel de la rue du Commerce. Prise de vue argentique numérisée en très haute définition, grain conservé, prête pour un tirage jusqu'à 80 cm. Certificat d'authenticité signé inclus.",
    fileName: "jacmel-heure-doree.jpg",
    fileSize: "24,8 Mo",
    cover: photo,
    palette: ["#0e6f8a", "#e0a106", "#f4e7d2"],
    motif: "lens",
    createdAt: thisMonth(2),
    approved: true,
    tags: ["Argentique", "Rue", "Sud-Est"],
    plays: 1620,
    favoritesCount: 74,
  },
  {
    id: "w_carnaval",
    title: "Carnaval des Fleurs — séquence",
    creatorId: "u_fabiola",
    category: "photo",
    kind: "mp4",
    price: 1500,
    subtitle: "Vidéo 4K · 3 min 20",
    description:
      "Séquence documentaire tournée sur trois jours de Carnaval des Fleurs : chars, fanfares, danseurs de fouet. Étalonnage cinéma, son stéréo pris sur place. La fiche n'expose qu'une image fixe, la vidéo complète est livrée après achat.",
    fileName: "carnaval-des-fleurs-4k.mp4",
    fileSize: "612 Mo",
    palette: ["#b5296b", "#e0a106", "#1d4ed8"],
    motif: "lens",
    createdAt: thisMonth(7),
    approved: true,
    tags: ["Documentaire", "4K", "Fête"],
    plays: 2480,
    favoritesCount: 152,
  },
  {
    id: "w_marche",
    title: "Portraits de Marché",
    creatorId: "u_kenji",
    category: "photo",
    kind: "zip",
    price: 1200,
    subtitle: "Série · 12 photographies",
    description:
      "Douze portraits réalisés au marché de Ferrier, avec l'accord des personnes photographiées. Chaque fichier est livré en RAW et JPEG, accompagné d'une courte note de terrain en français et en créole.",
    fileName: "portraits-de-marche.zip",
    fileSize: "348 Mo",
    palette: ["#8a6420", "#c2542c", "#eadfc6"],
    motif: "grid",
    createdAt: thisMonth(11),
    approved: true,
    tags: ["Série", "RAW", "Documentaire"],
    plays: 870,
    favoritesCount: 61,
  },
  {
    id: "w_mangues",
    title: "Marché aux Mangues",
    creatorId: "u_wide",
    category: "art",
    kind: "png",
    price: 4500,
    subtitle: "Acrylique sur toile · 90 × 90 cm",
    description:
      "Toile originale photographiée en très haute définition avant expédition. Palette verte, safran et magenta, composition foisonnante typique du marché du samedi aux Cayes. Le fichier numérique est vendu avec licence d'exposition personnelle.",
    fileName: "marche-aux-mangues-hd.png",
    fileSize: "56,3 Mo",
    cover: artImg,
    palette: ["#1f8a5b", "#e0a106", "#b5296b"],
    motif: "brush",
    createdAt: thisMonth(4),
    approved: true,
    tags: ["Original", "Couleur", "Marché"],
    plays: 2210,
    favoritesCount: 183,
  },
  {
    id: "w_repos",
    title: "Femme au Repos",
    creatorId: "u_wide",
    category: "art",
    kind: "jpg",
    price: 3200,
    subtitle: "Huile sur bois · 60 × 80 cm",
    description:
      "Une figure assise à l'ombre d'un manguier, traitée en aplats profonds. Le travail sur le bleu rappelle les intérieurs créoles des années soixante-dix. Reproduction numérique haute définition, cadre non inclus.",
    fileName: "femme-au-repos.jpg",
    fileSize: "31,2 Mo",
    palette: ["#1b3a63", "#c2542c", "#f2e2c4"],
    motif: "brush",
    createdAt: thisMonth(8),
    approved: true,
    tags: ["Portrait", "Huile", "Bleu"],
    plays: 1340,
    favoritesCount: 112,
  },
  {
    id: "w_taptap",
    title: "Tap-Tap Chromatique",
    creatorId: "u_wide",
    category: "art",
    kind: "png",
    price: 2800,
    subtitle: "Sérigraphie · édition de 40",
    description:
      "Sérigraphie six couleurs inspirée des tap-tap de la route des Cayes. Chaque exemplaire est numéroté et signé au crayon ; le fichier numérique sert de certificat et de prévisualisation haute fidélité pour l'acquéreur.",
    fileName: "tap-tap-chromatique.png",
    fileSize: "22,9 Mo",
    palette: ["#c8232c", "#1d4ed8", "#f0c04a"],
    motif: "brush",
    createdAt: thisMonth(16),
    approved: true,
    tags: ["Sérigraphie", "Édition", "Transport"],
    plays: 1610,
    favoritesCount: 94,
  },
  {
    id: "w_cour",
    title: "Maison Cour intérieure",
    creatorId: "u_numa",
    category: "architecture",
    kind: "zip",
    price: 7500,
    subtitle: "Plans + 3D · dossier complet",
    description:
      "Dossier complet d'une maison à patio de 145 m² conçue pour le climat tropical : plans côtés, coupes bioclimatiques, détails de louver en bois local et scène 3D. Fichiers DWG, PDF et rendus, prêts pour dépôt de permis.",
    fileName: "maison-cour-interieure.zip",
    fileSize: "184 Mo",
    cover: archi,
    palette: ["#8a8a6a", "#d8c8a8", "#3f4a34"],
    motif: "plan",
    createdAt: thisMonth(6),
    approved: true,
    tags: ["DWG", "Bioclimatique", "Patio"],
    plays: 3120,
    favoritesCount: 167,
  },
  {
    id: "w_belair",
    title: "Villa Bel Air — Étude",
    creatorId: "u_numa",
    category: "architecture",
    kind: "dwg",
    price: 5400,
    subtitle: "Fichier DWG · niveau permis",
    description:
      "Étude complète d'une villa en gradins sur pente forte à Bel Air : structure parasismique, récupération d'eau de pluie, ventilation traversante. Le DWG est organisé par calques normalisés et livré avec sa note de calcul.",
    fileName: "villa-bel-air-etude.dwg",
    fileSize: "18,4 Mo",
    palette: ["#2f4f4f", "#a8b8a0", "#e9e2d0"],
    motif: "plan",
    createdAt: thisMonth(12),
    approved: true,
    tags: ["Parasismique", "Pente", "DWG"],
    plays: 1480,
    favoritesCount: 83,
  },
  {
    id: "w_kenscoff",
    title: "École de Kenscoff — Esquisse",
    creatorId: "u_numa",
    category: "architecture",
    kind: "pdf",
    price: 2400,
    subtitle: "Carnet d'esquisse · 32 pages",
    description:
      "Carnet de conception d'une école de six classes en altitude : croquis à la main, schémas de ventilation naturelle, choix des matériaux locaux et phasage de chantier en trois saisons. Un document de méthode autant qu'un projet.",
    fileName: "ecole-kenscoff-esquisse.pdf",
    fileSize: "27,1 Mo",
    palette: ["#6b7f5a", "#c9b48a", "#f3efe2"],
    motif: "plan",
    createdAt: thisMonth(18),
    approved: true,
    tags: ["École", "Esquisse", "Altitude"],
    plays: 640,
    favoritesCount: 45,
  },
  {
    id: "w_kit",
    title: "Le kit du créateur indé",
    creatorId: "u_nadia",
    category: "livres",
    kind: "pdf",
    price: 1800,
    subtitle: "Guide + modèles · 148 pages",
    description:
      "Un manuel opérationnel pour vivre de sa création en Haïti : fixer ses prix en gourdes, structurer une offre, négocier avec une marque, préparer ses dossiers fiscaux et bâtir une audience sans budget publicitaire. Livré avec douze modèles de documents réutilisables, des grilles de calcul et des scripts de démarchage testés sur le terrain cap-haïtien.",
    fileName: "kit-createur-inde.pdf",
    fileSize: "14,6 Mo",
    cover: book,
    palette: ["#1f4d3a", "#c08a2e", "#f4ead6"],
    motif: "page",
    createdAt: thisMonth(1),
    approved: true,
    confidential: true,
    tags: ["Guide", "Modèles", "Business"],
    plays: 5240,
    favoritesCount: 241,
  },
  {
    id: "w_boussole",
    title: "Boussole — récit d'une traversée",
    creatorId: "u_lea",
    category: "livres",
    kind: "pdf",
    price: 950,
    subtitle: "Récit · 96 pages",
    description:
      "Le récit d'une traversée entre Jacmel et Jérémie, à la recherche d'une maison vendue trop vite. Une écriture sensorielle, en français, ponctuée de chants créoles. Mise en page soignée, typographie lettrine, lecture confortable sur écran comme sur papier.",
    fileName: "boussole-recit.pdf",
    fileSize: "6,8 Mo",
    palette: ["#3a4a6b", "#c9a227", "#efe6d2"],
    motif: "page",
    createdAt: thisMonth(10),
    approved: true,
    confidential: true,
    tags: ["Récit", "Voyage", "Créole"],
    plays: 1890,
    favoritesCount: 79,
  },
  {
    id: "w_chale",
    title: "Ti Chalè — poésie créole",
    creatorId: "u_lea",
    category: "livres",
    kind: "pdf",
    price: 600,
    subtitle: "Recueil bilingue · 64 pages",
    description:
      "Trente-deux poèmes en créole haïtien, traduits en regard par l'autrice. Le recueil explore la chaleur, la rumeur et la tendresse des quartiers, avec une typographie aérée pensée pour la lecture à voix haute dans les ateliers d'écriture.",
    fileName: "ti-chale-poesie.pdf",
    fileSize: "4,2 Mo",
    palette: ["#b5296b", "#e0a106", "#fdf1dd"],
    motif: "page",
    createdAt: thisMonth(15),
    approved: true,
    confidential: true,
    tags: ["Poésie", "Bilingue", "Créole"],
    plays: 1120,
    favoritesCount: 58,
  },
  {
    id: "w_cafe",
    title: "Business plan — Café Ayitien",
    creatorId: "u_nadia",
    category: "projets",
    kind: "pdf",
    price: 6500,
    subtitle: "Dossier stratégique · 74 pages",
    description:
      "Dossier de financement complet pour une torréfaction artisanale de café des Cahos : étude de marché chiffrée en gourdes, plan d'approvisionnement par coopératives, prévisionnel à trente-six mois, analyse des risques climatiques et logistique, et argumentaire bancaire prêt à déposer auprès d'une institution de microfinance haïtienne.",
    fileName: "business-plan-cafe-ayitien.pdf",
    fileSize: "18,9 Mo",
    palette: ["#4a2c1a", "#a8762c", "#f0e3cd"],
    motif: "page",
    createdAt: thisMonth(2),
    approved: true,
    confidential: true,
    tags: ["Agro", "Financement", "Prévisionnel"],
    plays: 2760,
    favoritesCount: 136,
  },
  {
    id: "w_rebwaze",
    title: "Programme Rebwaze Latibonit",
    creatorId: "u_ronald",
    category: "projets",
    kind: "pdf",
    price: 5200,
    subtitle: "Programme 24 mois · 58 pages",
    description:
      "Programme opérationnel de reboisement du bassin de l'Artibonite : cartographie des parcelles, calendrier de pépinières, budget détaillé en gourdes, dispositif de suivi communautaire et indicateurs mesurables trimestre par trimestre. Un document de terrain conçu pour être défendu devant un bailleur international.",
    fileName: "programme-rebwaze-latibonit.pdf",
    fileSize: "12,4 Mo",
    palette: ["#1f8a5b", "#7a4a24", "#eae4cf"],
    motif: "page",
    createdAt: thisMonth(13),
    approved: true,
    confidential: true,
    tags: ["Environnement", "Bailleur", "Suivi"],
    plays: 1420,
    favoritesCount: 72,
  },
  {
    id: "w_coop",
    title: "Plan d'action — Mangue Bio",
    creatorId: "u_ronald",
    category: "projets",
    kind: "zip",
    price: 3800,
    subtitle: "Pack coopérative · PDF + tableurs",
    description:
      "Pack complet pour structurer une coopérative de mangues séchées à l'export : statuts types, plan d'action sur dix-huit mois, grille de coûts, modèle de contrat producteur et tableau de trésorerie en gourdes avec scénarios de change. Tous les fichiers sont éditables et commentés.",
    fileName: "plan-action-mangue-bio.zip",
    fileSize: "9,7 Mo",
    palette: ["#e0a106", "#c2542c", "#f6ecd8"],
    motif: "grid",
    createdAt: thisMonth(17),
    approved: true,
    confidential: true,
    tags: ["Coopérative", "Export", "Tableurs"],
    plays: 980,
    favoritesCount: 53,
  },
  {
    id: "w_croquis",
    title: "Croquis rapide #4",
    creatorId: "u_milo",
    category: "art",
    kind: "jpg",
    price: 250,
    subtitle: "Étude · non validée",
    description: "Étude au crayon, en cours de finalisation.",
    fileName: "croquis-rapide-4.jpg",
    fileSize: "2,1 Mo",
    palette: ["#5b5347", "#a89b85", "#efe8da"],
    motif: "brush",
    createdAt: thisMonth(19),
    approved: false,
    tags: ["Étude"],
    plays: 40,
    favoritesCount: 12,
  },
];

/* Registre économique de démonstration : ventes et dons simulés.
   Deux créateurs sont volontairement à égalité parfaite ce mois-ci
   pour démontrer la règle de partage des prix au mérite. */
function buildLedger(): LedgerEntry[] {
  const out: LedgerEntry[] = [];
  const byId = Object.fromEntries(users.map((u) => [u.id, u]));
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const push = (
    type: "vente" | "don",
    creatorId: string,
    amount: number,
    date: string,
    workId?: string,
    buyerId = "u_marie",
    opts?: { museumId?: string; museumOwnerId?: string; via?: "billboard" },
  ) => {
    const creator = byId[creatorId];
    /* Même règle que le store : plateforme (0 % Premium / 3,75 % Basique)
       + part musée 1,25 %, plafond strict 5 %. */
    const platformFee = r2(amount * commissionRate(creator));
    const museumShare = opts?.museumId ? r2(amount * MUSEUM_ADMIN_RATE) : 0;
    const commission = Math.min(r2(platformFee + museumShare), r2(amount * MUSEUM_TOTAL_RATE));
    const w = works.find((x) => x.id === workId);
    const buyerName = byId[buyerId]?.name ?? "Collectionneur SOLDE";
    out.push({
      id: `led_${out.length + 1}`,
      type,
      workId,
      workTitle: w?.title,
      buyerId,
      buyerName,
      creatorId,
      amount,
      commission,
      operatorFee: 0,
      date,
      license: `Licence nominative — ${buyerName}`,
      snapshot: w
        ? {
            title: w.title,
            creatorName: creator.name,
            category: w.category,
            kind: w.kind,
            fileName: w.fileName,
          }
        : undefined,
      ...(opts?.museumId ? { museumId: opts.museumId, museumOwnerId: opts.museumOwnerId, museumShare } : {}),
      ...(opts?.via ? { via: opts.via } : {}),
    });
  };

  // Mois courant — Léa et Nadia à égalité (2 × Gold Sack Award)
  push("vente", "u_lea", 620, thisMonth(3), "w_lakou");
  push("vente", "u_lea", 350, thisMonth(5), "w_soley");
  push("don", "u_lea", 1500, thisMonth(6));
  push("vente", "u_lea", 950, thisMonth(10), "w_boussole");
  push("vente", "u_nadia", 1800, thisMonth(1), "w_kit");
  push("vente", "u_nadia", 1620, thisMonth(4), "w_kit");
  push("vente", "u_milo", 480, thisMonth(3), "w_blue");
  push("vente", "u_milo", 480, thisMonth(8), "w_blue");
  push("don", "u_milo", 900, thisMonth(9));
  push("vente", "u_numa", 1200, thisMonth(7), "w_kenscoff");
  push("vente", "u_numa", 900, thisMonth(12), "w_cour");
  push("vente", "u_wide", 2800, thisMonth(16), "w_taptap");
  push("vente", "u_kenji", 900, thisMonth(2), "w_jacmel");
  push("don", "u_fabiola", 1500, thisMonth(7));
  push("vente", "u_ronald", 1800, thisMonth(17), "w_coop");

  // Ventes avec provenance (traçabilité créateur) — n'altèrent pas l'égalité Léa/Nadia.
  // Exemple exact du barème : 100 HTG en vitrine → 95 / 3,75 / 1,25.
  push("vente", "u_milo", 100, thisMonth(8), "w_blue", "u_marie", { museumId: "m_lakou", museumOwnerId: "u_lea" });
  push("vente", "u_milo", 300, thisMonth(11), "w_blue", "u_nadia", { via: "billboard" });
  push("vente", "u_kenji", 1200, thisMonth(9), "w_marche", "u_marie", { museumId: "m_sud", museumOwnerId: "u_fabiola" });

  // Historique de l'année (Grand Sack Awards)
  for (let m = 1; m <= M; m++) {
    push("vente", "u_nadia", 6500, earlier(m, 8), "w_cafe");
    push("vente", "u_numa", 7500, earlier(m, 14), "w_cour");
    push("vente", "u_lea", 620 + m * 40, earlier(m, 19), "w_lakou");
    push("don", "u_milo", 500, earlier(m, 22));
    push("vente", "u_fabiola", 1500, earlier(m, 6), "w_carnaval");
    push("vente", "u_wide", 3200, earlier(m, 24), "w_repos");
  }
  return out;
}

const museums: Museum[] = [
  {
    id: "m_lakou",
    ownerId: "u_lea",
    title: "Lakou Sonore",
    hue: 18,
    editorial: "Musiques racines du Sud-Est, prises de voix live et carnets de tournée. Une publication par semaine.",
    workIds: ["w_soley", "w_lakou", "w_blue", "w_rara"],
    requests: [
      { id: "req_1", workId: "w_jacmel", fromId: "u_kenji", status: "en attente", date: thisMonth(9) },
    ],
    members: 428,
    memberIds: ["u_marie", "u_kenji", "u_wide"],
    createdAt: earlier(3, 4),
  },
  {
    id: "m_strat",
    ownerId: "u_nadia",
    title: "Chambre des Stratégies",
    hue: 320,
    editorial: "Dossiers de financement, méthodes de rédaction et études de cas haïtiennes. Lecture sérieuse exigée.",
    workIds: ["w_kit", "w_cafe"],
    requests: [
      { id: "req_2", workId: "w_rebwaze", fromId: "u_ronald", status: "en attente", date: thisMonth(11) },
      { id: "req_3", workId: "w_coop", fromId: "u_ronald", status: "en attente", date: thisMonth(13) },
    ],
    members: 312,
    memberIds: ["u_ronald"],
    createdAt: earlier(4, 9),
  },
  {
    id: "m_sud",
    ownerId: "u_fabiola",
    title: "Atelier Sud-Est",
    hue: 268,
    editorial: "Images fixes et séquences documentaires : la fête populaire haïtienne, sans folklore de carte postale.",
    workIds: ["w_carnaval", "w_marche"],
    requests: [],
    members: 655,
    memberIds: ["u_marie", "u_milo"],
    createdAt: earlier(2, 18),
  },
  {
    id: "m_numa",
    ownerId: "u_numa",
    title: "Cabinet Numa",
    hue: 96,
    editorial: "Architecture tropicale, détails constructifs et carnets de chantier.Plans ouverts à la critique.",
    workIds: ["w_cour", "w_belair", "w_kenscoff"],
    requests: [],
    members: 274,
    memberIds: ["u_fabiola"],
    createdAt: earlier(3, 22),
  },
];

/* MODULE Messages : fils de démonstration récents, plus un message
   de 35 jours qui doit être purgé au premier chargement. */
function buildMessages(): Message[] {
  const now = Date.now();
  return [
    {
      id: "msg_s1",
      toId: "u_marie",
      fromId: "u_nadia",
      fromName: "Nadia Pierre",
      text: "Marie, le Business plan Café est en ligne — dis-moi ce que tu en penses.",
      date: new Date(now - 2 * 864e5).toISOString(),
    },
    {
      id: "msg_s2",
      toId: "u_milo",
      fromId: "u_lea",
      fromName: "Léa Joseph",
      text: "Milo, on repousse la session d'enregistrement de vendredi ?",
      date: new Date(now - 1 * 864e5).toISOString(),
    },
    {
      id: "msg_s3",
      toId: "u_milo",
      fromId: "u_nadia",
      fromName: "Nadia Pierre",
      text: "Ce message a 35 jours : il doit disparaître par auto-suppression.",
      date: new Date(now - 35 * 864e5).toISOString(),
    },
  ];
}

export function buildSeed(): DB {
  const ledger = buildLedger();
  const platformWallet = Math.round(ledger.reduce((s, e) => s + e.commission - (e.museumShare ?? 0), 0) * 100) / 100;
  return {
    version: 3,
    messages: buildMessages(),
    users,
    works,
    ledger,
    museums,
    withdrawals: [
      { id: "wd_1", userId: "u_numa", amount: 5000, status: "versé", date: earlier(1, 6) },
    ],
    promotions: [
      {
        id: "promo_seed",
        workId: "w_soley",
        userId: "u_lea",
        amount: 50,
        startsAt: thisMonth(Math.max(1, D - 1)),
        endsAt: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
      },
    ],
    tickets: [],
    favorites: {
      u_marie: ["w_soley", "w_kit", "w_mangues"],
      u_milo: ["w_soley"],
      u_nadia: ["w_cour"],
    },
    follows: {
      u_marie: ["u_lea", "u_nadia"],
      u_milo: ["u_lea"],
    },
    sessionUserId: null,
    platformWallet,
    prefs: { theme: "light", accent: "#c08a2e", accentName: "Or", lang: "fr", volume: 0.7, compactPlayer: false },
    seenWelcome: false,
  };
}

export const TEST_PROFILES = [
  { id: "u_marie", label: "Visitrice · acheteuse", note: "Compte basique, sans studio" },
  { id: "u_milo", label: "Créateur Basique", note: "Commission 3,75 % · wallet 1 240 HTG" },
  { id: "u_nadia", label: "Créatrice Premium", note: "0 % commission · musée à administrer" },
  { id: "u_admin", label: "Administrateur du site", note: "Accès aux flux privés de la plateforme" },
];
