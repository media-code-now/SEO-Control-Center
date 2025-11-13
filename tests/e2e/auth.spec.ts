import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test.use({ storageState: undefined });

  test("dev credentials login signs user in", async ({ page, baseURL }) => {
    await page.goto("/signin");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await page.getByTestId("dev-email").fill(process.env.E2E_TEST_EMAIL ?? "founder@example.com");
    await page.getByTestId("dev-passcode").fill(process.env.E2E_TEST_PASSCODE ?? "local-passcode");
    await Promise.all([
      page.waitForURL(`${baseURL ?? "http://localhost:3000"}/**`),
      page.getByTestId("dev-login-submit").click(),
    ]);
    await expect(page.getByText("Workspace")).toBeVisible();
  });
});
