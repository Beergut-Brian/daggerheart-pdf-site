import { defineConfig } from "@playwright/test";

const port = 3100;
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${port}`,
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || "/ms-playwright/chromium-1248/chrome-linux64/chrome", args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
  },
  projects: [
    { name: "desktop-1440", use: { viewport: { width: 1440, height: 900 } } },
    { name: "phone-390", use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } },
  ],
  webServer: { command: `npx next start -p ${port}`, port, reuseExistingServer: true, timeout: 60_000 },
});
