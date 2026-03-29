import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  authFetch,
  type GroupView,
  type ToggleAnalyticsView,
  type ToggleView
} from "../../../shared/api";
import type {
  GroupsQuery,
  TogglesQuery,
  UseAdminDataParams
} from "../types";
import {
  buildTogglePayload,
  removeToggleFromCache,
  toToggleView,
  upsertToggleCache,
  validateTogglePayload
} from "./use-admin-data.helpers";

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

  const groupsQuery = useQuery({
    queryKey: ["groups", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await authFetch("/admin/groups", token);
      if (!response.ok) {
        throw new Error("Failed to load groups");
      }
      return (await response.json()) as GroupsQuery;
    }
  });

  const togglesQuery = useQuery({
    queryKey: ["feature-toggles", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await authFetch("/admin/feature-toggles", token);
      if (!response.ok) {
        throw new Error("Failed to load feature toggles");
      }
      return (await response.json()) as TogglesQuery;
    }
  });

  const selectedToggle =
    (togglesQuery.data?.experiments ?? []).find(
      (toggle) => toggle.id === selectedToggleId
    ) ?? null;
  const selectedToggleKey = selectedToggle?.key ?? "";
  const selectedToggleAppId = selectedToggle?.appId ?? "";

  const analyticsQuery = useQuery({
    queryKey: [
      "feature-toggle-analytics",
      token,
      selectedToggleAppId,
      selectedToggleKey
    ],
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

  const updateGroupsCache = (updater: (groups: GroupView[]) => GroupView[]) => {
    queryClient.setQueryData<GroupsQuery>(["groups", token], (previous) => ({
      groups: updater(previous?.groups ?? [])
    }));
  };

  const updateTogglesCache = (
    updater: (toggles: ToggleView[]) => ToggleView[]
  ) => {
    queryClient.setQueryData<TogglesQuery>(
      ["feature-toggles", token],
      (previous) => ({
        experiments: updater(previous?.experiments ?? [])
      })
    );
  };

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const response = await authFetch("/admin/groups", token, {
        method: "POST",
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDescription.trim()
        })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return (await response.json()) as { id: string };
    },
    onSuccess: ({ id }) => {
      updateGroupsCache((groups) => [
        {
          id,
          name: newGroupName.trim(),
          description: newGroupDescription.trim(),
          members: []
        },
        ...groups
      ]);
      setNewGroupName("");
      setNewGroupDescription("");
    }
  });

  const updateGroupMutation = useMutation({
    mutationFn: async () => {
      if (!editingGroup) {
        return;
      }
      const response = await authFetch(`/admin/groups/${editingGroup.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          name: editingGroup.name.trim(),
          description: editingGroup.description.trim()
        })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return {
        id: editingGroup.id,
        prevName: editingGroup.initialName,
        nextName: editingGroup.name.trim()
      };
    },
    onSuccess: (result) => {
      if (!result || !editingGroup) {
        return;
      }
      const draft = editingGroup;
      updateGroupsCache((groups) =>
        groups.map((group) =>
          group.id === draft.id
            ? {
                ...group,
                name: draft.name.trim(),
                description: draft.description.trim()
              }
            : group
        )
      );

      if (result.prevName !== result.nextName) {
        updateTogglesCache((toggles) =>
          toggles.map((toggle) => ({
            ...toggle,
            segmentRules: {
              ...toggle.segmentRules,
              includeGroups: (toggle.segmentRules?.includeGroups ?? []).map(
                (groupName) =>
                  groupName === result.prevName ? result.nextName : groupName
              )
            }
          }))
        );
      }

      setEditingGroup(null);
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const response = await authFetch(`/admin/groups/${groupId}`, token, {
        method: "DELETE"
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
    },
    onSuccess: (_result, groupId) => {
      updateGroupsCache((groups) => groups.filter((group) => group.id !== groupId));
      setPendingDeleteGroup(null);
    }
  });

  const addMemberMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const memberKey = (memberInputs[groupId] ?? "").trim();
      const response = await authFetch(`/admin/groups/${groupId}/members`, token, {
        method: "POST",
        body: JSON.stringify({ memberKey })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return { groupId, memberKey };
    },
    onSuccess: ({ groupId, memberKey }) => {
      if (!memberKey) {
        return;
      }
      setMemberInputs((previous) => ({ ...previous, [groupId]: "" }));
      updateGroupsCache((groups) =>
        groups.map((group) =>
          group.id === groupId
            ? {
                ...group,
                members: group.members.some(
                  (member) => member.memberKey === memberKey
                )
                  ? group.members
                  : [...group.members, { memberKey }]
              }
            : group
        )
      );
      setEditingGroup((previous) =>
        previous && previous.id === groupId
          ? {
              ...previous,
              members: previous.members.some(
                (member) => member.memberKey === memberKey
              )
                ? previous.members
                : [...previous.members, { memberKey }]
            }
          : previous
      );
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({
      groupId,
      memberKey
    }: {
      groupId: string;
      memberKey: string;
    }) => {
      const response = await authFetch(
        `/admin/groups/${groupId}/members/${encodeURIComponent(memberKey)}`,
        token,
        {
          method: "DELETE"
        }
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return { groupId, memberKey };
    },
    onSuccess: ({ groupId, memberKey }) => {
      updateGroupsCache((groups) =>
        groups.map((group) =>
          group.id === groupId
            ? {
                ...group,
                members: group.members.filter(
                  (member) => member.memberKey !== memberKey
                )
              }
            : group
        )
      );
      setEditingGroup((previous) =>
        previous && previous.id === groupId
          ? {
              ...previous,
              members: previous.members.filter(
                (member) => member.memberKey !== memberKey
              )
            }
          : previous
      );
    }
  });

  const saveToggleMutation = useMutation({
    mutationFn: async () => {
      const groups = groupsQuery.data?.groups ?? [];
      const { payload } = buildTogglePayload(toggleForm, groups);
      const validationError = validateTogglePayload(payload);
      if (validationError) {
        throw new Error(validationError);
      }

      if (toggleForm.id) {
        const response = await authFetch(
          `/admin/feature-toggles/${toggleForm.id}`,
          token,
          {
            method: "PATCH",
            body: JSON.stringify(payload)
          }
        );
        if (!response.ok) {
          throw new Error(await response.text());
        }
        return { id: toggleForm.id, mode: "update" as const, payload };
      }

      const response = await authFetch("/admin/feature-toggles", token, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = (await response.json()) as { id: string };
      return { id: data.id, mode: "create" as const, payload };
    },
    onSuccess: ({ id, mode, payload }) => {
      const nextToggle = toToggleView(id, payload);
      updateTogglesCache((toggles) => upsertToggleCache(toggles, nextToggle, mode));
      setToggleDrawerOpen(false);
    }
  });

  const deleteToggleMutation = useMutation({
    mutationFn: async (toggleId: string) => {
      const response = await authFetch(`/admin/feature-toggles/${toggleId}`, token, {
        method: "DELETE"
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return toggleId;
    },
    onSuccess: (toggleId) => {
      updateTogglesCache((toggles) => removeToggleFromCache(toggles, toggleId));
    }
  });

  const groups = groupsQuery.data?.groups ?? [];
  const toggles = togglesQuery.data?.experiments ?? [];

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
