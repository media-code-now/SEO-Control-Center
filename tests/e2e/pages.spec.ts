import { test, expect } from "@playwright/test";

test.describe("Page management", () => {
  test("can create, edit, and delete a page", async ({ page }) => {
    await page.goto("/pages");
    const uniquePath = `https://example.com/playwright-${Date.now()}`;

    await page.getByRole("button", { name: "Add page" }).click();
    await page.getByLabel("URL").fill(uniquePath);
    await page.getByLabel("Type").fill("blog");
    await page.getByLabel("Status").fill("draft");
    await page.getByLabel("Owner").fill("QA Bot");
    await page.getByRole("button", { name: "Create page" }).click();

    const pageRow = page.locator("tr").filter({ hasText: uniquePath }).first();
    await expect(pageRow).toBeVisible();

    await pageRow.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Owner").fill("QA Owner");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.locator("tr").filter({ hasText: "QA Owner" }).first()).toBeVisible();

    await pageRow.getByRole("button", { name: "Delete" }).click();
    await expect(page.locator("tr").filter({ hasText: uniquePath })).toHaveCount(0);
  });
});
