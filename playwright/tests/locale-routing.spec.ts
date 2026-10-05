import { expect, test } from "@playwright/test";

// A leading /en or /ja path segment selects the demo app's language (see
// apps/frontend/next.config.ts's rewrite + LocaleProvider.tsx) without
// moving any page - the address bar keeps the segment, but Next serves the
// same page it would at the unprefixed path underneath it.
test("a /ja path shows Japanese, and the address bar keeps the /ja prefix", async ({ page }) => {
  await page.goto("/ja");

  await expect(page).toHaveURL(/\/ja$/);
  await expect(page.getByTestId("header-login-link")).toHaveText("ログイン");
});

test("a /en path shows English", async ({ page }) => {
  await page.goto("/en");

  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByTestId("header-login-link")).toHaveText("Login");
});

test("/ja/accounts serves the real accounts page in Japanese, without redirecting away", async ({ page }) => {
  await page.goto("/ja");
  await page.getByTestId("login-open").click();
  await page.getByTestId("username-input").fill("demo");
  await page.getByTestId("password-input").fill("demo");
  await page.getByTestId("login-submit").click();

  await page.waitForURL("**/ja/accounts");
  await expect(page.getByTestId("balance-table")).toBeVisible();
});

// The globe menu's language toggle updates a /[lang]-prefixed URL to match,
// instead of leaving the address bar out of sync with the displayed language.
test("switching language from a /ja page navigates to the matching /en page", async ({ page }) => {
  await page.goto("/ja");
  await page.getByRole("button", { name: "Switch language" }).click();
  await page.getByRole("menuitem", { name: "English" }).click();

  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByTestId("header-login-link")).toHaveText("Login");
});

// Logging in directly on a /ja page (no toggle involved) must not get
// silently overwritten to the saved profile language by AuthProvider.tsx's
// own "apply the signed-in user's saved profile language" sync once the
// seeded profile's GET /me resolves (the seeded language is English, so a
// Japanese page flipping to English is the failure to catch) - the URL's own
// /ja segment is what makes that prefix mean anything at all (see
// LocaleProvider.tsx's localeFromPathname() comment) and must keep winning
// over a saved profile language, not just over a just-made manual toggle pick.
test("logging in on a /ja page stays in Japanese, even though the seeded profile language is English", async ({
  page,
}) => {
  await page.goto("/ja");
  await page.getByTestId("login-open").click();
  await page.getByTestId("username-input").fill("demo");
  await page.getByTestId("password-input").fill("demo");
  await page.getByTestId("login-submit").click();

  await page.waitForURL("**/ja/accounts");
  await expect(page.locator("h2").first()).toHaveText("勘定科目残高");
});

// The manual toggle's own pick must stick after the reload it causes on a
// locale-prefixed page (setLocale() navigates - see LocaleProvider.tsx) -
// not get silently re-overwritten by AuthProvider.tsx's own "apply the
// signed-in user's saved profile language" sync, which the seed data would
// otherwise put back to English (see its own comment on the bug this was).
test("picking Japanese from the toggle after login sticks, even though the seeded profile language is English", async ({
  page,
}) => {
  await page.goto("/en");
  await page.getByTestId("login-open").click();
  await page.getByTestId("username-input").fill("demo");
  await page.getByTestId("password-input").fill("demo");
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/en/accounts");
  await expect(page.locator("h2").first()).toHaveText("Account Balances");

  await page.getByRole("button", { name: "Switch language" }).click();
  await page.getByRole("menuitem", { name: "日本語" }).click();
  await page.waitForURL("**/ja/accounts");

  await expect(page.locator("h2").first()).toHaveText("勘定科目残高");
});
