import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { pathToFileURL } from "node:url";
import path from "node:path";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const url = pathToFileURL(path.resolve("dist/index.html")).href;
const runtimeErrors = [];
const results = [];
const check = (label, condition) => {
  assert.ok(condition, label);
  results.push(label);
  console.log(`PASS ${label}`);
};
const db = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("solde.gallery.db.v3")));
const norm = (s) => s.replace(/[\u202f\u00a0]/g, " ");
async function fresh(width = 1440, height = 950) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
  const p = await context.newPage();
  p.on("pageerror", (error) => runtimeErrors.push(error.message));
  await p.addInitScript(() => {
    if (!sessionStorage.getItem("__soldeTestCleared")) {
      localStorage.clear();
      sessionStorage.setItem("__soldeTestCleared", "1");
    }
  });
  await p.goto(url, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1000);
  return p;
}
async function go(p, route) {
  await p.evaluate((r) => { location.hash = r; }, route);
  await p.waitForTimeout(600);
}
async function login(p, email) {
  if (await p.locator('[data-testid="notifications-panel"]').count()) {
    await p.locator('[data-testid="notification-bell"]').click();
  }
  await p.locator('button[aria-label="Changer de profil de test"]').click();
  await p.locator('[role="dialog"] input[type="email"]').fill(email);
  await p.getByRole("dialog").getByRole("button", { name: "Ouvrir ma session locale" }).click();
  await p.waitForTimeout(200);
}
async function bell(p) {
  await p.locator('[data-testid="notification-bell"]').click();
  await p.waitForTimeout(180);
}
async function buy(p, workTitle) {
  await p.locator("main article h3").filter({ hasText: workTitle }).first().click();
  const dialog = p.getByRole("dialog");
  await dialog.getByRole("button", { name: "Acheter", exact: true }).click();
  await dialog.locator('input[placeholder="3701 2345"]').fill("37012345");
  await dialog.getByRole("button", { name: /^Payer/ }).click();
  await dialog.locator('input[placeholder="••••"]').waitFor({ timeout: 6000 });
  await dialog.locator('input[placeholder="••••"]').fill("0000");
  await dialog.getByRole("button", { name: "Valider la transaction" }).click();
  await dialog.getByText("Achat simulé confirmé", { exact: true }).waitFor({ timeout: 6000 });
  await p.keyboard.press("Escape");
}
const balance = (d, id) => d.users.find((u) => u.id === id).wallet;

