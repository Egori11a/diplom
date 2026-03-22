import { useEffect, useState } from "react";
import type { ToggleView } from "../../../shared/api";
import {
  defaultGroupDescription,
  defaultGroupName,
  defaultToggleForm
} from "../constants";
import type {
  AdminScreen,
  EditingGroup,
  GroupMemberInputMap,
  PendingDeleteGroup,
  ToggleForm
} from "../types";

export const useAdminUiState = () => {
  const [activeScreen, setActiveScreen] = useState<AdminScreen>("onboarding");
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [toggleSearchQuery, setToggleSearchQuery] = useState("");

  const [toggleDrawerOpen, setToggleDrawerOpen] = useState(false);
  const [toggleForm, setToggleForm] = useState<ToggleForm>(defaultToggleForm);

  const [newGroupName, setNewGroupName] = useState(defaultGroupName);
  const [newGroupDescription, setNewGroupDescription] =
    useState(defaultGroupDescription);
  const [memberInputs, setMemberInputs] = useState<GroupMemberInputMap>({});
  const [editingGroup, setEditingGroup] = useState<EditingGroup | null>(null);
  const [pendingDeleteGroup, setPendingDeleteGroup] =
    useState<PendingDeleteGroup | null>(null);

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

  return {
    activeScreen,
    setActiveScreen,
    groupSearchQuery,
    setGroupSearchQuery,
    toggleSearchQuery,
    setToggleSearchQuery,
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
  };
};
