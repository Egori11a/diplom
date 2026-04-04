import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import { ExperimentClient } from "./client";
import { EventBuffer } from "./events";
import {
  getAnonymousId,
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
  const anonymousId = useMemo(() => getAnonymousId(), []);
  const cacheTtlMs = config.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const clientRef = useRef(
    new ExperimentClient(config.apiUrl, cacheTtlMs)
  );
  const bufferRef = useRef(new EventBuffer(config, anonymousId));

  useEffect(() => {
    bufferRef.current.start();
    const load = async () => {
      const current = await clientRef.current.getActiveExperiments(config.appId);
      setExperiments(current);
    };

    void load();
    const timer = setInterval(() => {
      void load();
    }, cacheTtlMs);

    return () => {
      clearInterval(timer);
      bufferRef.current.stop();
      void bufferRef.current.flush();
    };
  }, [cacheTtlMs, config.appId]);

  const value = useMemo<ABContextValue>(
    () => ({
      experiments,
      track: (event: TrackEventInput) => bufferRef.current.track(event),
      getAssignment: (experimentKey: string) => {
        const experiment = experiments.find(
          (item: ActiveExperiment) => item.key === experimentKey
        );
        if (!experiment) {
          return { enabled: false, variant: "control" };
        }

        return resolveAssignment(anonymousId, config.userGroups ?? [], experiment);
      }
    }),
    [anonymousId, config.userGroups, experiments]
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
  }, [context, enabled, experimentKey, variant]);

  return {
    variant: enabled ? variant : "control",
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