try {
  // Onboarding réel : les intérêts choisis pilotent immédiatement les univers et les œuvres.
  {
    const p = await fresh();
    await p.locator('button[aria-label="Changer de profil de test"]').click();
    await p.getByRole("dialog").getByRole("button", { name: "Créer un compte", exact: true }).click();
    await p.getByRole("dialog").locator('input[placeholder="Nom d\'artiste ou nom complet"]').fill("Visiteur Architecture");
    await p.getByRole("dialog").locator('input[type="email"]').fill("architecture.test@demo.ht");
    await p.getByRole("dialog").locator("button").filter({ hasText: "Architecture" }).click();
    await p.getByRole("dialog").locator("button").filter({ hasText: "Musique" }).click();
    await p.getByRole("dialog").getByRole("button", { name: "Créer mon compte", exact: true }).click();
    await p.waitForTimeout(450);
    const state = await db(p);
    const me = state.users.find((u) => u.id === state.sessionUserId);
    check("onboarding stores selected interests in order", me.interests.join(",") === "architecture,musique");
    const priority = p.locator('[data-testid="interest-priority"]');
    check("custom interest spotlight is on the home page", await priority.isVisible());
    check("architecture is the first highlighted universe", await priority.locator("[data-interest-id]").first().getAttribute("data-interest-id") === "architecture");
    const firstTitle = await p.locator("main article h3").first().textContent();
    check("architecture works appear first on the homepage", firstTitle === "Maison Cour intérieure");
    await p.screenshot({ path: "/tmp/solde-interest-priority.png" });
    await go(p, "/tendances");
    check("architecture works lead the discovery feed", (await p.locator("main article h3").first().textContent()) === "Maison Cour intérieure");
    await go(p, "/profil/" + me.id);
    await p.locator("main").getByRole("button", { name: "Modifier le profil", exact: true }).click();
    await p.getByRole("button", { name: "Livres", exact: true }).click();
    await p.getByRole("button", { name: "Enregistrer les modifications", exact: true }).click();
    await p.waitForTimeout(250);
    check("profile editor persists a new interest", (await db(p)).users.find((u) => u.id === me.id).interests.includes("livres"));
    await go(p, "/");
    check("priority stays dynamic after profile edit", (await p.locator('[data-testid="interest-priority"]').innerText()).includes("Livres"));
    await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(900);
    check("interest configuration survives a reload", (await db(p)).users.find((u) => u.id === me.id).interests.join(",") === "architecture,musique,livres");
    check("architecture remains first after reload", await p.locator('[data-testid="interest-priority"] [data-interest-id]').first().getAttribute("data-interest-id") === "architecture");
    await p.context().close();
  }

  // Intérêts différents : seulement ceux cochés sont mis en avant, les autres restent inchangés.
  {
    const p = await fresh();
    await login(p, "marie.toussaint@demo.ht");
    const chips = await p.locator('[data-testid="interest-priority"] [data-interest-id]').evaluateAll((els) => els.map((e) => e.getAttribute("data-interest-id")));
    check("default reader keeps her configured order", chips.join(",") === "musique,livres,photo");
    check("no unselected universe is injected into the spotlight", !chips.includes("architecture"));
    await go(p, "/musees");
    check("museum glyph is visible beside the title", await p.locator('[data-testid="museum-title-icon"]').isVisible());
    const iconColor = await p.locator('[data-testid="museum-title-icon"]').evaluate((el) => getComputedStyle(el).color);
    check("museum glyph uses the gold palette", /192, 138, 46|200, 138, 46/.test(iconColor), iconColor);
    await p.screenshot({ path: "/tmp/solde-museum-glyph.png" });
    await p.context().close();
  }

  // Achat et don : formulation directe chez l'acheteur, vues privées inchangées ailleurs.
  {
    const p = await fresh();
    // Rara Nou n'a pas encore été achetée par Nadia : on lui attribue un prix
    // de test pour vérifier un vrai débit sans réutiliser une œuvre possédée.
    await p.evaluate(() => {
      const d = JSON.parse(localStorage.getItem("solde.gallery.db.v3"));
      d.works.find((w) => w.id === "w_rara").price = 480;
      localStorage.setItem("solde.gallery.db.v3", JSON.stringify(d));
    });
    await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(900);
    await login(p, "nadia.pierre@demo.ht");
    const before = await db(p);
    await go(p, "/c/musique");
    await buy(p, "Rara Nou");
    const after = await db(p);
    check("purchase still debits the exact TTC price", balance(after, "u_nadia") === balance(before, "u_nadia") - 480);
    const sale = after.ledger.find((e) => !before.ledger.some((old) => old.id === e.id));
    await bell(p);
    const ownNotice = p.locator(`[data-notification-id="${sale.id}"]`);
    check("buyer now receives her own purchase notification", /Vous venez d'acheter l'œuvre « Rara Nou »/.test(await ownNotice.innerText()));
    check("personal purchase text never calls the buyer a third party", !(await ownNotice.innerText()).includes("Nadia Pierre a acheté"));
    await p.screenshot({ path: "/tmp/solde-buyer-notification.png" });
    await ownNotice.click();
    await p.waitForTimeout(250);
    const buyerDestination = await p.evaluate(() => location.hash);
    console.log("buyer destination:", buyerDestination);
    check("buyer click goes to her purchases, not a forbidden seller receipt", buyerDestination === "#/achats");
    await bell(p);
    await login(p, "milo.grey@demo.ht");
    await bell(p);
    check("seller still gets the third-party sale notification", /Nadia Pierre a acheté.*Rara Nou/.test(await p.locator(`[data-notification-id="${sale.id}"]`).innerText()));
    await bell(p);
    await login(p, "nadia.pierre@demo.ht");
    await go(p, "/profil/u_milo");
    await p.locator("main").getByRole("button", { name: "Soutenir", exact: true }).click();
    const dialog = p.getByRole("dialog");
    await dialog.locator('input[type="number"]').fill("250");
    await dialog.locator('input[placeholder="3701 2345"]').fill("37012345");
    await dialog.getByRole("button", { name: /^Envoyer le don/ }).click();
    await dialog.locator('input[placeholder="••••"]').waitFor({ timeout: 6000 });
    await dialog.locator('input[placeholder="••••"]').fill("0000");
    await dialog.getByRole("button", { name: "Valider la transaction" }).click();
    await dialog.getByText("Merci pour votre soutien", { exact: true }).waitFor({ timeout: 6000 });
    await p.keyboard.press("Escape");
    const donation = (await db(p)).ledger[0];
    check("donation debits the chosen amount without changing existing fees", donation.amount === 250 && balance(await db(p), "u_nadia") === 4090);
    await bell(p);
    check("donor gets a direct second-person donation message", /Vous venez de faire un don de 250 HTG à l'artiste Milo Grey/.test(await p.locator(`[data-notification-id="${donation.id}"]`).innerText()));
    await bell(p);
    await login(p, "milo.grey@demo.ht");
    await bell(p);
    check("recipient keeps the donor's name in his notification", /Nadia Pierre t'a fait un don de 250 HTG/.test(await p.locator(`[data-notification-id="${donation.id}"]`).innerText()));
    await bell(p);
    await login(p, "direction@solde.demo.ht");
    await bell(p);
    const adminText = await p.locator(`[data-notification-id="${donation.id}"]`).innerText();
    check("administrator sees the donor, not a misleading 'Vous'", adminText.includes("Nadia Pierre") && !adminText.includes("Vous venez de faire"));
    await bell(p);
    await login(p, "lea.joseph@demo.ht");
    await bell(p);
    check("unrelated third party sees neither the purchase nor the donation", await p.locator(`[data-notification-id="${sale.id}"]`).count() === 0 && await p.locator(`[data-notification-id="${donation.id}"]`).count() === 0);
    await p.context().close();
  }

  // Le lecteur, le portefeuille, la bibliothèque et les menus restent disponibles.
  {
    const p = await fresh();
    await login(p, "milo.grey@demo.ht");
    await p.locator('main button[aria-label^="Écouter"]').first().click();
    await p.waitForTimeout(1400);
    check("audio player remains functional", await p.locator('button[aria-label="Pause"]').count() > 0);
    await bell(p);
    await p.locator('[data-notification-type="sale"]').first().click();
    check("seller receipt still opens on notification click", await p.locator('[data-testid="transaction-detail"]').isVisible());
    check("audio continues while reading the receipt", await p.locator('button[aria-label="Pause"]').count() > 0);
    await p.getByRole("button", { name: "Retour aux notifications" }).click();
    check("return to notifications still works", await p.locator('[data-testid="notifications-panel"]').isVisible());
    await bell(p);
    check("bell still toggles closed on the second click", await p.locator('[data-testid="notifications-panel"]').count() === 0);
    await go(p, "/profil/u_milo");
    check("library remains open by default", await p.locator('[data-testid="account-tab-library"]').getAttribute("aria-expanded") === "true");
    check("messages remain collapsed by default", await p.locator("#account-messages").count() === 0);
    await p.context().close();
  }

  // Affichage mobile de la sélection et du glyphe.
  {
    const p = await fresh(390, 844);
    await login(p, "marie.toussaint@demo.ht");
    check("interest spotlight fits the mobile viewport", await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await go(p, "/musees");
    check("museum glyph remains visible on mobile", await p.locator('[data-testid="museum-title-icon"]').isVisible());
    check("mobile museum section does not overflow", await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await p.context().close();
  }
  check("no JavaScript errors", runtimeErrors.length === 0);
  console.log(`\n${results.length} vérifications réussies.`);
} finally {
  await browser.close();
}
