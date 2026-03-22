import { useMemo } from "react";
import type { UseAdminDerivedParams } from "../types";

export const useAdminDerived = ({
  groups,
  toggles,
  groupSearchQuery,
  toggleSearchQuery,
  editingGroup
}: UseAdminDerivedParams) => {
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
      .filter((toggle) =>
        (toggle.segmentRules?.includeGroups ?? []).includes(
          editingGroup.initialName
        )
      )
      .map((toggle) => toggle.featureKey);
  }, [editingGroup, toggles]);

  return {
    filteredGroups,
    filteredToggles,
    linkedToggleKeysForEditingGroup
  };
};
