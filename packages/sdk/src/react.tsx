import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { ExperimentClient } from "./client";
import { EventBuffer } from "./events";
import {
  getSubjectKey,
  resolveAssignment
} from "./assignment";
import type { AssignmentResult } from "./assignment";
import type {
  ABHookResult,
  ABProviderConfig,
  ActiveExperiment,
  TrackEventInput
} from "./types";

const DEFAULT_CACHE_TTL_MS = 30_000;
const CONTROL_VARIANT = "control";
const EMPTY_GROUPS: string[] = [];

interface ABContextValue {
  experiments: ActiveExperiment[];
  track: (event: TrackEventInput) => void;
  getAssignment: (experimentKey: string) => AssignmentResult;
}

const ABContext = createContext<ABContextValue | null>(null);

export const ABProvider = ({
  children,
  config
}: PropsWithChildren<{ config: ABProviderConfig }>) => {
  const [experiments, setExperiments] = useState<ActiveExperiment[]>([]);
  const subjectKey = useMemo(() => config.subjectKey?.trim() || getSubjectKey(), [config.subjectKey]);
  const userGroups = config.userGroups ?? EMPTY_GROUPS;
  const cacheTtlMs = config.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const client = useMemo(
    () => new ExperimentClient(config.apiUrl, cacheTtlMs),
    [config.apiUrl, cacheTtlMs]
  );
  const eventBuffer = useMemo(
    () => new EventBuffer(config, subjectKey),
    [config.apiUrl, config.appId, config.flushIntervalMs, config.batchSize, subjectKey]
  );

  useEffect(() => {
    let isUnmounted = false;

    const load = async () => {
      const current = await client.getActiveExperiments(config.appId);
      if (isUnmounted) {
        return;
      }
      setExperiments(current);
    };

    void load();
    const timer = setInterval(() => {
      void load();
    }, cacheTtlMs);

    return () => {
      isUnmounted = true;
      clearInterval(timer);
    };
  }, [cacheTtlMs, client, config.appId]);

  useEffect(() => {
    eventBuffer.start();

    return () => {
      eventBuffer.stop();
      void eventBuffer.flush();
    };
  }, [eventBuffer]);

  const track = useCallback(
    (event: TrackEventInput) => {
      eventBuffer.track(event);
    },
    [eventBuffer]
  );

  const getAssignment = useCallback(
    (experimentKey: string): AssignmentResult => {
      const experiment = experiments.find((item: ActiveExperiment) => item.key === experimentKey);
      if (!experiment) {
        return { enabled: false, variant: CONTROL_VARIANT };
      }

      return resolveAssignment(subjectKey, userGroups, experiment);
    },
    [experiments, subjectKey, userGroups]
  );

  const value = useMemo<ABContextValue>(
    () => ({
      experiments,
      track,
      getAssignment
    }),
    [experiments, track, getAssignment]
  );

  return <ABContext.Provider value={value}>{children}</ABContext.Provider>;
};

export const useAB = (experimentKey: string): ABHookResult => {
  const context = useContext(ABContext);
  if (!context) {
    throw new Error("useAB must be used inside ABProvider");
  }

  const { enabled, variant } = context.getAssignment(experimentKey);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    context.track({
      type: "impression",
      experiment_key: experimentKey,
      variant_key: variant
    });
  }, [context.track, enabled, experimentKey, variant]);

  return {
    variant: enabled ? variant : CONTROL_VARIANT,
    enabled,
    track: (eventType, meta) => {
      if (!enabled) {
        return;
      }
      context.track({
        type: eventType,
        experiment_key: experimentKey,
        variant_key: variant,
        meta
      });
    }
  };
};
