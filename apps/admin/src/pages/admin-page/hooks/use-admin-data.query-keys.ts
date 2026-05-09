export const adminDataQueryKeys = {
  groups: (token: string) => ["groups", token] as const,
  toggles: (token: string) => ["feature-toggles", token] as const,
  users: (token: string) => ["admin-users", token] as const,
  analytics: (token: string, appId: string, experimentKey: string) =>
    ["feature-toggle-analytics", token, appId, experimentKey] as const
};
