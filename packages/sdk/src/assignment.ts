import type { ActiveExperiment } from "./types";

const STORAGE_KEY = "ab_anonymous_id";

export const getAnonymousId = (): string => {
  if (typeof window === "undefined") {
    return "server-anonymous";
  }

  const fromStorage = window.localStorage.getItem(STORAGE_KEY);
  if (fromStorage) {
    return fromStorage;
  }

  const id = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, id);
  return id;
};

const fnv1a = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return hash >>> 0;
};

const inRollout = (seed: string, percent: number): boolean => {
  if (percent >= 100) {
    return true;
  }
  if (percent <= 0) {
    return false;
  }
  return fnv1a(seed) % 100 < percent;
};

export const isExperimentEnabled = (
  anonymousId: string,
  userGroups: string[],
  experiment: ActiveExperiment
): boolean => {
  if (!experiment.featureEnabled) {
    return false;
  }

  const rules = experiment.segmentRules ?? {};
  const includeIds = rules.includeAnonymousIds ?? [];
  const includeGroups = rules.includeGroups ?? [];
  const rolloutPercent = rules.rolloutPercent ?? 100;

  if (!includeIds.length && !includeGroups.length && rolloutPercent === 100) {
    return true;
  }

  if (includeIds.includes(anonymousId)) {
    return true;
  }

  if (includeGroups.some((group) => userGroups.includes(group))) {
    return true;
  }

  return inRollout(`${experiment.key}:${anonymousId}:segment`, rolloutPercent);
};

export const resolveVariant = (
  anonymousId: string,
  experiment: ActiveExperiment
): string => {
  const trafficBucket = fnv1a(`${experiment.key}:${anonymousId}`) % 100;
  if (trafficBucket >= experiment.trafficPercent) {
    return "control";
  }

  const variantBucket = fnv1a(`${anonymousId}:${experiment.key}:variants`) % 100;
  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += variant.weightPercent;
    if (variantBucket < cumulative) {
      return variant.key;
    }
  }

  return experiment.variants[0]?.key ?? "control";
};
