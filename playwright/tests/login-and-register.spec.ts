import { expect, test } from "@playwright/test";

test("login and register an item", async ({ page }) => {
  await page.goto("/");

  // Landing page first — no username field until you open the login modal.
  await expect(page.getByTestId("login-open")).toBeVisible();
  await expect(page.getByTestId("login-modal")).not.toBeVisible();

  await page.getByTestId("login-open").click();
  await expect(page.getByTestId("login-modal")).toBeVisible();

  await page.getByTestId("employee-code-input").fill("E001");
  await page.getByTestId("login-submit").click();

  // Successful login navigates to a real route, /items.
  await page.waitForURL("**/items");
  await expect(page.getByTestId("auth-status")).toContainText("E001");
  await expect(page.getByTestId("item-table")).toBeVisible();

  // Unique per run — apps:up keeps MySQL data across runs, so a fixed name
  // would eventually match more than one row and fail Playwright's strict
  // mode.
  const itemName = `Playwright Item ${Date.now()}`;
  const form = page.getByTestId("item-form");
  await form.locator('input[name="name"]').fill(itemName);
  await form.locator('input[name="quantity"]').fill("3");
  await page.getByTestId("item-submit").click();

  await expect(page.locator('[data-testid^="item-row-"]', { hasText: itemName })).toBeVisible();
});

test("modal closes without navigating away", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("login-open").click();
  await expect(page.getByTestId("login-modal")).toBeVisible();

  await page.getByTestId("login-modal-overlay").click({ position: { x: 10, y: 10 } });
  await expect(page.getByTestId("login-modal")).not.toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test("visiting /items directly without logging in redirects home", async ({ page }) => {
  await page.goto("/items");
  await page.waitForURL((url) => !url.pathname.startsWith("/items"));
  await expect(page.getByTestId("login-open")).toBeVisible();
});

test("header login/logout link", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("header-login-link")).toBeVisible();
  await page.getByTestId("header-login-link").click();
  await expect(page.getByTestId("login-modal")).toBeVisible();

  await page.getByTestId("employee-code-input").fill("E002");
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/items");

  await expect(page.getByTestId("logout-link")).toBeVisible();
  await page.getByTestId("logout-link").click();

  // Logging out clears the token, which the /items page's own guard
  // reacts to by sending the viewer back home.
  await page.waitForURL((url) => !url.pathname.startsWith("/items"));
  await expect(page.getByTestId("header-login-link")).toBeVisible();
});

test("logo click from /items reloads in place and keeps the session", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("login-open").click();
  await page.getByTestId("employee-code-input").fill("E003");
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/items");

  // AuthProvider persists the token to sessionStorage (see
  // AuthProvider.tsx), so a full reload — confirmed via Playwright's
  // navigation-triggered load event — keeps the viewer logged in on the
  // same page instead of bouncing them back to "/".
  const [navigation] = await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: "NASEBANAL Demo" }).click(),
  ]);
  void navigation;

  await expect(page).toHaveURL(/\/items$/);
  await expect(page.getByTestId("auth-status")).toContainText("E003");
  await expect(page.getByTestId("logout-link")).toBeVisible();
});
