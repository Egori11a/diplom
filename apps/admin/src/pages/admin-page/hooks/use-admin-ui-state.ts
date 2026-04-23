import { useEffect, useState } from "react";
import type { GroupView, ToggleView } from "../../../shared/api";
import { deriveAdditionalSubjectKeysForEdit } from "./use-admin-data.helpers";
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

const cloneDefaultToggleForm = (): ToggleForm => ({
  ...defaultToggleForm,
  variants: defaultToggleForm.variants.map((variant) => ({ ...variant }))
});

export const useAdminUiState = () => {
  const [activeScreen, setActiveScreen] = useState<AdminScreen>("onboarding");
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [toggleSearchQuery, setToggleSearchQuery] = useState("");
  const [selectedToggleId, setSelectedToggleId] = useState<string | null>(null);

  const [toggleDrawerOpen, setToggleDrawerOpen] = useState(false);
  const [toggleForm, setToggleForm] = useState<ToggleForm>(cloneDefaultToggleForm);

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
    setToggleForm(cloneDefaultToggleForm());
    setToggleDrawerOpen(true);
  };

  const selectToggle = (toggleId: string) => {
    setSelectedToggleId(toggleId);
  };

  const openEditToggle = (toggle: ToggleView, groups: GroupView[]) => {
    const selectedGroupNames = toggle.segmentRules?.includeGroups ?? [];
    const additionalIds = deriveAdditionalSubjectKeysForEdit(
      groups,
      selectedGroupNames,
      toggle.segmentRules?.includeSubjectKeys ?? []
    );

    setToggleForm({
      id: toggle.id,
      appId: toggle.appId,
      key: toggle.key,
      name: toggle.name,
      featureKey: toggle.featureKey,
      featureEnabled: toggle.featureEnabled,
      rolloutPercent: toggle.segmentRules?.rolloutPercent ?? 100,
      trafficPercent: toggle.trafficPercent ?? 100,
      groupNames: selectedGroupNames,
      includeIdsRaw: additionalIds.join(","),
      variants:
        toggle.variants.length > 0
          ? toggle.variants.map((variant) => ({
              key: variant.key,
              weightPercent: variant.weightPercent,
              comment: variant.comment ?? ""
            }))
          : cloneDefaultToggleForm().variants
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
    selectToggle,
    openCreateToggle,
    openEditToggle
  };
};

