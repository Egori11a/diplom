import { parseCsv, type GroupView, type ToggleView } from "../../../shared/api";
import type { ToggleForm, ToggleFormVariant } from "../types";

interface TogglePayloadVariant {
  key: string;
  weightPercent: number;
  payload: Record<string, unknown>;
}

export interface TogglePayload {
  appId: string;
  key: string;
  name: string;
  featureKey: string;
  featureEnabled: boolean;
  status: "active";
  trafficPercent: number;
  segmentRules: {
    includeGroups: string[];
    includeAnonymousIds: string[];
    rolloutPercent: number;
  };
  variants: TogglePayloadVariant[];
}

export interface BuiltTogglePayload {
  payload: TogglePayload;
  includeAnonymousIds: string[];
}

const toUniqueStrings = (values: string[]): string[] =>
  Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));

const normalizeVariant = (
  variant: ToggleFormVariant
): ToggleFormVariant | null => {
  const key = variant.key.trim();
  const weightPercent = Number(variant.weightPercent);
  if (!key) {
    return null;
  }
  if (!Number.isFinite(weightPercent)) {
    return null;
  }
  return { key, weightPercent };
};

export const buildIncludeAnonymousIds = (
  groups: GroupView[],
  groupNames: string[],
  includeIdsRaw: string
): string[] => {
  const linkedMembers = groups
    .filter((group) => groupNames.includes(group.name))
    .flatMap((group) => group.members.map((member) => member.memberKey));
  return toUniqueStrings([...linkedMembers, ...parseCsv(includeIdsRaw)]);
};

export const buildTogglePayload = (
  form: ToggleForm,
  groups: GroupView[]
): BuiltTogglePayload => {
  const includeGroups = toUniqueStrings(form.groupNames);
  const includeAnonymousIds = buildIncludeAnonymousIds(
    groups,
    includeGroups,
    form.includeIdsRaw
  );
  const variants = form.variants
    .map(normalizeVariant)
    .filter((item): item is ToggleFormVariant => Boolean(item))
    .map((item) => ({
      key: item.key,
      weightPercent: item.weightPercent,
      payload: { variant: item.key }
    }));

  return {
    includeAnonymousIds,
    payload: {
      appId: form.appId.trim(),
      key: form.key.trim(),
      name: form.name.trim(),
      featureKey: form.featureKey.trim(),
      featureEnabled: form.featureEnabled,
      status: "active",
      trafficPercent: Number(form.trafficPercent),
      segmentRules: {
        includeGroups,
        includeAnonymousIds,
        rolloutPercent: Number(form.rolloutPercent)
      },
      variants
    }
  };
};

export const validateTogglePayload = (payload: TogglePayload): string | null => {
  if (!payload.appId || !payload.key || !payload.name || !payload.featureKey) {
    return "Fill appId, experiment key, feature key and name";
  }

  if (
    !Number.isFinite(payload.trafficPercent) ||
    payload.trafficPercent < 0 ||
    payload.trafficPercent > 100
  ) {
    return "Traffic percent must be between 0 and 100";
  }

  if (
    !Number.isFinite(payload.segmentRules.rolloutPercent) ||
    payload.segmentRules.rolloutPercent < 0 ||
    payload.segmentRules.rolloutPercent > 100
  ) {
    return "Rollout percent must be between 0 and 100";
  }

  if (!payload.variants.length) {
    return "Add at least one variant";
  }

  const variantKeys = payload.variants.map((item) => item.key);
  if (new Set(variantKeys).size !== variantKeys.length) {
    return "Variant keys must be unique";
  }

  const invalidVariant = payload.variants.find(
    (item) =>
      !Number.isFinite(item.weightPercent) ||
      item.weightPercent <= 0 ||
      item.weightPercent > 100
  );
  if (invalidVariant) {
    return `Variant ${invalidVariant.key} must have weight in range 1..100`;
  }

  const sum = payload.variants.reduce(
    (total, variant) => total + variant.weightPercent,
    0
  );
  if (Math.abs(sum - 100) > 0.001) {
    return `Variant weights sum must be 100, current sum is ${sum}`;
  }

  return null;
};

export const toToggleView = (id: string, payload: TogglePayload): ToggleView => ({
  id,
  appId: payload.appId,
  key: payload.key,
  name: payload.name,
  featureKey: payload.featureKey,
  featureEnabled: payload.featureEnabled,
  segmentRules: payload.segmentRules,
  status: payload.status,
  trafficPercent: payload.trafficPercent,
  variants: payload.variants.map((variant) => ({
    key: variant.key,
    weightPercent: variant.weightPercent
  }))
});

export const upsertToggleCache = (
  toggles: ToggleView[],
  nextToggle: ToggleView,
  mode: "create" | "update"
): ToggleView[] => {
  if (mode === "create") {
    return [nextToggle, ...toggles];
  }

  return toggles.map((toggle) =>
    toggle.id === nextToggle.id ? nextToggle : toggle
  );
};

export const removeToggleFromCache = (
  toggles: ToggleView[],
  toggleId: string
): ToggleView[] => toggles.filter((toggle) => toggle.id !== toggleId);
