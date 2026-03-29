import { expect, test } from "@playwright/test";

const ui = {
  loginHeading: /Вход администратора|Admin login/i,
  emailLabel: /Почта|Email/i,
  passwordLabel: /Пароль|Password/i,
  loginButton: /Войти|Sign in|Login/i,
  onboardingTab: /Обучение|Onboarding/i,
  groupsTab: /Группы|Groups/i,
  togglesTab: /Фича-?тогглы|Feature toggles|Toggles/i,
  groupsHeading: /Группы команд|Team groups|Groups/i,
  groupNameLabel: /Название группы|Group name/i,
  descriptionLabel: /Описание|Description/i,
  createGroupButton: /Создать группу|Create group/i,
  togglesHeading: /Feature toggles|Фича-?тогглы/i,
  createToggleButton: /Create toggle|Создать тоггл/i,
  createToggleHeading: /Create toggle|Создание тоггла/i,
  closeButton: /Close|Закрыть/i
};

test.describe("Admin Smoke", () => {
  test("login and basic navigation", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: ui.loginHeading })).toBeVisible();

    await page.getByLabel(ui.emailLabel).fill("admin@local.test");
    await page.getByLabel(ui.passwordLabel).fill("admin123");
    await page.getByRole("button", { name: ui.loginButton }).click();

    await expect(page.getByRole("button", { name: ui.onboardingTab })).toBeVisible();
    await expect(page.getByRole("button", { name: ui.groupsTab })).toBeVisible();
    await expect(page.getByRole("button", { name: ui.togglesTab })).toBeVisible();

    await page.getByRole("button", { name: ui.groupsTab }).click();
    await expect(page.getByRole("heading", { name: ui.groupsHeading })).toBeVisible();

    const groupName = `pw-group-${Date.now()}`;
    await page.getByLabel(ui.groupNameLabel).fill(groupName);
    await page.getByLabel(ui.descriptionLabel).fill("Playwright smoke group");
    await page.getByRole("button", { name: ui.createGroupButton }).click();
    await expect(page.getByText(groupName)).toBeVisible();

    await page.getByRole("button", { name: ui.togglesTab }).click();
    await expect(page.getByRole("heading", { name: ui.togglesHeading })).toBeVisible();

    await page.getByRole("button", { name: ui.createToggleButton }).click();
    await expect(page.getByRole("heading", { name: ui.createToggleHeading })).toBeVisible();
    await page.getByRole("button", { name: ui.closeButton }).click();
    await expect(page.getByRole("heading", { name: ui.createToggleHeading })).toHaveCount(0);
  });
});
