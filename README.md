# SOLDE gallery — V1 (prototype Front-End, simulation locale)

Plateforme multidisciplinaire haïtienne : **musique, photographie et vidéo, art et tableaux,
architecture, livres et projets**. Toutes les données (comptes, achats, wallets, favoris,
musées, classements) vivent dans le `localStorage` du navigateur. **Aucun serveur, aucun
paiement réel.** Devise unique : **gourde (HTG)**. Interface **français / kreyòl ayisyen**.

## Démarrer

```bash
npm install
npm run dev      # développement
npm run build    # produit dist/index.html : HTML + CSS + JS + images, tout inclus
```

## Intégration WordPress / LocalWP

Le build est **mono-fichier** (`vite-plugin-singlefile`) : `dist/index.html` contient le JS,
le CSS et les visuels en data-URI.

**Option A — modèle de page personnalisé**
1. Copier le contenu de `<style>` et de `<script type="module">` de `dist/index.html`
   dans `wp-content/themes/votre-theme/solde-gallery.php` (en-tête `Template Name: SOLDE gallery`).
2. Y placer `<div id="root"></div>` puis appeler `get_header()` / `get_footer()` si souhaité.
3. Assigner le modèle à une page ; le routage interne utilise le **hash** (`#/studio`,
   `#/musees/…`), donc aucune règle de réécriture serveur n'est nécessaire.

**Option B — extension dédiée**
1. Créer `wp-content/plugins/solde-gallery/solde-gallery.php`.
2. `wp_enqueue_script( 'solde', plugins_url( 'solde.js', __FILE__ ), [], '1.0', true )`
   avec le fichier JS extrait, en ajoutant le filtre `script_loader_tag` pour
   `type="module"`, puis `wp_enqueue_style` pour le CSS extrait.
3. Exposer un shortcode `[solde_gallery]` qui retourne `<div id="root"></div>`.

> Les polices (Fraunces, Manrope, Italianno) sont chargées depuis Google Fonts ;
> pour un LocalWP hors-ligne, les télécharger et remplacer la balise `<link>`.

## Cartographie des modules

| Fichier | Rôle |
| --- | --- |
| `src/lib/types.ts` | Modèle de données, catégories, métiers, constantes économiques (3,75 %, seuils, tarifs) |
| `src/lib/seed.ts` | Jeu de démonstration : 9 profils, 20 œuvres, musées, registre de ventes/dons |
| `src/lib/store.tsx` | État global + persistance localStorage, répartition économique, CRUD, musées |
| `src/lib/awards.ts` | Double moteur de concours, **règle d'égalité au mérite**, fond saisonnier Haïti |
| `src/lib/audio.ts` | Lecteur persistant hors React, synthèse WAV locale, module extrait vidéo (placeholder) |
| `src/lib/i18n.ts` | Dictionnaire FR / Kreyòl |
| `src/lib/ui-context.tsx` | Routage par hash, modales, chargements simulés |
| `src/components/Shell.tsx` | Topbar, barre latérale, bottom navigation mobile, palette de couleurs, toasts |
| `src/components/Player.tsx` | Lecteur flottant, volume, file d'écoute, paroles `data-time` |
| `src/components/Modals.tsx` | Flux OTP mutualisé, achat, don, Premium, Promote, publication, musée, retrait |
| `src/components/Assistant.tsx` | Agent de support FR/Kreyòl + escalade administrateur |
| `src/components/Cover.tsx` | Couvertures procédurales, signature `mix-blend-mode: difference` |
| `src/pages/*` | Accueil Bento, catalogue, studio, profil, musées, concours, créateurs, à propos |

## Règles métier implémentées

- **Commission** : 3,75 % (gratuit) / 0 % (Premium) sur ventes **et** dons ; frais opérateur 0 HTG ;
  récapitulatif affiché avant chaque validation.
- **OTP** : bandeau rouge « Démonstration — Aucun paiement réel », numéro haïtien, bouton
  verrouillé en « Traitement… » (anti-double débit), code universel **0000**, wallets crédités,
  téléchargement sous **licence nominative**, historique conservé.
- **Premium** : 500 HTG/mois ou 5 000 HTG/an, bascule immédiate dans le localStorage.
- **Wallet** : retrait simulé débloqué à partir de **1 000 HTG**.
- **CRUD** : confirmation obligatoire ; l'œuvre supprimée quitte le catalogue public mais reste
  accessible aux clients l'ayant acquise (snapshot de vente).
