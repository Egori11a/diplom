import {
  useCallback,
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
const IMPRESSION_VIEWPORT_RATIO = 0.5;
const IMPRESSION_VIEWPORT_DWELL_MS = 700;

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
  const [impressionElement, setImpressionElement] = useState<HTMLElement | null>(null);
  const impressionSentRef = useRef(false);
  const dwellTimerRef = useRef<number | null>(null);

  useEffect(() => {
    impressionSentRef.current = false;
  }, [enabled, experimentKey, variant]);

  useEffect(() => {
    if (dwellTimerRef.current === null) {
      return;
    }

    window.clearTimeout(dwellTimerRef.current);
    dwellTimerRef.current = null;
  }, [enabled, experimentKey, variant]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof IntersectionObserver === "undefined" ||
      !enabled ||
      !impressionElement ||
      impressionSentRef.current
    ) {
      return;
    }

    const clearDwellTimer = () => {
      if (dwellTimerRef.current !== null) {
        window.clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
    };

    const sendImpression = () => {
      if (impressionSentRef.current || document.visibilityState !== "visible") {
        return;
      }

      impressionSentRef.current = true;
      context.track({
        type: "impression",
        experiment_key: experimentKey,
        variant_key: variant
      });
    };

    const startDwellTimer = () => {
      if (dwellTimerRef.current !== null) {
        return;
      }

      dwellTimerRef.current = window.setTimeout(() => {
        dwellTimerRef.current = null;
        sendImpression();
      }, IMPRESSION_VIEWPORT_DWELL_MS);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const isVisibleEnough =
          Boolean(entry?.isIntersecting) &&
          (entry?.intersectionRatio ?? 0) >= IMPRESSION_VIEWPORT_RATIO &&
          document.visibilityState === "visible";

        if (!isVisibleEnough) {
          clearDwellTimer();
          return;
        }

        startDwellTimer();
      },
      { threshold: [IMPRESSION_VIEWPORT_RATIO] }
    );

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        clearDwellTimer();
      }
    };

    observer.observe(impressionElement);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearDwellTimer();
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [context.track, enabled, experimentKey, impressionElement, variant]);

  const impressionRef = useCallback((element: HTMLElement | null) => {
    setImpressionElement(element);
  }, []);

  return {
    variant: enabled ? variant : CONTROL_VARIANT,
    enabled,
    impressionRef,
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
