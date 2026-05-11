import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { adminUiPatterns } from "../src/shared/config";

const loginViaUi = async (page: Page) => {
  await page.goto("/");
  await page.getByLabel(adminUiPatterns.auth.emailLabel).fill("admin@local.test");
  await page.getByLabel(adminUiPatterns.auth.passwordLabel).fill("admin123");
  await page.getByRole("button", { name: adminUiPatterns.auth.loginButton }).click();
  await expect(page.getByRole("button", { name: adminUiPatterns.tabs.toggles })).toBeVisible();
};

const loginViaApi = async (request: APIRequestContext) => {
  const response = await request.post("http://localhost:3000/auth/login", {
    data: {
      email: "admin@local.test",
      password: "admin123"
    }
  });

  expect(response.ok()).toBeTruthy();
  const data = (await response.json()) as { accessToken: string };
  return data.accessToken;
};

const createToggleViaApi = async (
  request: APIRequestContext,
  token: string,
  key: string,
  variants: Array<{ key: string; weightPercent: number; payload: Record<string, unknown> }>
) => {
  const response = await request.post("http://localhost:3000/admin/feature-toggles", {
    headers: {
      Authorization: `Bearer ${token}`
    },
    data: {
      appId: "demo-app",
      key,
      name: key,
      featureKey: key,
      featureEnabled: true,
      status: "active",
      trafficPercent: 100,
      segmentRules: {
        includeGroups: [],
        includeSubjectKeys: [],
        rolloutPercent: 100
      },
      variants
    }
  });

  expect(response.ok()).toBeTruthy();
  const data = (await response.json()) as { id: string };
  return data.id;
};

const deleteToggleViaApi = async (
  request: APIRequestContext,
  token: string,
  id: string
) => {
  await request.delete(`http://localhost:3000/admin/feature-toggles/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

test.describe("Admin Toggles", () => {
  test("preserves variant comments on edit", async ({ page, request }) => {
    const token = await loginViaApi(request);
    const toggleKey = `pw-variant-comment-${Date.now()}`;

    await loginViaUi(page);
    await page.getByRole("button", { name: adminUiPatterns.tabs.toggles }).click();
    await page.getByRole("button", { name: adminUiPatterns.toggles.createButton }).click();

    await page.getByLabel("App ID").fill("demo-app");
    await page.getByLabel("Feature key").fill(toggleKey);
    await page.getByLabel("Experiment key").fill(toggleKey);
    await page.getByLabel("Name").fill(toggleKey);

    await page.getByRole("button", { name: /Добавить вариант/i }).click();
    await page.getByRole("button", { name: /Добавить вариант/i }).click();

    const rows = page.locator(".toggle-drawer-organism__variant-row");
    await expect(rows).toHaveCount(2);

    await rows.nth(0).locator("input").nth(0).fill("A");
    await rows.nth(0).locator("input").nth(2).fill("Контрольный вариант");
    await rows.nth(1).locator("input").nth(0).fill("B");
    await rows.nth(1).locator("input").nth(2).fill("Новый вариант");

    await page.locator(".toggle-drawer-organism__actions button").click();
    await expect(page.getByRole("heading", { name: adminUiPatterns.toggleDrawer.heading })).toHaveCount(0);

    const row = page.locator(".toggles-organism__table tbody tr").filter({ hasText: toggleKey });
    await row.getByRole("button", { name: /Изменить/i }).click();

    await expect(rows.nth(0).locator("input").nth(2)).toHaveValue("Контрольный вариант");
    await expect(rows.nth(1).locator("input").nth(2)).toHaveValue("Новый вариант");

    await page.getByRole("button", { name: adminUiPatterns.toggleDrawer.closeButton }).click();

    const listResponse = await request.get("http://localhost:3000/admin/feature-toggles", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const listData = (await listResponse.json()) as {
      experiments: Array<{ id: string; key: string }>;
    };
    const toggleId = listData.experiments.find((item) => item.key === toggleKey)?.id;
    expect(toggleId).toBeTruthy();

    await deleteToggleViaApi(request, token, toggleId!);
  });

  test("removes only one variant from drawer", async ({ page }) => {
    await loginViaUi(page);
    await page.getByRole("button", { name: adminUiPatterns.tabs.toggles }).click();
    await page.getByRole("button", { name: adminUiPatterns.toggles.createButton }).click();

    for (let index = 0; index < 4; index += 1) {
      await page.getByRole("button", { name: /Добавить вариант/i }).click();
    }

    const rows = page.locator(".toggle-drawer-organism__variant-row");
    await expect(rows).toHaveCount(4);

    await rows.nth(1).getByRole("button", { name: /Удалить/i }).click();

    await expect(rows).toHaveCount(3);
  });

  test("shows analytics with variant rows for selected toggle", async ({ page, request }) => {
    const token = await loginViaApi(request);
    const toggleKey = `pw-analytics-${Date.now()}`;
    const toggleId = await createToggleViaApi(request, token, toggleKey, [
      { key: "A", weightPercent: 50, payload: { variant: "A", comment: "Контрольный" } },
      { key: "B", weightPercent: 50, payload: { variant: "B", comment: "Новый" } }
    ]);

    const now = new Date().toISOString();
    const eventsResponse = await request.post("http://localhost:3000/sdk/events/batch", {
      data: {
        events: [
          {
            event_id: `${toggleKey}-1`,
            app_id: "demo-app",
            subject_key: "subject-a",
            experiment_key: toggleKey,
            variant_key: "A",
            type: "impression",
            ts: now,
            meta: { source: "playwright" }
          },
          {
            event_id: `${toggleKey}-2`,
            app_id: "demo-app",
            subject_key: "subject-b",
            experiment_key: toggleKey,
            variant_key: "B",
            type: "impression",
            ts: now,
            meta: { source: "playwright" }
          },
          {
            event_id: `${toggleKey}-3`,
            app_id: "demo-app",
            subject_key: "subject-a",
            experiment_key: toggleKey,
            variant_key: "A",
            type: "click",
            ts: now,
            meta: { source: "playwright" }
          }
        ]
      }
    });
    expect(eventsResponse.ok()).toBeTruthy();

    await loginViaUi(page);
    await page.getByRole("button", { name: adminUiPatterns.tabs.toggles }).click();
    await page.getByPlaceholder("Поиск по названию или ключу").fill(toggleKey);

    const row = page.locator(".toggles-organism__table tbody tr").filter({ hasText: toggleKey });
    await expect(row).toHaveCount(1);
    await row.getByRole("button", { name: /Аналитика/i }).click();

    await expect(
      page.locator(".dashboard-organism__muted").filter({ hasText: toggleKey })
    ).toContainText(toggleKey);
    await expect(page.locator(".dashboard-organism__table")).toContainText("A");
    await expect(page.locator(".dashboard-organism__table")).toContainText("B");
    await expect(page.locator(".dashboard-organism__stats")).toContainText("2");
    await expect(page.locator(".dashboard-organism__stats")).toContainText("1");

    await deleteToggleViaApi(request, token, toggleId);
  });
});
