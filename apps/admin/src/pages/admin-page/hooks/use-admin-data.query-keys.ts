export const adminDataQueryKeys = {
  groups: (token: string) => ["groups", token] as const,
  toggles: (token: string) => ["feature-toggles", token] as const,
  users: (token: string) => ["admin-users", token] as const,
  audit: (
    token: string,
    filters: {
      actorEmail: string;
      action: string;
      entityType: string;
      limit: number;
    }
  ) => ["audit-logs", token, filters] as const,
  analytics: (token: string, appId: string, experimentKey: string) =>
    ["feature-toggle-analytics", token, appId, experimentKey] as const
};
