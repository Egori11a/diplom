import { expect, test } from "@playwright/test";

test.describe("Admin Smoke", () => {
  test("login and basic navigation", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Вход администратора" })).toBeVisible();

    await page.getByLabel("Почта").fill("admin@local.test");
    await page.getByLabel("Пароль").fill("admin123");
    await page.getByRole("button", { name: "Войти" }).click();

    await expect(page.getByRole("button", { name: "Обучение" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Группы" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Фича-тогглы" })).toBeVisible();

    await page.getByRole("button", { name: "Группы" }).click();
    await expect(page.getByRole("heading", { name: "Группы команд" })).toBeVisible();

    const groupName = `pw-group-${Date.now()}`;
    await page.getByLabel("Название группы").fill(groupName);
    await page.getByLabel("Описание").fill("Playwright smoke group");
    await page.getByRole("button", { name: "Создать группу" }).click();
    await expect(page.getByText(groupName)).toBeVisible();

    await page.getByRole("button", { name: "Фича-тогглы" }).click();
    await expect(page.getByRole("heading", { name: "Фича-тогглы" })).toBeVisible();

    await page.getByRole("button", { name: "Создать тоггл" }).click();
    await expect(page.getByRole("heading", { name: "Создание тоггла" })).toBeVisible();
    await page.getByRole("button", { name: "Закрыть" }).click();
    await expect(page.getByRole("heading", { name: "Создание тоггла" })).toHaveCount(0);
  });
});
