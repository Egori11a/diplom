import type { ToggleForm } from "./types";

export const defaultToggleForm: ToggleForm = {
  appId: "demo-app",
  key: "cta-color",
  name: "Тест кнопок CTA",
  featureKey: "new-cta",
  featureEnabled: true,
  rolloutPercent: 100,
  groupNames: [],
  includeIdsRaw: ""
};

export const defaultGroupName = "beta-team";
export const defaultGroupDescription = "Команда бета-релизов";
