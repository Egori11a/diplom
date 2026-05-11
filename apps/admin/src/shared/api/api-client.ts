const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type AdminRole = "owner" | "admin" | "editor" | "viewer";
export type AuditAction =
  | "experiment.created"
  | "experiment.updated"
  | "experiment.deleted"
  | "group.created"
  | "group.updated"
  | "group.deleted"
  | "group.member_added"
  | "group.member_removed"
  | "admin.created"
  | "admin.role_changed"
  | "admin.password_reset"
  | "admin.deactivated"
  | "admin.activated";

export type AuditEntityType = "experiment" | "group" | "admin";

export interface CurrentAdminView {
  userId: string;
  email: string;
  role: AdminRole;
}

export interface AdminUserView {
  id: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export interface AuditLogView {
  id: string;
  actorAdminId?: string | null;
  actorEmail: string;
  actorRole: AdminRole | string;
  action: AuditAction | string;
  entityType: AuditEntityType | string;
  entityId?: string | null;
  entityLabel?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogsQuery {
  logs: AuditLogView[];
}

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

export const fetchCurrentAdmin = async (token: string): Promise<CurrentAdminView> => {
  const response = await authFetch("/auth/me", token);
  if (!response.ok) {
    throw new Error("Не удалось получить профиль администратора");
  }

  const data = (await response.json()) as { admin: CurrentAdminView };
  return data.admin;
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
