import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { pathToFileURL } from "node:url";
import path from "node:path";

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const url = pathToFileURL(path.resolve("dist/index.html")).href;
const errors = [];
let passed = 0;
const check = (label, condition) => { assert.ok(condition, label); passed++; console.log(`PASS ${label}`); };
const normalize = (s) => s.replace(/[\u202f\u00a0]/g, " ");
const db = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("solde.gallery.db.v3")));
async function fresh(width = 1440, height = 950) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
  const p = await context.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(url, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1000);
  return p;
}
async function go(p, route) { await p.evaluate((r) => { location.hash = r; }, route); await p.waitForTimeout(550); }
async function login(p, email) {
  await p.locator('button[aria-label="Changer de profil de test"]').click();
  await p.locator('[role="dialog"] input[type="email"]').fill(email);
  await p.getByRole("dialog").getByRole("button", { name: "Ouvrir ma session locale" }).click();
  await p.waitForTimeout(150);
}
async function pay(p, action, success) {
  const dialog = p.getByRole("dialog");
  await dialog.locator('input[placeholder="3701 2345"]').fill("37012345");
  await dialog.getByRole("button", { name: action }).click();
  await dialog.locator('input[placeholder="••••"]').waitFor({ timeout: 6000 });
  await dialog.locator('input[placeholder="••••"]').fill("0000");
  await dialog.getByRole("button", { name: "Valider la transaction" }).click();
  await dialog.getByText(success, { exact: true }).waitFor({ timeout: 6000 });
}
const balance = (d, id) => d.users.find((u) => u.id === id).wallet;
const bell = (p) => p.locator('[data-testid="notification-bell"]');

