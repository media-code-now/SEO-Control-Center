import { test, expect } from "@playwright/test";

test.describe("Keyword management", () => {
  test("can create, edit, and delete a keyword", async ({ page }) => {
    await page.goto("/keywords");
    const phrase = `Playwright Keyword ${Date.now()}`;

    await page.getByRole("button", { name: "Add keyword" }).click();
    await page.getByLabel("Phrase").fill(phrase);
    await page.getByLabel("Intent").fill("transactional");
    await page.getByLabel("Cluster").fill("automation");
    await page.getByLabel("Search volume").fill("1200");
    await page.getByLabel("Difficulty").fill("35");
    await page.getByRole("button", { name: "Create keyword" }).click();

    const keywordRow = page.locator("tr").filter({ hasText: phrase }).first();
    await expect(keywordRow).toBeVisible();

    await keywordRow.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Cluster").fill("playwright-updated");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.locator("tr").filter({ hasText: "playwright-updated" }).first()).toBeVisible();

    await keywordRow.getByRole("button", { name: "Delete" }).click();
    await expect(page.locator("tr").filter({ hasText: phrase })).toHaveCount(0);
  });
});
