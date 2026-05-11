import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ABProvider, useAB } from "./react";
import type { ActiveExperiment, TrackEventInput } from "./types";

const experiment: ActiveExperiment = {
  key: "checkout-cta",
  featureKey: "checkout-cta",
  featureEnabled: true,
  segmentRules: { rolloutPercent: 100 },
  trafficPercent: 100,
  variants: [{ key: "A", weightPercent: 100 }]
};

const trackedEvents: TrackEventInput[] = [];
const getActiveExperiments = vi.fn<() => Promise<ActiveExperiment[]>>();

vi.mock("./client", () => ({
  ExperimentClient: class {
    constructor(_: string, __: number) {}

    getActiveExperiments(appId: string) {
      return getActiveExperiments().then((items) =>
        appId ? items : []
      );
    }
  }
}));

vi.mock("./events", () => ({
  EventBuffer: class {
    constructor(_: unknown, __: string) {}

    start() {}

    stop() {}

    flush() {
      return Promise.resolve();
    }

    track(event: TrackEventInput) {
      trackedEvents.push(event);
    }
  }
}));

class FakeIntersectionObserver {
  static instance: FakeIntersectionObserver | null = null;

  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    FakeIntersectionObserver.instance = this;
  }

  observe() {}

  disconnect() {}

  emit(intersectionRatio: number, isIntersecting = true) {
    this.callback(
      [
        {
          isIntersecting,
          intersectionRatio
        } as IntersectionObserverEntry
      ],
      this as unknown as IntersectionObserver
    );
  }
}

const TestComponent = () => {
  const ab = useAB("checkout-cta");

  return <div data-testid="impression-target" ref={ab.impressionRef} />;
};

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("useAB impressionRef", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
    trackedEvents.length = 0;
    getActiveExperiments.mockResolvedValue([experiment]);
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible"
    });
    vi.stubGlobal(
      "IntersectionObserver",
      FakeIntersectionObserver as unknown as typeof IntersectionObserver
    );
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    FakeIntersectionObserver.instance = null;
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("tracks impression only after visible enough dwell time", async () => {
    await act(async () => {
      root.render(
        <ABProvider
          config={{
            apiUrl: "http://localhost:3000",
            appId: "demo-app",
            subjectKey: "user-1"
          }}
        >
          <TestComponent />
        </ABProvider>
      );
      await flushPromises();
    });

    expect(FakeIntersectionObserver.instance).not.toBeNull();

    await act(async () => {
      FakeIntersectionObserver.instance?.emit(0.6, true);
      vi.advanceTimersByTime(699);
    });
    expect(trackedEvents).toHaveLength(0);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(trackedEvents).toHaveLength(1);
    expect(trackedEvents[0]).toMatchObject({
      type: "impression",
      experiment_key: "checkout-cta",
      variant_key: "A"
    });
  });

  it("does not track impression when element is not visible enough", async () => {
    await act(async () => {
      root.render(
        <ABProvider
          config={{
            apiUrl: "http://localhost:3000",
            appId: "demo-app",
            subjectKey: "user-1"
          }}
        >
          <TestComponent />
        </ABProvider>
      );
      await flushPromises();
    });

    await act(async () => {
      FakeIntersectionObserver.instance?.emit(0.49, true);
      vi.advanceTimersByTime(1_000);
    });

    expect(trackedEvents).toHaveLength(0);
  });

  it("does not track impression while document is hidden", async () => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden"
    });

    await act(async () => {
      root.render(
        <ABProvider
          config={{
            apiUrl: "http://localhost:3000",
            appId: "demo-app",
            subjectKey: "user-1"
          }}
        >
          <TestComponent />
        </ABProvider>
      );
      await flushPromises();
    });

    await act(async () => {
      FakeIntersectionObserver.instance?.emit(0.8, true);
      vi.advanceTimersByTime(1_000);
    });

    expect(trackedEvents).toHaveLength(0);
  });
});
