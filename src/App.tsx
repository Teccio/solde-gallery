import { useEffect } from "react";
import { StoreProvider, useStore } from "./lib/store";
import { UIProvider, useUI } from "./lib/ui-context";
import { Atmosphere, BottomNav, DemoRibbon, Sidebar, Toasts, TopBar } from "./components/Shell";
import { Player } from "./components/Player";
import { Assistant, AdminAlerts } from "./components/Assistant";
import { ModalHost } from "./components/Modals";
import { Button, EmptyState, ErrorState, Icon } from "./components/ui";
import { Home } from "./pages/Home";
import { CatalogPage } from "./pages/Catalog";
import { Studio, Profile } from "./pages/Account";
import { Museums, MuseumDetail, Leaderboard, Creators, About } from "./pages/Community";
import { TransactionHistoryPage } from "./pages/TransactionHistory";

function Router() {
  const { route, navigate } = useUI();
  const [head, param, itemId] = route.replace(/^\//, "").split("/");

  switch (head) {
    case "":
      return <Home />;
    case "tendances":
      return <CatalogPage mode="trending" />;
    case "nouveautes":
      return <CatalogPage mode="new" />;
    case "categories":
      return <CatalogPage mode="all" />;
    case "c":
      return <CatalogPage key={param} mode="category" category={param} />;
    case "recherche":
      return <CatalogPage mode="search" />;
    case "bibliotheque":
      return <CatalogPage mode="library" />;
    case "achats":
      return <CatalogPage mode="purchases" />;
    case "favoris":
      return <CatalogPage mode="favorites" />;
    case "musees":
      return param ? <MuseumDetail id={param} /> : <Museums />;
    case "concours":
      return <Leaderboard />;
    case "studio":
      return param === "transactions" ? <TransactionHistoryPage transactionId={itemId} /> : <Studio />;
    case "profil":
      return <Profile key={param ?? "me"} userId={param} />;
    case "createurs":
      return <Creators />;
    case "apropos":
      return <About />;
    default:
      return (
        <EmptyState
          icon="compass"
          title="Cette page n'existe pas"
          hint={`Aucune section ne correspond à « ${route} ».`}
          action={
            <Button className="mt-2" icon="arrowRight" onClick={() => navigate("/")}>
              Revenir à l'accueil
            </Button>
          }
        />
      );
  }
}

function Footer() {
  const { navigate } = useUI();
  const { setChatOpen } = useUI();
  return (
    <footer className="mt-14 border-t border-line pt-8 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-8">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl text-accentink" style={{ background: "var(--accent-color)" }}>
              <Icon name="arrowUp" className="h-4.5 w-4.5" strokeWidth={2.4} />
            </span>
            <span className="font-display text-[18px] font-semibold text-ink">
              SOLDE <span className="font-normal italic">gallery</span>
            </span>
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
            La place de marché des créateurs haïtiens. Musique, images, art, architecture, livres et projets — en gourdes,
            sans intermédiaire opaque.
          </p>
        </div>
        <div className="flex flex-wrap gap-10">
          {[
            { t: "Univers", links: [["Musique", "/c/musique"], ["Photo & vidéo", "/c/photo"], ["Art & tableaux", "/c/art"], ["Architecture", "/c/architecture"], ["Livres et projets", "/c/livres-projets"]] },
            { t: "Plateforme", links: [["Musées virtuels", "/musees"], ["Concours", "/concours"], ["Pour les créateurs", "/createurs"], ["À propos", "/apropos"]] },
          ].map((col) => (
            <div key={col.t}>
              <p className="mb-3 text-[10.5px] font-bold tracking-[0.18em] text-muted uppercase">{col.t}</p>
              <ul className="space-y-2">
                {col.links.map(([l, to]) => (
                  <li key={to}>
                    <button onClick={() => navigate(to)} className="link-underline text-[13px] text-inksoft hover:text-ink">
                      {l}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="mb-3 text-[10.5px] font-bold tracking-[0.18em] text-muted uppercase">Assistance</p>
            <button onClick={() => setChatOpen(true)} className="link-underline text-[13px] text-inksoft hover:text-ink">
              Agent de support FR / Kreyòl
            </button>
            <p className="mt-3 max-w-[220px] text-[11.5px] leading-relaxed text-muted">
              Prototype local — aucun paiement réel, données conservées dans ce navigateur uniquement.
            </p>
          </div>
        </div>
      </div>
      <div className="gold-rule mt-8" />
      <p className="mt-4 text-[11.5px] text-muted">
        © {new Date().getFullYear()} SOLDE gallery · V1 de démonstration · Fait pour Haïti, en gourdes (HTG).
      </p>
    </footer>
  );
}

function Layout() {
  const { storageError, resetDemo, booting, t } = useStore();
  const { route, back, canBack, returnToNotifications } = useUI();
  const privateHistory = route.startsWith("/studio/transactions");

  useEffect(() => {
    const titles: Record<string, string> = {
      "": "Pour vous",
      tendances: "Tendances",
      nouveautes: "Nouveautés",
      categories: "Univers",
      c: "Catalogue",
      recherche: "Recherche",
      bibliotheque: "Bibliothèque",
      achats: "Mes achats",
      favoris: "Favoris",
      musees: "Musées virtuels",
      concours: "Concours",
      studio: "Mon studio",
      profil: "Profil",
      createurs: "Pour les créateurs",
      apropos: "À propos",
    };
    const head = route.replace(/^\//, "").split("/")[0];
    document.title = `${titles[head] ?? "Page"} — SOLDE gallery`;
  }, [route]);

  return (
    <div className="relative min-h-screen">
      <Atmosphere />
      <TopBar />
      <DemoRibbon />
      <Sidebar />

      <main className="relative z-10 px-4 pt-[122px] pb-[190px] sm:px-6 lg:pb-[132px] lg:pl-[280px] lg:pr-8">
        <div className="mx-auto max-w-[1500px]">
          {storageError && (
            <div className="mb-5">
              <ErrorState message={storageError} onRetry={resetDemo} />
            </div>
          )}
          <AdminAlerts />
          {/* MODULE Précédent : flèche fine dorée, navigation dans
              l'historique interne — le lecteur n'est jamais coupé. */}
          {(canBack || privateHistory) && (
            <button
              onClick={privateHistory ? returnToNotifications : back}
              aria-label={privateHistory ? t("notif.back") : t("nav.back")}
              className="focus-ring group mb-4 inline-flex items-center gap-1.5 rounded-full text-[13px] font-semibold transition hover:brightness-110"
              style={{ color: "var(--gold)" }}
            >
              <Icon name="chevronLeft" strokeWidth={1.4} className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
              <span className="link-underline">{privateHistory ? t("notif.back") : t("nav.back")}</span>
            </button>
          )}
          <Router />
          <Footer />
        </div>
      </main>

      <Player />
      <BottomNav />
      <Assistant />
      <ModalHost />
      <Toasts />

      {booting && (
        <div className="pointer-events-none fixed inset-x-0 top-[104px] z-[99] h-0.5 overflow-hidden">
          <div className="h-full w-1/3 animate-[shimmer_1.1s_infinite] bg-accent" />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <UIProvider>
        <Layout />
      </UIProvider>
    </StoreProvider>
  );
}
