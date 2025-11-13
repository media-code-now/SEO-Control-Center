import { chromium, type FullConfig } from "@playwright/test";
import fs from "node:fs";
import path from "path";

const STORAGE_DIR = path.join(process.cwd(), "playwright/.auth");
const STORAGE_STATE = path.join(STORAGE_DIR, "user.json");

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL;
  if (!baseURL) {
    throw new Error("Playwright baseURL is not defined");
  }

  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  const email = process.env.E2E_TEST_EMAIL ?? "founder@example.com";
  const passcode = process.env.E2E_TEST_PASSCODE ?? "local-passcode";

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${baseURL}/signin`);
  await page.getByTestId("dev-email").fill(email);
  await page.getByTestId("dev-passcode").fill(passcode);
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/" || url.toString().startsWith(`${baseURL}/?`)),
    page.getByTestId("dev-login-submit").click(),
  ]);
  await page.context().storageState({ path: STORAGE_STATE });
  await browser.close();
}

export default globalSetup;
