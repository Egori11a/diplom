const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const login = async (email: string, password: string): Promise<string> => {
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error("Ошибка входа");
  }

  const data = (await response.json()) as { accessToken: string };
  return data.accessToken;
};

export const authFetch = async (
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> => {
  return fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {})
    }
  });
};

export interface GroupMember {
  memberKey: string;
}

export interface GroupView {
  id: string;
  name: string;
  description: string;
  members: GroupMember[];
}

export interface SegmentRules {
  includeSubjectKeys?: string[];
  includeGroups?: string[];
  rolloutPercent?: number;
}

export interface VariantView {
  key: string;
  weightPercent: number;
  comment?: string;
}

export interface ToggleView {
  id: string;
  appId: string;
  key: string;
  name: string;
  featureKey: string;
  featureEnabled: boolean;
  segmentRules?: SegmentRules;
  status: string;
  trafficPercent: number;
  variants: VariantView[];
}

export interface AnalyticsMetricsView {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversion_rate: number;
  wilson_low: number;
  wilson_high: number;
}

export interface VariantAnalyticsView extends AnalyticsMetricsView {
  variantKey: string;
}

export interface ToggleAnalyticsView {
  experimentKey: string;
  appId?: string;
  metrics: AnalyticsMetricsView;
  variants: VariantAnalyticsView[];
}

export type AnalyticsView = AnalyticsMetricsView;

export const parseCsv = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

