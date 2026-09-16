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
  await expect(page.getByTestId("balance-table")).toBeVisible();

  // The logged-in identity now shows in the header's user menu, not on the
  // main panel — open it and check the name there.
  await page.getByTestId("user-menu-button").click();
  await expect(page.getByTestId("user-menu-name")).toHaveText("E001");
  await page.getByTestId("user-menu-button").click(); // close it again

  // Transactions post against an existing account (a <select>, not free
  // text) - "Cash" is always present via the seed data. apps:up keeps
  // MySQL data across runs, so assert the *delta*, not an absolute final
  // value, which would eventually diverge between runs.
  const balanceRow = page.getByTestId("balance-row-Cash");
  const balanceCell = balanceRow.locator("td").nth(1);
  const before = Number(await balanceCell.textContent());

  const form = page.getByTestId("item-form");
  await form.getByTestId("item-account-select").selectOption("Cash");
  await form.locator('input[name="quantity"]').fill("3");
  await page.getByTestId("item-submit").click();

  await expect(balanceCell).toHaveText(String(before + 3));
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

  // Logout now lives inside the user menu dropdown, not as a plain header link.
  await page.getByTestId("user-menu-button").click();
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
  await page.getByTestId("user-menu-button").click();
  await expect(page.getByTestId("user-menu-name")).toHaveText("E003");
  await expect(page.getByTestId("logout-link")).toBeVisible();
});
