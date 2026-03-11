export type ABEventType = "impression" | "click" | "conversion" | "custom";

export interface ABProviderConfig {
  apiUrl: string;
  appId: string;
  userGroups?: string[];
  cacheTtlMs?: number;
  flushIntervalMs?: number;
  batchSize?: number;
}

export interface TrackEventInput {
  event_id?: string;
  type: ABEventType;
  experiment_key: string;
  variant_key: string;
  ts?: string;
  meta?: Record<string, unknown>;
}

export interface ABHookResult {
  variant: string;
  enabled: boolean;
  track: (eventType: ABEventType, meta?: Record<string, unknown>) => void;
}

export interface SegmentRules {
  includeAnonymousIds?: string[];
  includeGroups?: string[];
  rolloutPercent?: number;
}

export interface ActiveExperiment {
  key: string;
  featureKey: string;
  featureEnabled: boolean;
  segmentRules?: SegmentRules;
  trafficPercent: number;
  variants: Array<{
    key: string;
    weightPercent: number;
  }>;
}
