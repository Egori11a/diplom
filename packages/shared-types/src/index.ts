export type ExperimentStatus = "draft" | "active" | "paused" | "archived";

export type EventType = "impression" | "click" | "conversion" | "custom";

export interface Variant {
  id: string;
  key: string;
  weightPercent: number;
  payload: Record<string, unknown>;
  comment?: string;
}

export interface Experiment {
  id: string;
  key: string;
  name: string;
  featureKey: string;
  featureEnabled: boolean;
  segmentRules?: {
    includeSubjectKeys?: string[];
    includeGroups?: string[];
    rolloutPercent?: number;
  };
  status: ExperimentStatus;
  trafficPercent: number;
  startAt: string | null;
  endAt: string | null;
  variants: Variant[];
}

export interface SdkEvent {
  event_id: string;
  app_id: string;
  subject_key: string;
  experiment_key: string;
  variant_key: string;
  type: EventType;
  ts: string;
  meta?: Record<string, unknown>;
}

export interface AnalyticsResponse {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversion_rate: number;
  wilson_low: number;
  wilson_high: number;
}
