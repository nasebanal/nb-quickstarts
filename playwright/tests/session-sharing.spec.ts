import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// The login session is an HttpOnly cookie that only the Next.js server reads (apps/frontend/src/app/api/session): shared
// by every tab of the browser, invisible to the page's JavaScript, and sealed so that its value says nothing.

const SESSION_COOKIE = "nb_session";

async function login(page: Page) {
  await page.goto("/");
  await page.getByTestId("login-open").click();
  await page.getByTestId("username-input").fill("demo");
  await page.getByTestId("password-input").fill("demo");
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/accounts");
  await expect(page.getByTestId("balance-table")).toBeVisible();
}

const sessionCookie = async (context: BrowserContext) => (await context.cookies()).find((c) => c.name === SESSION_COOKIE);

test("the session is an HttpOnly, sealed cookie the page's JavaScript cannot see", async ({ page, context }) => {
  await login(page);

  const cookie = await sessionCookie(context);
  expect(cookie, "the server sets the session cookie after login").toBeDefined();
  expect(cookie!.httpOnly).toBe(true);
  expect(cookie!.sameSite).toBe("Lax");
  // Sealed (AES-GCM): neither the user name nor a token can be read out of the value.
  expect(cookie!.value.startsWith("v1.")).toBe(true);
  expect(cookie!.value).not.toContain("demo");
  expect(cookie!.value).not.toContain("eyJ");

  const seen = await page.evaluate(() => {
    const all = (storage: Storage) =>
      Object.keys(storage)
        .map((key) => storage.getItem(key) ?? "")
        .join(" ");
    return {
      cookies: document.cookie,
      tokenInStorage: /eyJ[A-Za-z0-9_-]{20,}\./.test(`${all(sessionStorage)} ${all(localStorage)}`),
    };
  });
  expect(seen.cookies).not.toContain(SESSION_COOKIE);
  expect(seen.tokenInStorage).toBe(false);

  // It survives a reload.
  await page.reload();
  await expect(page.getByTestId("balance-table")).toBeVisible();
});

test("a second tab is signed in, and logging out in one tab signs the other out", async ({ page, context }) => {
  await login(page);

  const other = await context.newPage();
  await other.goto("/accounts");
  await expect(other.getByTestId("balance-table")).toBeVisible();

  await page.getByTestId("user-menu-button").click();
  await page.getByTestId("logout-link").click();
  await page.waitForURL((url) => !url.pathname.startsWith("/accounts"));

  // The other tab hears about it (BroadcastChannel) and leaves /accounts too.
  await other.waitForURL((url) => !url.pathname.startsWith("/accounts"));
  expect(await sessionCookie(context)).toBeUndefined();
});

test("the MCP login page opened in a new tab is already signed in: Allow only, no password", async ({ page, context, request }) => {
  await login(page);

  // What an MCP client does first: register itself with the backend's OAuth login.
  const registration = await request.post("http://localhost:8080/oauth/register", {
    data: {
      client_name: "session-sharing test",
      redirect_uris: ["http://localhost:6274/oauth/callback"],
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
  });
  expect(registration.status()).toBe(201);
  const { client_id } = await registration.json();
  const query = new URLSearchParams({
    response_type: "code",
    client_id,
    redirect_uri: "http://localhost:6274/oauth/callback",
    state: "s",
    code_challenge: "x".repeat(43),
    code_challenge_method: "S256",
  });

  const tab = await context.newPage();
  await tab.goto(`/mcp-authorize?${query}`);
  await expect(tab.getByRole("button", { name: /Allow|許可/ })).toBeVisible();
  await expect(tab.getByTestId("username-input")).toHaveCount(0);
});

test("a damaged cookie means signed out, and the server clears it", async ({ page, context }) => {
  await context.addCookies([{ name: SESSION_COOKIE, value: "v1.garbage", url: "http://localhost:5173" }]);

  await page.goto("/accounts");
  await page.waitForURL((url) => !url.pathname.startsWith("/accounts"));
  expect(await sessionCookie(context)).toBeUndefined();
});

test("the landing page sends a signed-in viewer straight to /accounts, in any tab", async ({ page, context }) => {
  await login(page);

  const other = await context.newPage();
  await other.goto("/ja");
  await other.waitForURL("**/ja/accounts");
  await expect(other.getByTestId("balance-table")).toBeVisible();

  // Signed out, the landing page stays where it is and offers the login.
  await other.getByTestId("user-menu-button").click();
  await other.getByTestId("logout-link").click();
  await other.waitForURL((url) => !url.pathname.startsWith("/ja/accounts"));
  await expect(other.getByTestId("login-open")).toBeVisible();
});
