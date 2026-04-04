import { useQuery } from "@tanstack/react-query";
import {
  authFetch,
  type ToggleAnalyticsView,
  type ToggleView
} from "../../../shared/api";
import type { GroupsQuery, TogglesQuery } from "../types";
import { adminDataQueryKeys } from "./use-admin-data.query-keys";

export const useGroupsQuery = (token: string) =>
  useQuery({
    queryKey: adminDataQueryKeys.groups(token),
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await authFetch("/admin/groups", token);
      if (!response.ok) {
        throw new Error("Failed to load groups");
      }
      return (await response.json()) as GroupsQuery;
    }
  });

export const useTogglesQuery = (token: string) =>
  useQuery({
    queryKey: adminDataQueryKeys.toggles(token),
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await authFetch("/admin/feature-toggles", token);
      if (!response.ok) {
        throw new Error("Failed to load feature toggles");
      }
      return (await response.json()) as TogglesQuery;
    }
  });

export const selectToggleById = (
  toggles: ToggleView[],
  selectedToggleId?: string | null
): ToggleView | null =>
  toggles.find((toggle) => toggle.id === selectedToggleId) ?? null;

export const useToggleAnalyticsQuery = (
  token: string,
  selectedToggle: ToggleView | null
) => {
  const selectedToggleKey = selectedToggle?.key ?? "";
  const selectedToggleAppId = selectedToggle?.appId ?? "";

  return useQuery({
    queryKey: adminDataQueryKeys.analytics(
      token,
      selectedToggleAppId,
      selectedToggleKey
    ),
    enabled: Boolean(token && selectedToggleKey && selectedToggleAppId),
    queryFn: async () => {
      const response = await authFetch(
        `/admin/analytics/feature-toggles/${encodeURIComponent(
          selectedToggleKey
        )}?appId=${encodeURIComponent(selectedToggleAppId)}`,
        token
      );
      if (!response.ok) {
        throw new Error("Failed to load analytics");
      }
      return (await response.json()) as ToggleAnalyticsView;
    }
  });
};
