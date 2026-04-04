import type { QueryClient } from "@tanstack/react-query";
import type { GroupView, ToggleView } from "../../../shared/api";
import type { GroupsQuery, TogglesQuery } from "../types";
import { adminDataQueryKeys } from "./use-admin-data.query-keys";

interface AdminDataCache {
  updateGroupsCache: (updater: (groups: GroupView[]) => GroupView[]) => void;
  updateTogglesCache: (updater: (toggles: ToggleView[]) => ToggleView[]) => void;
}

export const createAdminDataCache = (
  queryClient: QueryClient,
  token: string
): AdminDataCache => {
  const updateGroupsCache = (
    updater: (groups: GroupView[]) => GroupView[]
  ): void => {
    queryClient.setQueryData<GroupsQuery>(
      adminDataQueryKeys.groups(token),
      (previous) => ({
        groups: updater(previous?.groups ?? [])
      })
    );
  };

  const updateTogglesCache = (
    updater: (toggles: ToggleView[]) => ToggleView[]
  ): void => {
    queryClient.setQueryData<TogglesQuery>(
      adminDataQueryKeys.toggles(token),
      (previous) => ({
        experiments: updater(previous?.experiments ?? [])
      })
    );
  };

  return {
    updateGroupsCache,
    updateTogglesCache
  };
};
