import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  // The whole playwright/ dir is already bind-mounted to /app (see
  // docker-compose.yml), so a relative path here lands directly in
  // playwright/report/ on the host — no extra volume needed.
  reporter: [["list"], ["html", { outputFolder: "report", open: "never" }]],
  use: {
    // Playwright runs on the host network (see docker-compose.yml), so it
    // reaches the frontend the same way a real user's browser would: via
    // the host-published port, not a container DNS name.
    baseURL: process.env.BASE_URL ?? "http://localhost:5173",
  },
});
