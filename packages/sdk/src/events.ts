import type { ABProviderConfig, TrackEventInput } from "./types";

interface SdkEvent {
  event_id: string;
  app_id: string;
  subject_key: string;
  experiment_key: string;
  variant_key: string;
  type: "impression" | "click" | "conversion" | "custom";
  ts: string;
  meta?: Record<string, unknown>;
}

export class EventBuffer {
  private readonly events: SdkEvent[] = [];
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly config: ABProviderConfig,
    private readonly subjectKey: string
  ) {
    this.batchSize = config.batchSize ?? 20;
    this.flushIntervalMs = config.flushIntervalMs ?? 5_000;
  }

  start(): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      void this.flush();
    }, this.flushIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  track(event: TrackEventInput): void {
    this.events.push({
      event_id: event.event_id ?? crypto.randomUUID(),
      app_id: this.config.appId,
      subject_key: this.subjectKey,
      experiment_key: event.experiment_key,
      variant_key: event.variant_key,
      type: event.type,
      ts: event.ts ?? new Date().toISOString(),
      meta: event.meta
    });

    if (this.events.length >= this.batchSize) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (!this.events.length) {
      return;
    }

    const payload = this.events.splice(0, this.events.length);

    try {
      await fetch(`${this.config.apiUrl}/sdk/events/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ events: payload })
      });
    } catch {
      this.events.unshift(...payload);
    }
  }
}
