import { useQueryClient } from "@tanstack/react-query";
import type { UseAdminDataParams } from "../types";
import { createAdminDataCache } from "./use-admin-data.cache";
import { useAdminDataMutations } from "./use-admin-data.mutations";
import {
  selectToggleById,
  useGroupsQuery,
  useToggleAnalyticsQuery,
  useTogglesQuery
} from "./use-admin-data.queries";

export const useAdminData = ({
  token,
  selectedToggleId,
  newGroupName,
  newGroupDescription,
  setNewGroupName,
  setNewGroupDescription,
  memberInputs,
  setMemberInputs,
  editingGroup,
  setEditingGroup,
  setPendingDeleteGroup,
  toggleForm,
  setToggleDrawerOpen
}: UseAdminDataParams) => {
  const queryClient = useQueryClient();
  const { updateGroupsCache, updateTogglesCache } = createAdminDataCache(
    queryClient,
    token
  );

  const groupsQuery = useGroupsQuery(token);
  const togglesQuery = useTogglesQuery(token);

  const groups = groupsQuery.data?.groups ?? [];
  const toggles = togglesQuery.data?.experiments ?? [];
  const selectedToggle = selectToggleById(toggles, selectedToggleId);
  const analyticsQuery = useToggleAnalyticsQuery(token, selectedToggle);

  const {
    createGroupMutation,
    updateGroupMutation,
    deleteGroupMutation,
    addMemberMutation,
    removeMemberMutation,
    saveToggleMutation,
    deleteToggleMutation
  } = useAdminDataMutations({
    token,
    newGroupName,
    newGroupDescription,
    setNewGroupName,
    setNewGroupDescription,
    memberInputs,
    setMemberInputs,
    editingGroup,
    setEditingGroup,
    setPendingDeleteGroup,
    toggleForm,
    setToggleDrawerOpen,
    updateGroupsCache,
    updateTogglesCache
  });

  const isBusy =
    createGroupMutation.isPending ||
    updateGroupMutation.isPending ||
    deleteGroupMutation.isPending ||
    addMemberMutation.isPending ||
    removeMemberMutation.isPending ||
    saveToggleMutation.isPending ||
    deleteToggleMutation.isPending;

  const saveError = saveToggleMutation.isError
    ? (saveToggleMutation.error as Error).message
    : "";
  const analyticsError = analyticsQuery.isError
    ? (analyticsQuery.error as Error).message
    : "";
  const memberInputForDrawer = editingGroup
    ? memberInputs[editingGroup.id] ?? ""
    : "";

  return {
    groups,
    toggles,
    selectedToggle,
    groupsQuery,
    togglesQuery,
    analyticsQuery,
    createGroupMutation,
    updateGroupMutation,
    deleteGroupMutation,
    addMemberMutation,
    removeMemberMutation,
    saveToggleMutation,
    deleteToggleMutation,
    isBusy,
    saveError,
    analyticsError,
    memberInputForDrawer
  };
};
