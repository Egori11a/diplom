import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authFetch, login, parseCsv, type AnalyticsView, type GroupView, type ToggleView } from "../../shared/api";
import { OverlayAtom } from "../../shared/ui/atoms";
import {
  AuthFormOrganism,
  DashboardOrganism,
  GroupDrawerOrganism,
  GroupsOrganism,
  HeroOrganism,
  ToggleDrawerOrganism,
  TogglesOrganism
} from "../../shared/ui/organisms";
import type { AdminPageProps, EditingGroup, GroupMemberInputMap, ToggleForm } from "./types";
import "./admin-page.css";

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
  const [selectedKey, setSelectedKey] = useState("cta-color");
  const [toggleDrawerOpen, setToggleDrawerOpen] = useState(false);
  const [toggleForm, setToggleForm] = useState<ToggleForm>(defaultToggleForm);
  const [newGroupName, setNewGroupName] = useState("beta");
  const [newGroupDescription, setNewGroupDescription] = useState("Бета-пользователи");
  const [memberInputs, setMemberInputs] = useState<GroupMemberInputMap>({});
  const [editingGroup, setEditingGroup] = useState<EditingGroup | null>(null);

  const groupsQuery = useQuery({
    queryKey: ["groups", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await authFetch("/admin/groups", token);
      if (!response.ok) {
        throw new Error("Не удалось загрузить группы");
      }
      return (await response.json()) as { groups: GroupView[] };
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
      return (await response.json()) as { experiments: ToggleView[] };
    }
  });

  const analyticsQuery = useQuery({
    queryKey: ["analytics", token, selectedKey],
    enabled: Boolean(token && selectedKey),
    queryFn: async () => {
      const response = await authFetch(`/admin/analytics/experiment/${selectedKey}`, token);
      if (!response.ok) {
        throw new Error("Не удалось загрузить аналитику");
      }
      return (await response.json()) as AnalyticsView;
    }
  });

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const response = await authFetch("/admin/groups", token, {
        method: "POST",
        body: JSON.stringify({ name: newGroupName, description: newGroupDescription })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups", token] })
  });

  const updateGroupMutation = useMutation({
    mutationFn: async () => {
      if (!editingGroup) {
        return;
      }
      const response = await authFetch(`/admin/groups/${editingGroup.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ name: editingGroup.name, description: editingGroup.description })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
    },
    onSuccess: () => {
      setEditingGroup(null);
      void queryClient.invalidateQueries({ queryKey: ["groups", token] });
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const response = await authFetch(`/admin/groups/${groupId}`, token, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(await response.text());
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups", token] })
  });

  const addMemberMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const memberKey = memberInputs[groupId] ?? "";
      const response = await authFetch(`/admin/groups/${groupId}/members`, token, {
        method: "POST",
        body: JSON.stringify({ memberKey })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
    },
    onSuccess: (_data, groupId) => {
      setMemberInputs((previous) => ({ ...previous, [groupId]: "" }));
      void queryClient.invalidateQueries({ queryKey: ["groups", token] });
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
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups", token] })
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
        return;
      }

      const response = await authFetch("/admin/feature-toggles", token, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["feature-toggles", token] });
      setToggleDrawerOpen(false);
    }
  });

  const selectedToggle = useMemo(
    () => (togglesQuery.data?.experiments ?? []).find((item) => item.key === selectedKey),
    [selectedKey, togglesQuery.data]
  );

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
    setSelectedKey(toggle.key);
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
  const metrics = analyticsQuery.data;
  const saveError = saveToggleMutation.isError ? (saveToggleMutation.error as Error).message : "";

  return (
    <main className="admin-page">
      <HeroOrganism
        title="Центр управления фича-тогглами"
        subtitle="Группы, сегменты, раскатка фич и A/B-метрики в одной панели."
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
        <section className="admin-page__layout">
          <div className="admin-page__column">
            <GroupsOrganism
              groups={groups}
              newGroupName={newGroupName}
              newGroupDescription={newGroupDescription}
              memberInputs={memberInputs}
              onNewGroupNameChange={setNewGroupName}
              onNewGroupDescriptionChange={setNewGroupDescription}
              onCreateGroup={() => createGroupMutation.mutate()}
              onEditGroup={setEditingGroup}
              onDeleteGroup={(groupId) => deleteGroupMutation.mutate(groupId)}
              onMemberInputChange={(groupId, value) =>
                setMemberInputs((previous) => ({ ...previous, [groupId]: value }))
              }
              onAddMember={(groupId) => addMemberMutation.mutate(groupId)}
              onRemoveMember={(groupId, memberKey) => removeMemberMutation.mutate({ groupId, memberKey })}
            />
            <TogglesOrganism
              toggles={toggles}
              onCreateToggle={openCreateToggle}
              onSelectToggle={openEditToggle}
            />
          </div>
          <DashboardOrganism selectedKey={selectedKey} selectedToggle={selectedToggle} metrics={metrics} />
        </section>
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
            onClose={() => setEditingGroup(null)}
            onGroupChange={setEditingGroup}
            onSave={() => updateGroupMutation.mutate()}
          />
        </>
      )}
    </main>
  );
};
