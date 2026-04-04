import type { ActiveExperiment } from "./types";

const STORAGE_KEY = "ab_subject_key";
const SERVER_SUBJECT_KEY = "server-subject";
const CONTROL_VARIANT = "control";
const ON_VARIANT = "on";

export interface AssignmentResult {
  enabled: boolean;
  variant: string;
}

interface NormalizedSegmentRules {
  includeSubjectKeys: string[];
  includeGroups: string[];
  rolloutPercent: number;
}

export const getSubjectKey = (): string => {
  if (typeof window === "undefined") {
    return SERVER_SUBJECT_KEY;
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

const inPercentBucket = (seed: string, percent: number): boolean => {
  if (percent >= 100) {
    return true;
  }
  if (percent <= 0) {
    return false;
  }
  return fnv1a(seed) % 100 < percent;
};

const getSegmentRules = (
  experiment: ActiveExperiment
): NormalizedSegmentRules => {
  const rules = experiment.segmentRules ?? {};
  return {
    includeSubjectKeys: rules.includeSubjectKeys ?? [],
    includeGroups: rules.includeGroups ?? [],
    rolloutPercent: rules.rolloutPercent ?? 100
  };
};

const hasGroupMatch = (includeGroups: string[], userGroups: string[]): boolean => {
  if (!includeGroups.length || !userGroups.length) {
    return false;
  }

  const userGroupsSet = new Set(userGroups);
  return includeGroups.some((group) => userGroupsSet.has(group));
};

const resolveVariantInsideTraffic = (
  subjectKey: string,
  experiment: ActiveExperiment
): string => {
  if (!experiment.variants.length) {
    return ON_VARIANT;
  }

  const variantBucket = fnv1a(`${subjectKey}:${experiment.key}:variants`) % 100;
  let cumulative = 0;

  for (const variant of experiment.variants) {
    cumulative += variant.weightPercent;
    if (variantBucket < cumulative) {
      return variant.key;
    }
  }

  return experiment.variants[0]?.key ?? CONTROL_VARIANT;
};

export const isInTraffic = (subjectKey: string, experiment: ActiveExperiment): boolean => {
  return inPercentBucket(
    `${experiment.key}:${subjectKey}:traffic`,
    experiment.trafficPercent
  );
};

export const isExperimentEnabled = (
  subjectKey: string,
  userGroups: string[],
  experiment: ActiveExperiment
): boolean => {
  if (!experiment.featureEnabled) {
    return false;
  }

  const {
    includeSubjectKeys,
    includeGroups,
    rolloutPercent
  } = getSegmentRules(experiment);

  if (!includeSubjectKeys.length && !includeGroups.length && rolloutPercent === 100) {
    return true;
  }

  if (includeSubjectKeys.includes(subjectKey)) {
    return true;
  }

  if (hasGroupMatch(includeGroups, userGroups)) {
    return true;
  }

  return inPercentBucket(`${experiment.key}:${subjectKey}:segment`, rolloutPercent);
};

export const resolveVariant = (
  subjectKey: string,
  experiment: ActiveExperiment
): string => {
  if (!isInTraffic(subjectKey, experiment)) {
    return CONTROL_VARIANT;
  }

  return resolveVariantInsideTraffic(subjectKey, experiment);
};

export const resolveAssignment = (
  subjectKey: string,
  userGroups: string[],
  experiment: ActiveExperiment
): AssignmentResult => {
  const eligible = isExperimentEnabled(subjectKey, userGroups, experiment);
  if (!eligible) {
    return { enabled: false, variant: CONTROL_VARIANT };
  }

  if (!isInTraffic(subjectKey, experiment)) {
    return { enabled: false, variant: CONTROL_VARIANT };
  }

  return {
    enabled: true,
    variant: resolveVariantInsideTraffic(subjectKey, experiment)
  };
};
