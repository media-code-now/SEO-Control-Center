import { test, expect } from "@playwright/test";

test.describe("Tasks and dashboard", () => {
  test("dashboard metrics and charts render", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Workspace")).toBeVisible();
    await expect(page.getByText("GSC clicks")).toBeVisible();
    await expect(page.getByText("Impressions")).toBeVisible();
    await expect(page.getByText("Avg. position")).toBeVisible();
    await expect(page.getByText("Top opportunities")).toBeVisible();
  });

  test("can create task, move columns, and delete", async ({ page }) => {
    await page.goto("/tasks");
    const title = `Playwright Task ${Date.now()}`;

    await page.getByRole("button", { name: "New task" }).click();
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Description").fill("Playwright smoke task");
    await page.getByLabel("Score current").fill("10");
    await page.getByLabel("Score potential").fill("80");
    await page.getByRole("button", { name: "Create task" }).click();

    const taskCard = page.locator(`[data-testid="task-card"][data-task-title="${title}"]`).first();
    await expect(taskCard).toBeVisible();

    await taskCard.dragTo(page.locator('[data-testid="kanban-column-in_progress"]'));
    await expect(
      page.locator(`[data-testid="task-card"][data-task-title="${title}"][data-status="IN_PROGRESS"]`).first(),
    ).toBeVisible();

    await page.locator(`[data-testid="task-card"][data-task-title="${title}"]`).getByRole("button", { name: "Delete" }).click();
    await expect(page.locator(`[data-testid="task-card"][data-task-title="${title}"]`)).toHaveCount(0);
  });
});
