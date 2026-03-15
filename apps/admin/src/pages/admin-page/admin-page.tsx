import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authFetch, login, parseCsv, type GroupView, type ToggleView } from "../../shared/api";
import { ButtonAtom, OverlayAtom } from "../../shared/ui/atoms";
import {
  AuthFormOrganism,
  ConfirmDeleteGroupOrganism,
  GroupDrawerOrganism,
  GroupsOrganism,
  HeroOrganism,
  OnboardingOrganism,
  ToggleDrawerOrganism,
  TogglesOrganism
} from "../../shared/ui/organisms";
import type {
  AdminPageProps,
  EditingGroup,
  GroupMemberInputMap,
  PendingDeleteGroup,
  ToggleForm
} from "./types";
import "./admin-page.css";

type AdminScreen = "onboarding" | "groups" | "toggles";

type GroupsQuery = { groups: GroupView[] };
type TogglesQuery = { experiments: ToggleView[] };

const defaultToggleForm: ToggleForm = {
  appId: "demo-app",
  key: "cta-color",
  name: "Тест кнопок CTA",
  featureKey: "new-cta",
  featureEnabled: true,
  rolloutPercent: 100,
  groupNames: [],
  includeIdsRaw: ""
};

export const AdminPage = ({ initialEmail = "admin@local.test", initialPassword = "admin123" }: AdminPageProps) => {
  const queryClient = useQueryClient();
  const [token, setToken] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [loginError, setLoginError] = useState("");

  const [activeScreen, setActiveScreen] = useState<AdminScreen>("onboarding");
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [toggleSearchQuery, setToggleSearchQuery] = useState("");

  const [toggleDrawerOpen, setToggleDrawerOpen] = useState(false);
  const [toggleForm, setToggleForm] = useState<ToggleForm>(defaultToggleForm);

  const [newGroupName, setNewGroupName] = useState("beta-team");
  const [newGroupDescription, setNewGroupDescription] = useState("Команда бета-релизов");
  const [memberInputs, setMemberInputs] = useState<GroupMemberInputMap>({});
  const [editingGroup, setEditingGroup] = useState<EditingGroup | null>(null);
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState<PendingDeleteGroup | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (pendingDeleteGroup) {
        setPendingDeleteGroup(null);
        return;
      }

      if (editingGroup) {
        setEditingGroup(null);
        return;
      }

      if (toggleDrawerOpen) {
        setToggleDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingDeleteGroup, editingGroup, toggleDrawerOpen]);

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

  const updateTogglesCache = (updater: (toggles: ToggleView[]) => ToggleView[]) => {
    queryClient.setQueryData<TogglesQuery>(["feature-toggles", token], (previous) => ({
      experiments: updater(previous?.experiments ?? [])
    }));
  };

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const response = await authFetch("/admin/groups", token, {
        method: "POST",
        body: JSON.stringify({ name: newGroupName.trim(), description: newGroupDescription.trim() })
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
        body: JSON.stringify({ name: editingGroup.name.trim(), description: editingGroup.description.trim() })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return { id: editingGroup.id, prevName: editingGroup.initialName, nextName: editingGroup.name.trim() };
    },
    onSuccess: (result) => {
      if (!result || !editingGroup) {
        return;
      }
      const draft = editingGroup;
      updateGroupsCache((groups) =>
        groups.map((group) =>
          group.id === draft.id
            ? { ...group, name: draft.name.trim(), description: draft.description.trim() }
            : group
        )
      );

      if (result.prevName !== result.nextName) {
        updateTogglesCache((toggles) =>
          toggles.map((toggle) => ({
            ...toggle,
            segmentRules: {
              ...toggle.segmentRules,
              includeGroups: (toggle.segmentRules?.includeGroups ?? []).map((groupName) =>
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
      const response = await authFetch(`/admin/groups/${groupId}`, token, { method: "DELETE" });
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
                members: group.members.some((member) => member.memberKey === memberKey)
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
              members: previous.members.some((member) => member.memberKey === memberKey)
                ? previous.members
                : [...previous.members, { memberKey }]
            }
          : previous
      );
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ groupId, memberKey }: { groupId: string; memberKey: string }) => {
      const response = await authFetch(`/admin/groups/${groupId}/members/${encodeURIComponent(memberKey)}`, token, {
        method: "DELETE"
      });
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
                members: group.members.filter((member) => member.memberKey !== memberKey)
              }
            : group
        )
      );
      setEditingGroup((previous) =>
        previous && previous.id === groupId
          ? {
              ...previous,
              members: previous.members.filter((member) => member.memberKey !== memberKey)
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
          { key: "A", weightPercent: 50, payload: { buttonColor: "#0ea5e9", headline: "Базовый" } },
          { key: "B", weightPercent: 50, payload: { buttonColor: "#22c55e", headline: "Новый" } }
        ]
      };

      if (toggleForm.id) {
        const response = await authFetch(`/admin/feature-toggles/${toggleForm.id}`, token, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
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
      const response = await authFetch(`/admin/feature-toggles/${toggleId}`, token, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return toggleId;
    },
    onSuccess: (toggleId) => {
      updateTogglesCache((toggles) => toggles.filter((toggle) => toggle.id !== toggleId));
    }
  });

  const openCreateToggle = () => {
    setToggleForm(defaultToggleForm);
    setToggleDrawerOpen(true);
  };

  const openEditToggle = (toggle: ToggleView) => {
    setToggleForm({
      id: toggle.id,
      appId: toggle.appId,
      key: toggle.key,
      name: toggle.name,
      featureKey: toggle.featureKey,
      featureEnabled: toggle.featureEnabled,
      rolloutPercent: toggle.segmentRules?.rolloutPercent ?? 100,
      groupNames: toggle.segmentRules?.includeGroups ?? [],
      includeIdsRaw: (toggle.segmentRules?.includeAnonymousIds ?? []).join(",")
    });
    setToggleDrawerOpen(true);
  };

  const handleLogin = async () => {
    try {
      setToken(await login(email, password));
      setLoginError("");
    } catch {
      setLoginError("Ошибка входа");
    }
  };

  const groups = groupsQuery.data?.groups ?? [];
  const toggles = togglesQuery.data?.experiments ?? [];

  const filteredGroups = useMemo(() => {
    const query = groupSearchQuery.trim().toLowerCase();
    const baseGroups = !query
      ? groups
      : groups.filter((group) => group.name.toLowerCase().includes(query));

    return baseGroups.map((group) => ({
      ...group,
      linkedTogglesCount: toggles.filter((toggle) =>
        (toggle.segmentRules?.includeGroups ?? []).includes(group.name)
      ).length
    }));
  }, [groupSearchQuery, groups, toggles]);

  const filteredToggles = useMemo(() => {
    const query = toggleSearchQuery.trim().toLowerCase();
    if (!query) {
      return toggles;
    }
    return toggles.filter(
      (toggle) =>
        toggle.name.toLowerCase().includes(query) ||
        toggle.key.toLowerCase().includes(query) ||
        toggle.featureKey.toLowerCase().includes(query)
    );
  }, [toggleSearchQuery, toggles]);

  const linkedToggleKeysForEditingGroup = useMemo(() => {
    if (!editingGroup) {
      return [];
    }
    return toggles
      .filter((toggle) => (toggle.segmentRules?.includeGroups ?? []).includes(editingGroup.initialName))
      .map((toggle) => toggle.featureKey);
  }, [editingGroup, toggles]);

  const isBusy =
    createGroupMutation.isPending ||
    updateGroupMutation.isPending ||
    deleteGroupMutation.isPending ||
    addMemberMutation.isPending ||
    removeMemberMutation.isPending ||
    saveToggleMutation.isPending ||
    deleteToggleMutation.isPending;

  const saveError = saveToggleMutation.isError ? (saveToggleMutation.error as Error).message : "";
  const memberInputForDrawer = editingGroup ? memberInputs[editingGroup.id] ?? "" : "";

  return (
    <main className="admin-page">
      <HeroOrganism
        title="Центр управления фича-тогглами"
        subtitle="Группы команд, тогглы и управляемая раскатка в одной системе."
      />

      {!token ? (
        <AuthFormOrganism
          email={email}
          password={password}
          loginError={loginError}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onLogin={() => void handleLogin()}
        />
      ) : (
        <>
          <section className="admin-page__tabs">
            <ButtonAtom
              type="button"
              variant={activeScreen === "onboarding" ? "primary" : "secondary"}
              onClick={() => setActiveScreen("onboarding")}
            >
              Обучение
            </ButtonAtom>
            <ButtonAtom
              type="button"
              variant={activeScreen === "groups" ? "primary" : "secondary"}
              onClick={() => setActiveScreen("groups")}
            >
              Группы
            </ButtonAtom>
            <ButtonAtom
              type="button"
              variant={activeScreen === "toggles" ? "primary" : "secondary"}
              onClick={() => setActiveScreen("toggles")}
            >
              Фича-тогглы
            </ButtonAtom>
          </section>

          {activeScreen === "onboarding" && <OnboardingOrganism />}

          {activeScreen === "groups" && (
            <GroupsOrganism
              groups={filteredGroups}
              searchQuery={groupSearchQuery}
              newGroupName={newGroupName}
              newGroupDescription={newGroupDescription}
              isBusy={isBusy}
              onSearchQueryChange={setGroupSearchQuery}
              onNewGroupNameChange={setNewGroupName}
              onNewGroupDescriptionChange={setNewGroupDescription}
              onCreateGroup={() => createGroupMutation.mutate()}
              onEditGroup={setEditingGroup}
              onDeleteGroup={(groupId) => {
                const group = groups.find((item) => item.id === groupId);
                if (!group) {
                  return;
                }
                setPendingDeleteGroup({ id: group.id, name: group.name });
              }}
            />
          )}

          {activeScreen === "toggles" && (
            <TogglesOrganism
              toggles={filteredToggles}
              searchQuery={toggleSearchQuery}
              isBusy={isBusy}
              onSearchQueryChange={setToggleSearchQuery}
              onCreateToggle={openCreateToggle}
              onSelectToggle={openEditToggle}
              onDeleteToggle={(toggleId) => deleteToggleMutation.mutate(toggleId)}
            />
          )}
        </>
      )}

      {toggleDrawerOpen && (
        <>
          <OverlayAtom onClick={() => setToggleDrawerOpen(false)} />
          <ToggleDrawerOrganism
            groups={groups}
            form={toggleForm}
            saveError={saveError}
            onClose={() => setToggleDrawerOpen(false)}
            onFormChange={(patch) => setToggleForm((previous) => ({ ...previous, ...patch }))}
            onToggleGroup={(groupName, checked) =>
              setToggleForm((previous) => ({
                ...previous,
                groupNames: checked
                  ? [...previous.groupNames, groupName]
                  : previous.groupNames.filter((name) => name !== groupName)
              }))
            }
            onSave={() => saveToggleMutation.mutate()}
          />
        </>
      )}

      {editingGroup && (
        <>
          <OverlayAtom onClick={() => setEditingGroup(null)} />
          <GroupDrawerOrganism
            group={editingGroup}
            linkedToggleKeys={linkedToggleKeysForEditingGroup}
            memberInput={memberInputForDrawer}
            isBusy={isBusy}
            onClose={() => setEditingGroup(null)}
            onGroupChange={setEditingGroup}
            onMemberInputChange={(value) =>
              setMemberInputs((previous) => ({ ...previous, [editingGroup.id]: value }))
            }
            onAddMember={() => addMemberMutation.mutate(editingGroup.id)}
            onRemoveMember={(memberKey) => removeMemberMutation.mutate({ groupId: editingGroup.id, memberKey })}
            onSave={() => updateGroupMutation.mutate()}
          />
        </>
      )}

      {pendingDeleteGroup && (
        <>
          <OverlayAtom onClick={() => setPendingDeleteGroup(null)} />
          <ConfirmDeleteGroupOrganism
            groupName={pendingDeleteGroup.name}
            isBusy={isBusy}
            onCancel={() => setPendingDeleteGroup(null)}
            onConfirm={() => deleteGroupMutation.mutate(pendingDeleteGroup.id)}
          />
        </>
      )}
    </main>
  );
};


