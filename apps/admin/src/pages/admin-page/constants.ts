import type { ToggleForm } from "./types";

export const defaultToggleForm: ToggleForm = {
  appId: "demo-app",
  key: "cta-color",
  name: "Тест кнопок CTA",
  featureKey: "new-cta",
  featureEnabled: true,
  rolloutPercent: 100,
  trafficPercent: 100,
  groupNames: [],
  includeIdsRaw: "",
  variants: [
    { key: "A", weightPercent: 50 },
    { key: "B", weightPercent: 50 }
  ]
};

export const defaultGroupName = "beta-team";
export const defaultGroupDescription = "Команда бета-релизов";