- **Musées** : fondation réservée aux Premium, validation manuelle [Accepter] / [Refuser].
- **Concours** : impact mensuel/annuel + productivité par univers, classement **dense**
  (ex-æquo même prix, suivant au prix directement inférieur), badges affichés en Premium only.
- **Billboard** : bouton unique « Promote », tarif de 50 HTG révélé uniquement en modale, 24 h.

## Rectifications V1.1 (modules ajoutés, sans refonte)

- **Bouton Précédent** : flèche fine dorée en haut de la zone de contenu (pile interne, lecteur non coupé).
- **Quadrilingue strict** : FR / Kreyòl / EN / ES — en-tête et salutations alignés (Bonjour / Bonjou / Hello / Hola).
- **Billboard aléatoire** : jusqu'à 30 éléments (œuvres + musées), tirage Fisher-Yates à chaque chargement, rotation 8 s avec fondu ; « Promote » (50 HTG / 24 h) pour une œuvre **ou** un musée (le visiteur entre alors directement dans la galerie).
- **Comptes** : « Compte gratuit » → **Compte Basique** ; onglet privé **Messages** sur chaque profil (simulation d'échanges, horodatage, **auto-suppression locale à 30 jours**).
- **Agent IA** : saisie libre, détection automatique de la langue (FR/Kreyòl/EN/ES), réponse dans la langue de l'utilisateur, escalade administrateur conservée.
- **Paiements** : **détection automatique de l'opérateur** dès les premiers chiffres (NatCash 32/33/40/41/42/43/55/22, MonCash 3/4 hors exceptions) — aucune sélection manuelle ; code 0000 inchangé.
- **Anonymat financier** : leaderboard mensuel et annuel en **Points** (1 000 HTG = 1 Point, ex. « 5.2 Points »), égalités au mérite inchangées.
- **Iconographie des prix** : sac texturé (or/argent/bronze), plume, crayon technique, cerveau filaire, toile, optique, disque (module `PrizeIcons.tsx`).
- **Anti-spam productivité** : description > 100 caractères **et** livrable adapté à la catégorie.

## Compléments V1.2 (modules isolés)

- **Portefeuille** : bloc « Mon Portefeuille SOLDE » (solde HTG en temps réel) sur le profil de tout compte connecté, Basique compris.
- **Règle des 5 % (vitrine de musée Premium)** : `recordSale(workId, museumId)` dans `store.tsx` + `settle()`.
  Pour 100 HTG : 95 → créateur d'origine, 3,75 → wallet plateforme, 1,25 → administrateur Premium du musée.
  L'acheteur ne voit que le prix total (`hideBreakdown` dans la modale de paiement ; commission masquée dans « Mes achats »).
  Hors musée, la règle standard (3,75 % / 0 % Premium) est inchangée.
- **Message direct** : bouton « Message » à côté de « Suivre » → chat privé (`DirectMessageModal`) ; visiteur non connecté → interposition « Créez un compte Basique ».
- **Chat IA** : saisie libre uniquement (plus de boutons-FAQ), détection FR/Kreyòl/EN/ES, solde réel du portefeuille, escalade conservée.
- **Musique** : le menu « Type de fichier » propose `.mp3` (Single) et `.zip` (album, EP, pack d'instrumentales) via `CATEGORY_FILE_KINDS`.
- **Tableau Premium** : « Posséder et administrer votre Musée Virtuel ».

## Rectifications V1.3 (modules isolés)

- **Solde dans l'en-tête global** (`HeaderWallet.tsx`) : montant en HTG affiché en permanence en haut à droite, sur toutes les pages, pour tout compte connecté ; mise à jour en temps réel avec indicateur « +/− X HTG » ; clic → panneau « Mon Portefeuille SOLDE » (retrait, bibliothèque, derniers mouvements). Le bloc a été retiré du corps du profil.
- **Onglets de l'espace personnel** (`AccountTabs.tsx`) : « Bibliothèque » ouverte par défaut, « Messages » masqués par défaut et déroulés uniquement au clic (`Reveal.tsx`, déroulé fluide).
- **Édition inline du profil** (`ProfileEditor.tsx`) : nom, ville, biographie, réseaux sociaux (Instagram, Facebook, TikTok, YouTube, site web), métiers et centres d'intérêt se déroulent dans la fiche d'identité ; [Annuler] / [Enregistrer les modifications] en bas de cette fiche, au-dessus de la grille des œuvres.
- **Bibliothèque** (`Library.tsx`) : cartes des œuvres acquises (PDF, musique ZIP, plans…), filtres par univers, retéléchargement avec licence nominative, œuvres retirées du catalogue conservées.
- Accès directs « Ma bibliothèque » / « Mes messages » depuis le menu du profil (`lib/account-tab.ts`).

## Modules analytiques V1.4 (isolés)

- **Provenance des clics** (`lib/click-analytics.ts`, `components/CreatorClicks.tsx`) : suivi silencieux branché sur l'unique point d'ouverture des fiches (`useUI().open`).
  `grid` = grille Bento / catalogue ; `billboard` = Billboard « À la une » ; `none` = ouvertures internes ignorées.
  Clé localStorage dédiée (`solde.gallery.clicks.v1`), indépendante de la base de simulation.
  Le Dashboard du créateur affiche une synthèse (total, grille, Billboard, part en %) et, sous chaque œuvre, la mention « X clics (depuis le billboard) ». Invisible pour le public.
- **Proof of Merit** (`components/AwardProofModal.tsx`) : tous les badges Awards du profil public Premium sont cliquables.
  Prix d'impact → « Lauréat avec un total de [X] Points générés au cours de la période » avec rang et période.
  Prix de productivité → cartes interactives des fichiers admissibles du mois (`eligibleWorksForPrize`, mêmes critères anti-spam que le classement), clic → fiche de l'œuvre.
  `EarnedBadge` est enrichi de métadonnées additives facultatives (total, rang, période, catégorie).

## Rectifications V1.5 (interface & langues)

- **Suivre / Se désabonner** : abonnement persisté (`db.follows`), bascule instantanée du libellé et du fond, `aria-pressed`, compteur d'abonnés cohérent, état conservé après rechargement. Le bouton affiche l'équivalent traduit (Follow / Unfollow, Swiv / Dezabòne, Seguir / Dejar de seguir).
- **Traduction stricte** (`lib/l10n.ts` + clés complétées dans `i18n.ts`) : métiers (Musicien → Musician / Mizisyen / Músico), univers, en-tête, catalogue, profil, éditeur, studio, analystique, musées, concours, créateurs. Les contenus saisis par les membres restent dans leur langue d'origine.
- **En-tête** : le bouton de publication doublé a été retiré ; il est remplacé par « Musées » ouvrant un panneau (`MuseumPanel.tsx`) : fonder un musée (Premium, sinon interposition/connexion), musées administrés, musées dont l'utilisateur est membre invité. La publication reste en bas (navigation mobile) et dans « Mon studio ».
- **Adhésion aux musées** : `memberIds`, rejoindre/quitter persistés et visibles dans le panneau.

## Corrections de bugs V1.6 (modules isolés)

- **Recherche anti-freeze** (`lib/recent-searches.ts`, `components/SearchInput.tsx`) : historique local dédié (6 termes, dédupliqué), dropdown au focus sur l'en-tête ET sur la page Recherche. Événements séparés : `onFocus`/`onClick` ouvrent sans toggle, `onChange` filtre sans écriture disque, `onMouseDown` de la liste `preventDefault()` évite le conflit blur/clic, sélection au `onClick`, fermeture par clic extérieur ou Escape. Navigation clavier ↑ ↓ / Entrée.
- **CRUD inline du musée** (`components/MuseumEditor.tsx`, `MuseumAvatar.tsx`) : bouton « Modifier le musée » dans le bloc d'en-tête (propriétaire uniquement), champs Titre / Description éditoriale / Photo ronde (upload local compressé en canvas 256 px + réglage de teinte), [Enregistrer] / [Annuler] en bas du bloc avant la grille des œuvres. Persistance via `updateMuseum` dans le localStorage.
- **Favoris harmonisés** : cercle de fond toujours neutre (`bg-black/35`), seul le cœur s'active avec `fill: var(--accent-color)` (Or par défaut, suit la palette en direct). Compteur public `favoritesCount` sur chaque œuvre, incrémenté/décrementé à chaque bascule, visible sans connexion, également affiché dans la fiche œuvre.

## Finition transactionnelle V1.7 (modules isolés)

- **Notifications du Header** (`lib/notifications.ts`, `components/NotificationsPanel.tsx`) : cloche filaire dorée à côté du solde, badge des flux non lus (repère `localStorage` dédié), panneau des 8 flux récents du registre local — achats (« X a acheté l'œuvre Z » + montant) et dons/Mécénat (« X a fait un don de 250 HTG »). Fermeture au clic extérieur, Échap et changement de page ; « Tout marquer comme lu ».
- **Débit de l'acheteur en temps réel** (`store.tsx → settle`) : toute transaction validée par OTP 0000 soustrait le montant du wallet de l'acheteur/donneur dans la même passe d'état que les crédits. Le solde est vérifié avant paiement et à la validation : aucun découvert n'est autorisé. La répartition existante des achats en musée reste inchangée.
- **Barre de recherche épurée** : suppression du badge `⌘K` et de la croix native (`type="text"` + règle CSS `::-webkit-search-cancel-button`), padding droit normal, raccourci clavier conservé silencieusement, dropdown d'historique inchangé.

## Recherche et notifications interactives

- `src/lib/fuzzy-search.ts` tolère les insertions, omissions, substitutions et inversions de lettres. Les accents et la casse sont neutralisés pour la comparaison, sans changer les titres. Les résultats les plus proches sont classés en tête ; les filtres et les tris explicites restent disponibles.
- La cloche contient les ventes, dons et événements de favoris autorisés pour le compte actif. Les favoris sont enregistrés dans `favoriteEvents`, sans modification du registre financier. Le repère de lecture est propre à chaque compte.
- Un achat ou un don ouvre `#/studio/transactions/{id}` avec date, titre, prix, frais et montant net. `src/pages/TransactionHistory.tsx` vérifie les droits du vendeur ou de l'administrateur à chaque affichage. La flèche de retour rouvre les notifications.
- Les boutons de l'en-tête basculent entre ouvert et fermé sans conflit entre `mousedown` et `click`. Le lecteur, la bibliothèque, la messagerie et les calculs de paiement restent inchangés.
- Vérification navigateur reproductible : après `npm run build`, installer temporairement `playwright-core` et Chromium, puis lancer `node scripts/verify-current-interactions.mjs`.

La confidentialité reste une simulation d'interface locale : une version en ligne doit appliquer ces autorisations côté serveur.

## Notifications personnelles et centres d'intérêt

- `scopedLedger` inclut les transactions dont le compte est acheteur ou créateur. L'acheteur voit donc sa propre notification, sans accès aux achats des autres. Le vendeur conserve ses reçus privés ; l'administrateur voit toutes les opérations.
- Après une transaction, le message utilise la deuxième personne : « Vous venez d'acheter l'œuvre [Titre] » ou « Vous venez de faire un don de [X] HTG à l'artiste [Nom] ». Le clic mène l'acheteur à `/achats`, tandis que le vendeur ouvre son reçu privé.
- `src/lib/interests.ts` trie de façon stable les œuvres et les catégories selon les intérêts choisis à l'inscription ou modifiés dans le profil. La sélection est conservée dans `localStorage` et s'applique à l'accueil, aux tendances, à la bibliothèque et aux favoris. Les filtres et tris explicites continuent de fonctionner.
- Le symbole temple doré `museum` est affiché à côté du titre des Musées virtuels, sur l'accueil et la page dédiée.
- Vérification navigateur : `node scripts/verify-interest-and-buyer.mjs` après `npm run build`.

## Limites assumées de la V1

- Lecture audio continue pendant la navigation interne, arrêtée au rechargement ou à la
  fermeture de l'onglet. La lecture en arrière-plan (panneau média OS) est documentée dans
  `src/lib/audio.ts` pour une future PWA / application native (MediaSession + service audio).
- Les vidéos n'exposent qu'une **vignette statique** ; l'extrait de 10 s est un module en attente
  (`videoPreviewModule`) nécessitant un transcodage serveur.
- Les fichiers joints ne sont pas téléversés : nom, poids et extension sont lus localement. Après achat,
  le téléchargement produit un PDF ou une archive ZIP de démonstration avec une licence nominative,
  sans inclure l'œuvre originale.
