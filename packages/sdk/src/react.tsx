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
  isExperimentEnabled,
  isInTraffic,
  resolveVariant
} from "./assignment";
import type {
  ABHookResult,
  ABProviderConfig,
  ActiveExperiment,
  TrackEventInput
} from "./types";

interface ABContextValue {
  experiments: ActiveExperiment[];
  track: (event: TrackEventInput) => void;
  getVariant: (experimentKey: string) => string;
  isEnabled: (experimentKey: string) => boolean;
}

const ABContext = createContext<ABContextValue | null>(null);

export const ABProvider = ({
  children,
  config
}: PropsWithChildren<{ config: ABProviderConfig }>) => {
  const [experiments, setExperiments] = useState<ActiveExperiment[]>([]);
  const anonymousId = useMemo(() => getAnonymousId(), []);
  const clientRef = useRef(
    new ExperimentClient(config.apiUrl, config.cacheTtlMs ?? 30_000)
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
    }, config.cacheTtlMs ?? 30_000);

    return () => {
      clearInterval(timer);
      bufferRef.current.stop();
      void bufferRef.current.flush();
    };
  }, [config.appId, config.cacheTtlMs]);

  const value = useMemo<ABContextValue>(
    () => ({
      experiments,
      track: (event: TrackEventInput) => bufferRef.current.track(event),
      getVariant: (experimentKey: string) => {
        const experiment = experiments.find(
          (item: ActiveExperiment) => item.key === experimentKey
        );
        if (!experiment) {
          return "control";
        }

        return resolveVariant(anonymousId, experiment);
      },
      isEnabled: (experimentKey: string) => {
        const experiment = experiments.find(
          (item: ActiveExperiment) => item.key === experimentKey
        );
        if (!experiment) {
          return false;
        }

        const eligible = isExperimentEnabled(
          anonymousId,
          config.userGroups ?? [],
          experiment
        );

        if (!eligible) {
          return false;
        }

        return isInTraffic(anonymousId, experiment);
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

  const variant = context.getVariant(experimentKey);
  const enabled = context.isEnabled(experimentKey);

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
