import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  authFetch,
  parseCsv,
  type GroupView,
  type ToggleView
} from "../../../shared/api";
import type {
  GroupsQuery,
  TogglesQuery,
  UseAdminDataParams
} from "../types";

export const useAdminData = ({
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
  setToggleDrawerOpen
}: UseAdminDataParams) => {
  const queryClient = useQueryClient();

  const groupsQuery = useQuery({
    queryKey: ["groups", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await authFetch("/admin/groups", token);
      if (!response.ok) {
        throw new Error("Не удалось загрузить группы");
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
        throw new Error("Не удалось загрузить фича-тогглы");
      }
      return (await response.json()) as TogglesQuery;
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
      const linkedMembers = groups
        .filter((group) => toggleForm.groupNames.includes(group.name))
        .flatMap((group) => group.members.map((member) => member.memberKey));
      const includeIds = [...linkedMembers, ...parseCsv(toggleForm.includeIdsRaw)];

      const payload = {
        appId: toggleForm.appId,
        key: toggleForm.key,
        name: toggleForm.name,
        featureKey: toggleForm.featureKey,
        featureEnabled: toggleForm.featureEnabled,
        status: "active",
        trafficPercent: 100,
        segmentRules: {
          includeGroups: toggleForm.groupNames,
          includeAnonymousIds: includeIds,
          rolloutPercent: Number(toggleForm.rolloutPercent)
        },
        variants: [
          {
            key: "A",
            weightPercent: 50,
            payload: { buttonColor: "#0ea5e9", headline: "Базовый" }
          },
          {
            key: "B",
            weightPercent: 50,
            payload: { buttonColor: "#22c55e", headline: "Новый" }
          }
        ]
      };

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
        return { id: toggleForm.id, mode: "update" as const };
      }

      const response = await authFetch("/admin/feature-toggles", token, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = (await response.json()) as { id: string };
      return { id: data.id, mode: "create" as const };
    },
    onSuccess: ({ id, mode }) => {
      const nextToggle: ToggleView = {
        id,
        appId: toggleForm.appId,
        key: toggleForm.key,
        name: toggleForm.name,
        featureKey: toggleForm.featureKey,
        featureEnabled: toggleForm.featureEnabled,
        segmentRules: {
          includeGroups: toggleForm.groupNames,
          includeAnonymousIds: parseCsv(toggleForm.includeIdsRaw),
          rolloutPercent: Number(toggleForm.rolloutPercent)
        },
        status: "active",
        trafficPercent: 100,
        variants: [
          { key: "A", weightPercent: 50 },
          { key: "B", weightPercent: 50 }
        ]
      };

      updateTogglesCache((toggles) => {
        if (mode === "create") {
          return [nextToggle, ...toggles];
        }
        return toggles.map((toggle) => (toggle.id === id ? nextToggle : toggle));
      });

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
      updateTogglesCache((toggles) =>
        toggles.filter((toggle) => toggle.id !== toggleId)
      );
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
  const memberInputForDrawer = editingGroup
    ? memberInputs[editingGroup.id] ?? ""
    : "";

  return {
    groups,
    toggles,
    groupsQuery,
    togglesQuery,
    createGroupMutation,
    updateGroupMutation,
    deleteGroupMutation,
    addMemberMutation,
    removeMemberMutation,
    saveToggleMutation,
    deleteToggleMutation,
    isBusy,
    saveError,
    memberInputForDrawer
  };
};
