import { ButtonAtom, OverlayAtom } from "../../shared/ui/atoms";
import {
  AuthFormOrganism,
  ConfirmDeleteGroupOrganism,
  DashboardOrganism,
  GroupDrawerOrganism,
  GroupsOrganism,
  HeroOrganism,
  OnboardingOrganism,
  ToggleDrawerOrganism,
  TogglesOrganism
} from "../../shared/ui/organisms";
import { adminUiText } from "../../shared/config";
import { useAdminAuth, useAdminData, useAdminDerived, useAdminUiState } from "./hooks";
import type { AdminPageProps } from "./types";
import "./admin-page.css";

export const AdminPage = ({
  initialEmail = "admin@local.test",
  initialPassword = "admin123"
}: AdminPageProps) => {
  const {
    token,
    email,
    password,
    loginError,
    setEmail,
    setPassword,
    handleLogin
  } = useAdminAuth({ initialEmail, initialPassword });

  const {
    activeScreen,
    setActiveScreen,
    groupSearchQuery,
    setGroupSearchQuery,
    toggleSearchQuery,
    setToggleSearchQuery,
    selectedToggleId,
    setSelectedToggleId,
    toggleDrawerOpen,
    setToggleDrawerOpen,
    toggleForm,
    setToggleForm,
    newGroupName,
    setNewGroupName,
    newGroupDescription,
    setNewGroupDescription,
    memberInputs,
    setMemberInputs,
    editingGroup,
    setEditingGroup,
    pendingDeleteGroup,
    setPendingDeleteGroup,
    openCreateToggle,
    openEditToggle
  } = useAdminUiState();

  const {
    groups,
    toggles,
    selectedToggle,
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
  } = useAdminData({
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
  });

  const {
    filteredGroups,
    filteredToggles,
    linkedToggleKeysForEditingGroup
  } = useAdminDerived({
    groups,
    toggles,
    groupSearchQuery,
    toggleSearchQuery,
    editingGroup
  });

  return (
    <main className="admin-page">
      <HeroOrganism title={adminUiText.hero.title} subtitle={adminUiText.hero.subtitle} />

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
              {adminUiText.tabs.onboarding}
            </ButtonAtom>
            <ButtonAtom
              type="button"
              variant={activeScreen === "groups" ? "primary" : "secondary"}
              onClick={() => setActiveScreen("groups")}
            >
              {adminUiText.tabs.groups}
            </ButtonAtom>
            <ButtonAtom
              type="button"
              variant={activeScreen === "toggles" ? "primary" : "secondary"}
              onClick={() => setActiveScreen("toggles")}
            >
              {adminUiText.tabs.toggles}
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
            <>
              <TogglesOrganism
                toggles={filteredToggles}
                searchQuery={toggleSearchQuery}
                selectedToggleId={selectedToggleId}
                isBusy={isBusy}
                onSearchQueryChange={setToggleSearchQuery}
                onCreateToggle={openCreateToggle}
                onEditToggle={(toggle) => openEditToggle(toggle, groups)}
                onInspectToggle={setSelectedToggleId}
                onDeleteToggle={(toggleId) => {
                  setSelectedToggleId((previous) =>
                    previous === toggleId ? null : previous
                  );
                  deleteToggleMutation.mutate(toggleId);
                }}
              />
              <DashboardOrganism
                selectedKey={selectedToggle?.key ?? ""}
                selectedToggle={selectedToggle ?? undefined}
                analytics={analyticsQuery.data}
                isLoading={analyticsQuery.isFetching}
                errorMessage={analyticsError}
              />
            </>
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
            onFormChange={(patch) =>
              setToggleForm((previous) => ({ ...previous, ...patch }))
            }
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
            onRemoveMember={(memberKey) =>
              removeMemberMutation.mutate({ groupId: editingGroup.id, memberKey })
            }
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
            onConfirm={() =>
              deleteGroupMutation.mutate({
                groupId: pendingDeleteGroup.id,
                groupName: pendingDeleteGroup.name
              })
            }
          />
        </>
      )}
    </main>
  );
};
