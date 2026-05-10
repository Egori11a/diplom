import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch, type GroupView, type ToggleView } from "../../../shared/api";
import type { UseAdminDataParams } from "../types";
import {
  buildTogglePayload,
  removeToggleFromCache,
  toToggleView,
  upsertToggleCache,
  validateTogglePayload
} from "./use-admin-data.helpers";

interface AdminDataMutationContext {
  token: string;
  newGroupName: UseAdminDataParams["newGroupName"];
  newGroupDescription: UseAdminDataParams["newGroupDescription"];
  setNewGroupName: UseAdminDataParams["setNewGroupName"];
  setNewGroupDescription: UseAdminDataParams["setNewGroupDescription"];
  memberInputs: UseAdminDataParams["memberInputs"];
  setMemberInputs: UseAdminDataParams["setMemberInputs"];
  editingGroup: UseAdminDataParams["editingGroup"];
  setEditingGroup: UseAdminDataParams["setEditingGroup"];
  setPendingDeleteGroup: UseAdminDataParams["setPendingDeleteGroup"];
  toggleForm: UseAdminDataParams["toggleForm"];
  setToggleDrawerOpen: UseAdminDataParams["setToggleDrawerOpen"];
  updateGroupsCache: (updater: (groups: GroupView[]) => GroupView[]) => void;
  updateTogglesCache: (updater: (toggles: ToggleView[]) => ToggleView[]) => void;
}

export interface DeleteGroupPayload {
  groupId: string;
  groupName: string;
}

export interface DeleteMemberPayload {
  groupId: string;
  memberKey: string;
}

export interface SaveToggleResult {
  id: string;
  mode: "create" | "update";
  payload: ReturnType<typeof buildTogglePayload>["payload"];
}

const ensureMutationSuccess = async (response: Response): Promise<void> => {
  if (!response.ok) {
    throw new Error(await response.text());
  }
};

export const useAdminDataMutations = ({
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
}: AdminDataMutationContext) => {
  const queryClient = useQueryClient();
  const invalidateAuditLogs = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["audit-logs", token]
    });
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
      await ensureMutationSuccess(response);
      return (await response.json()) as { id: string };
    },
    onSuccess: async ({ id }) => {
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
      await invalidateAuditLogs();
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
      await ensureMutationSuccess(response);
      return {
        id: editingGroup.id,
        prevName: editingGroup.initialName,
        nextName: editingGroup.name.trim()
      };
    },
    onSuccess: async (result) => {
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
      await invalidateAuditLogs();
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async ({ groupId, groupName }: DeleteGroupPayload) => {
      const response = await authFetch(`/admin/groups/${groupId}`, token, {
        method: "DELETE"
      });
      await ensureMutationSuccess(response);
      return { groupId, groupName };
    },
    onSuccess: async ({ groupId, groupName }) => {
      updateGroupsCache((groups) => groups.filter((group) => group.id !== groupId));
      updateTogglesCache((toggles) =>
        toggles.map((toggle) => ({
          ...toggle,
          segmentRules: {
            ...toggle.segmentRules,
            includeGroups: (toggle.segmentRules?.includeGroups ?? []).filter(
              (name) => name !== groupName
            )
          }
        }))
      );
      setPendingDeleteGroup(null);
      await invalidateAuditLogs();
    }
  });

  const addMemberMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const memberKey = (memberInputs[groupId] ?? "").trim();
      const response = await authFetch(`/admin/groups/${groupId}/members`, token, {
        method: "POST",
        body: JSON.stringify({ memberKey })
      });
      await ensureMutationSuccess(response);
      return { groupId, memberKey };
    },
    onSuccess: async ({ groupId, memberKey }) => {
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
      await invalidateAuditLogs();
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ groupId, memberKey }: DeleteMemberPayload) => {
      const response = await authFetch(
        `/admin/groups/${groupId}/members/${encodeURIComponent(memberKey)}`,
        token,
        {
          method: "DELETE"
        }
      );
      await ensureMutationSuccess(response);
      return { groupId, memberKey };
    },
    onSuccess: async ({ groupId, memberKey }) => {
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
      await invalidateAuditLogs();
    }
  });

  const saveToggleMutation = useMutation({
    mutationFn: async (): Promise<SaveToggleResult> => {
      const { payload } = buildTogglePayload(toggleForm);
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
        await ensureMutationSuccess(response);
        return { id: toggleForm.id, mode: "update", payload };
      }

      const response = await authFetch("/admin/feature-toggles", token, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      await ensureMutationSuccess(response);
      const data = (await response.json()) as { id: string };
      return { id: data.id, mode: "create", payload };
    },
    onSuccess: async ({ id, mode, payload }) => {
      const nextToggle = toToggleView(id, payload);
      updateTogglesCache((toggles) => upsertToggleCache(toggles, nextToggle, mode));
      setToggleDrawerOpen(false);
      await invalidateAuditLogs();
    }
  });

  const deleteToggleMutation = useMutation({
    mutationFn: async (toggleId: string) => {
      const response = await authFetch(`/admin/feature-toggles/${toggleId}`, token, {
        method: "DELETE"
      });
      await ensureMutationSuccess(response);
      return toggleId;
    },
    onSuccess: async (toggleId) => {
      updateTogglesCache((toggles) => removeToggleFromCache(toggles, toggleId));
      await invalidateAuditLogs();
    }
  });

  return {
    createGroupMutation,
    updateGroupMutation,
    deleteGroupMutation,
    addMemberMutation,
    removeMemberMutation,
    saveToggleMutation,
    deleteToggleMutation
  };
};
