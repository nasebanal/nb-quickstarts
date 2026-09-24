import { expect, test } from "@playwright/test";

test("login and register an account", async ({ page }) => {
  await page.goto("/");

  // Landing page first — no login fields until you open the login modal.
  await expect(page.getByTestId("login-open")).toBeVisible();
  await expect(page.getByTestId("login-modal")).not.toBeVisible();

  await page.getByTestId("login-open").click();
  await expect(page.getByTestId("login-modal")).toBeVisible();

  await page.getByTestId("username-input").fill("demo");
  await page.getByTestId("password-input").fill("demo");
  await page.getByTestId("login-submit").click();

  // Successful login navigates to a real route, /accounts.
  await page.waitForURL("**/accounts");
  await expect(page.getByTestId("balance-table")).toBeVisible();

  // The logged-in identity now shows in the header's user menu, not on the
  // main panel — open it and check the name there. It's the profile's
  // display name (from the users table's seed data), with the username under it.
  await page.getByTestId("user-menu-button").click();
  await expect(page.getByTestId("user-menu-name")).toHaveText("Demo User");
  await expect(page.getByTestId("user-menu-username")).toHaveText("demo");
  await page.getByTestId("user-menu-button").click(); // close it again

  // Transactions post against an existing account (a <select>, not free
  // text) - "Cash" is always present via the seed data. apps:up keeps
  // MySQL data across runs, so assert the *delta*, not an absolute final
  // value, which would eventually diverge between runs.
  const balanceRow = page.getByTestId("balance-row-Cash");
  const balanceCell = balanceRow.locator("td").nth(1);
  const before = Number(await balanceCell.textContent());

  const form = page.getByTestId("account-form");
  await form.getByTestId("account-select").selectOption("Cash");
  await form.locator('input[name="quantity"]').fill("3");
  await page.getByTestId("account-submit").click();

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

test("visiting /accounts directly without logging in redirects home", async ({ page }) => {
  await page.goto("/accounts");
  await page.waitForURL((url) => !url.pathname.startsWith("/accounts"));
  await expect(page.getByTestId("login-open")).toBeVisible();
});

test("header login/logout link", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("header-login-link")).toBeVisible();
  await page.getByTestId("header-login-link").click();
  await expect(page.getByTestId("login-modal")).toBeVisible();

  await page.getByTestId("username-input").fill("demo");
  await page.getByTestId("password-input").fill("demo");
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/accounts");

  // Logout now lives inside the user menu dropdown, not as a plain header link.
  await page.getByTestId("user-menu-button").click();
  await expect(page.getByTestId("logout-link")).toBeVisible();
  await page.getByTestId("logout-link").click();

  // Logging out clears the token, which the /accounts page's own guard
  // reacts to by sending the viewer back home.
  await page.waitForURL((url) => !url.pathname.startsWith("/accounts"));
  await expect(page.getByTestId("header-login-link")).toBeVisible();
});

test("logo click from /accounts reloads in place and keeps the session", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("login-open").click();
  await page.getByTestId("username-input").fill("demo");
  await page.getByTestId("password-input").fill("demo");
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/accounts");

  // AuthProvider persists the token to sessionStorage (see
  // AuthProvider.tsx), so a full reload — confirmed via Playwright's
  // navigation-triggered load event — keeps the viewer logged in on the
  // same page instead of bouncing them back to "/".
  const [navigation] = await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: "NASEBANAL Demo" }).click(),
  ]);
  void navigation;

  await expect(page).toHaveURL(/\/accounts$/);
  await page.getByTestId("user-menu-button").click();
  await expect(page.getByTestId("user-menu-name")).toHaveText("Demo User");
  await expect(page.getByTestId("logout-link")).toBeVisible();
});

test("a wrong password is rejected and keeps the modal open", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("login-open").click();
  await page.getByTestId("username-input").fill("demo");
  await page.getByTestId("password-input").fill("not-the-password");
  await page.getByTestId("login-submit").click();

  await expect(page.getByTestId("auth-error")).toContainText("401");
  await expect(page.getByTestId("login-modal")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test("profile: shows the recorded email, saves display name and language", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("login-open").click();
  await page.getByTestId("username-input").fill("demo");
  await page.getByTestId("password-input").fill("demo");
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/accounts");

  await page.getByTestId("user-menu-button").click();
  await page.getByTestId("profile-link").click();
  await page.waitForURL("**/profile");

  // The email is recorded (from the users table) but not editable.
  await expect(page.getByTestId("profile-email")).toHaveValue("demo@nasebanal.com");
  await expect(page.getByTestId("profile-email")).toHaveAttribute("readonly", "");

  // The seeded language is Japanese, applied when logging in.
  await expect(page.getByTestId("profile-language")).toHaveValue("ja");
  await expect(page.locator("h1")).toHaveText("プロフィール");

  await page.getByTestId("profile-display-name").fill("Second Tester");
  await page.getByTestId("profile-language").selectOption("en");
  await page.getByTestId("profile-save").click();
  await expect(page.getByTestId("profile-status")).toBeVisible();

  // It stuck: a reload reads it back from the backend, and the UI is now English.
  await page.reload();
  await expect(page.getByTestId("profile-display-name")).toHaveValue("Second Tester");
  await expect(page.getByTestId("profile-language")).toHaveValue("en");
  await expect(page.locator("h1")).toHaveText("Profile");

  // Put the demo user back as the seed data has it, so the test can run again.
  await page.getByTestId("profile-display-name").fill("Demo User");
  await page.getByTestId("profile-language").selectOption("ja");
  await page.getByTestId("profile-save").click();
  await expect(page.getByTestId("profile-status")).toBeVisible();
});
