import { expect, test } from "@playwright/test";
import { adminUiPatterns } from "../src/shared/config";

test.describe("Admin Smoke", () => {
  test("login and basic navigation", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: adminUiPatterns.auth.heading })).toBeVisible();

    await page.getByLabel(adminUiPatterns.auth.emailLabel).fill("admin@local.test");
    await page.getByLabel(adminUiPatterns.auth.passwordLabel).fill("admin123");
    await page.getByRole("button", { name: adminUiPatterns.auth.loginButton }).click();

    await expect(page.getByRole("button", { name: adminUiPatterns.tabs.onboarding })).toBeVisible();
    await expect(page.getByRole("button", { name: adminUiPatterns.tabs.groups })).toBeVisible();
    await expect(page.getByRole("button", { name: adminUiPatterns.tabs.toggles })).toBeVisible();
    await expect(page.getByRole("button", { name: adminUiPatterns.tabs.users })).toBeVisible();
    await expect(page.getByRole("button", { name: adminUiPatterns.tabs.audit })).toBeVisible();

    await page.getByRole("button", { name: adminUiPatterns.tabs.groups }).click();
    await expect(page.getByRole("heading", { name: adminUiPatterns.groups.heading })).toBeVisible();

    const groupName = `pw-group-${Date.now()}`;
    await page.getByLabel(adminUiPatterns.groups.nameLabel).fill(groupName);
    await page.getByLabel(adminUiPatterns.groups.descriptionLabel).fill("Playwright smoke group");
    await page.getByRole("button", { name: adminUiPatterns.groups.createButton }).click();
    await expect(page.getByText(groupName)).toBeVisible();

    await page.getByRole("button", { name: adminUiPatterns.tabs.toggles }).click();
    await expect(page.getByRole("heading", { name: adminUiPatterns.toggles.heading })).toBeVisible();

    await page.getByRole("button", { name: adminUiPatterns.toggles.createButton }).click();
    await expect(page.getByRole("heading", { name: adminUiPatterns.toggleDrawer.heading })).toBeVisible();
    await page.getByRole("button", { name: adminUiPatterns.toggleDrawer.closeButton }).click();
    await expect(page.getByRole("heading", { name: adminUiPatterns.toggleDrawer.heading })).toHaveCount(0);

    await page.getByRole("button", { name: adminUiPatterns.tabs.users }).click();
    await expect(page.getByRole("heading", { name: adminUiPatterns.users.heading })).toBeVisible();

    await page.getByRole("button", { name: adminUiPatterns.tabs.audit }).click();
    await expect(page.getByRole("heading", { name: adminUiPatterns.audit.heading })).toBeVisible();
  });
});