try {
  // Fuzzy search uses the original titles and respects category/price filters.
  {
    const p = await fresh();
    const input = p.locator("#solde-search");
    for (const term of ["lakou", "lakouu", "lkaou", "lakoy"]) {
      await input.fill(term);
      await p.waitForTimeout(90);
      check(`search '${term}' finds Lakou Nocturne first`, (await p.locator("main article h3").first().textContent()) === "Lakou Nocturne");
    }
    check("header input keeps focus", await input.evaluate((el) => el === document.activeElement));
    await input.fill("lea joseph");
    check("accent-insensitive creator search", (await p.locator("main article h3").allTextContents()).includes("Soley Leve"));
    await input.fill("nadiia");
    check("typo in artist name is tolerated", (await p.locator("main article h3").allTextContents()).includes("Le kit du créateur indé"));
    await input.fill("zzzzzz-xxxxxxxx");
    check("unrelated query preserves empty state", await p.locator("main article").count() === 0);
    await input.fill("lakouu");
    await p.locator("main").getByRole("button", { name: "Gratuit", exact: true }).click();
    check("free-only filter still applies to fuzzy results", await p.locator("main article").count() === 0);
    await p.locator("main").getByRole("button", { name: "Gratuit", exact: true }).click();
    await p.locator("main").getByRole("button", { name: "Musique", exact: true }).first().click();
    check("music category preserves the matching track", (await p.locator("main article h3").first().textContent()) === "Lakou Nocturne");
    await input.fill("lakou"); await input.press("Enter");
    await input.fill("lakouu");
    check("recent history also tolerates a typo", (await p.locator('[data-testid="recent-item"]').allTextContents()).some((s) => s.includes("lakou")));
    await input.press("Escape");
    await p.screenshot({ path: "/tmp/solde-fuzzy-preview.png" });
    await p.context().close();
  }

  // Real clicks, not forced events, exercise mousedown/click toggle conflicts.
  {
    const p = await fresh();
    for (const [trigger, panel] of [
      ['[data-testid="palette-button"]', '[data-testid="appearance-panel"]'],
      ['[data-testid="notification-bell"]', '[data-testid="notifications-panel"]'],
      ['[data-testid="header-assistant-desktop"]', '[data-testid="assistant-panel"]'],
      ['[data-testid="header-museums"]', '[data-testid="museum-panel"]'],
    ]) {
      for (let cycle = 0; cycle < 2; cycle++) {
        await p.locator(trigger).click();
        check(`${trigger} opens on click ${cycle + 1}`, await p.locator(panel).isVisible());
        await p.locator(trigger).click();
        check(`${trigger} closes on second click ${cycle + 1}`, await p.locator(panel).count() === 0);
      }
    }
    await p.locator('[data-testid="palette-button"]').click();
    await bell(p).click();
    check("switching palette to bell closes the first panel", await p.locator('[data-testid="appearance-panel"]').count() === 0 && await p.locator('[data-testid="notifications-panel"]').isVisible());
    await p.keyboard.press("Escape");
    check("Escape still closes header panels", await p.locator('[data-testid="notifications-panel"]').count() === 0);
    await bell(p).click();
    await p.locator("main h1").click();
    check("outside click still closes the bell", await p.locator('[data-testid="notifications-panel"]').count() === 0);
    await p.context().close();
  }

  // An actual purchase and donation create private links to their receipts.
  {
    const p = await fresh();
    await login(p, "studio@numa.demo.ht");
    const before = await db(p);
    await go(p, "/c/musique");
    await p.locator("main article h3").filter({ hasText: "Blue Hour" }).first().click();
    await p.getByRole("dialog").getByRole("button", { name: "Acheter", exact: true }).click();
    await pay(p, /^Payer/, "Achat simulé confirmé");
    await p.keyboard.press("Escape");
    const after = await db(p);
    const sale = after.ledger.find((e) => !before.ledger.some((old) => old.id === e.id));
    check("purchase still debits the displayed total", balance(after, "u_numa") === balance(before, "u_numa") - 480);
    check("existing Basic commission is unchanged", sale.commission === 18 && balance(after, "u_milo") === balance(before, "u_milo") + 462);
    await bell(p).click();
    check("buyer cannot see the seller's purchase notification", await p.locator(`[data-notification-id="${sale.id}"]`).count() === 0);
    await bell(p).click();
    await login(p, "milo.grey@demo.ht");
    await bell(p).click();
    const notice = p.locator(`[data-notification-id="${sale.id}"]`);
    check("seller receives purchase notification", /Atelier Numa a acheté.*Blue Hour/.test(await notice.innerText()));
    const origin = await p.evaluate(() => location.hash);
    await notice.click();
    await p.locator('[data-testid="transaction-detail"]').waitFor();
    check("purchase redirects to private sales history", await p.evaluate(() => location.hash) === `#/studio/transactions/${sale.id}`);
    const receipt = p.locator('[data-testid="transaction-detail"]');
    check("receipt is the selected transaction", await receipt.getAttribute("data-transaction-id") === sale.id);
    check("receipt shows original transaction date", await receipt.locator("time").getAttribute("datetime") === sale.date);
    const detailText = normalize(await receipt.innerText());
    check("receipt shows title, price, deductions, and net", detailText.includes("Blue Hour") && detailText.includes("480 HTG") && detailText.includes("3,75 %") && detailText.includes("18 HTG") && detailText.includes("462 HTG"));
    await p.screenshot({ path: "/tmp/solde-private-receipt.png" });
    await p.getByRole("button", { name: "Retour aux notifications", exact: true }).click();
    check("return arrow reopens notifications", await p.locator('[data-testid="notifications-panel"]').isVisible());
    check("return arrow restores previous page", await p.evaluate(() => location.hash) === origin);
    await p.locator(`[data-notification-id="${sale.id}"]`).click();
    await p.goBack();
    await p.waitForTimeout(200);
    check("browser Back also restores the notification panel", await p.locator('[data-testid="notifications-panel"]').isVisible());
    await bell(p).click();
    await login(p, "nadia.pierre@demo.ht");
    await go(p, `/studio/transactions/${sale.id}`);
    check("direct link denied to an unrelated account", await p.locator('[data-testid="transaction-detail"]').count() === 0 && /Transaction privée ou indisponible/.test(await p.locator("main").innerText()));
    await go(p, "/profil/u_milo");
    await p.locator("main").getByRole("button", { name: "Soutenir", exact: true }).click();
    await p.getByRole("dialog").locator('input[type="number"]').fill("250");
    await pay(p, /^Envoyer le don/, "Merci pour votre soutien");
    await p.keyboard.press("Escape");
    const donated = await db(p);
    const donation = donated.ledger[0];
    check("donation is recorded once", donation.type === "don" && donation.amount === 250);
    await login(p, "milo.grey@demo.ht");
    await bell(p).click();
    check("donation notification uses the real donor", /Nadia Pierre t'a fait un don de 250 HTG/.test(await p.locator(`[data-notification-id="${donation.id}"]`).innerText()));
    await p.locator(`[data-notification-id="${donation.id}"]`).click();
    check("donation redirects to income history", /Historique des gains/.test(await p.locator("main h1").innerText()));
    check("donation detail shows deductions and net", /Montant du don/.test(await p.locator('[data-testid="transaction-detail"]').innerText()) && /240,62 HTG/.test(normalize(await p.locator('[data-testid="transaction-fees"]').innerText())));
    await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(900);
    check("private receipt remains accessible after reload", await p.locator('[data-transaction-id]').getAttribute('data-transaction-id') === donation.id);
    await p.getByRole("button", { name: "Retour aux notifications", exact: true }).click();
    check("return link works after reloading a receipt", await p.locator('[data-testid="notifications-panel"]').isVisible());
    await bell(p).click();
    await login(p, "direction@solde.demo.ht");
    await go(p, `/studio/transactions/${sale.id}`);
    check("site administrator can view the private receipt", await p.locator('[data-testid="transaction-detail"]').count() === 1);
    await p.context().close();
  }

  // Favorite notifications are persisted and scoped; read state is per account.
  {
    const p = await fresh();
    await login(p, "marie.toussaint@demo.ht");
    await go(p, "/c/musique");
    const card = p.locator("main article").filter({ has: p.locator('h3:text-is("Blue Hour")') });
    const fav = card.locator('[data-testid="fav-button"]');
    const before = await db(p);
    await fav.click(); await p.waitForTimeout(120);
    const after = await db(p);
    const added = after.favoriteEvents[0];
    check("one private alert is created by the favorite action", after.favoriteEvents.length === (before.favoriteEvents?.length ?? 0) + 1 && added.actorId === "u_marie" && added.creatorId === "u_milo" && added.workId === "w_blue");
    check("favorite counter still increments", after.works.find((w) => w.id === "w_blue").favoritesCount === before.works.find((w) => w.id === "w_blue").favoritesCount + 1);
    await fav.click(); await p.waitForTimeout(120);
    check("removing a favorite creates no extra alert", (await db(p)).favoriteEvents.length === after.favoriteEvents.length);
    await login(p, "milo.grey@demo.ht");
    await bell(p).click();
    const item = p.locator(`[data-notification-id="${added.id}"]`);
    check("creator receives favorite notification with name and title", /Marie Toussaint a ajouté votre œuvre.*Blue Hour.*à ses favoris/.test(await item.innerText()));
    await p.screenshot({ path: "/tmp/solde-favorite-notifications.png" });
    await item.click();
    check("favorite notification opens the matching work", /Blue Hour/.test(await p.getByRole("dialog").innerText()));
    await p.keyboard.press("Escape");
    await bell(p).click();
    await p.locator('[data-testid="notifications-panel"]').getByRole("button", { name: "Tout marquer comme lu" }).click();
    check("Milo's unread badge clears", await p.locator('[data-testid="notification-unread"]').count() === 0);
    await bell(p).click();
    await login(p, "nadia.pierre@demo.ht");
    check("Milo's read state does not clear Nadia's unread alerts", await p.locator('[data-testid="notification-unread"]').count() > 0);
    await bell(p).click();
    check("third party cannot see favorite alert", await p.locator(`[data-notification-id="${added.id}"]`).count() === 0);
    await bell(p).click();
    await login(p, "milo.grey@demo.ht");
    await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(900);
    await bell(p).click();
    check("favorite alert is retained after reload", await p.locator(`[data-notification-id="${added.id}"]`).count() === 1);
    check("read state is retained after reload", await p.locator('[data-testid="notification-unread"]').count() === 0);
    await p.context().close();
  }

  // Existing media, account and mobile interactions are not remounted or removed.
  {
    const p = await fresh();
    await login(p, "milo.grey@demo.ht");
    await p.locator('main button[aria-label^="Écouter"]').first().click();
    await p.waitForTimeout(1600);
    await bell(p).click();
    await p.locator('[data-notification-type="sale"]').first().click();
    check("audio continues on the private receipt page", await p.locator('button[aria-label="Pause"]').count() > 0);
    await p.getByRole("button", { name: "Retour aux notifications" }).click();
    check("audio continues when returning to notifications", await p.locator('button[aria-label="Pause"]').count() > 0);
    await bell(p).click();
    await go(p, "/profil/u_milo");
    check("header wallet remains visible", await p.locator('[data-testid="header-wallet"]').isVisible());
    check("library still opens by default", await p.locator('[data-testid="account-tab-library"]').getAttribute("aria-expanded") === "true");
    check("messages remain collapsed by default", await p.locator("#account-messages").count() === 0);
    await p.context().close();

    const m = await fresh(390, 844);
    await login(m, "milo.grey@demo.ht");
    for (const [trigger, panel] of [
      ['[data-testid="palette-button"]', '[data-testid="appearance-panel"]'],
      ['[data-testid="notification-bell"]', '[data-testid="notifications-panel"]'],
      ['[data-testid="header-assistant-mobile"]', '[data-testid="assistant-panel"]'],
    ]) {
      await m.locator(trigger).click();
      check(`mobile ${trigger} opens`, await m.locator(panel).isVisible());
      await m.locator(trigger).click();
      check(`mobile ${trigger} closes`, await m.locator(panel).count() === 0);
    }
    await bell(m).click();
    await m.locator('[data-notification-type="sale"]').first().click();
    check("mobile receipt is visible", await m.locator('[data-testid="transaction-detail"]').isVisible());
    check("mobile receipt does not overflow", await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await m.screenshot({ path: "/tmp/solde-mobile-receipt.png" });
    await m.getByRole("button", { name: "Retour aux notifications" }).click();
    check("mobile return opens notifications", await m.locator('[data-testid="notifications-panel"]').isVisible());
    await bell(m).click();
    await m.locator('header button[aria-label="Titres, artistes, créations…"]').click();
    await m.locator("#solde-search-mobile").fill("lakouu");
    check("mobile fuzzy search finds the original title", (await m.locator("main article h3").allTextContents()).includes("Lakou Nocturne"));
    await m.context().close();
  }
  check("no browser runtime errors", errors.length === 0);
  console.log(`${passed} checks passed.`);
} finally {
  await browser.close();
}