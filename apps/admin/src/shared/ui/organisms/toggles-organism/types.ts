import type { ToggleView } from "../../../api";

export interface TogglesOrganismProps {
  toggles: ToggleView[];
  searchQuery: string;
  selectedToggleId: string | null;
  isBusy: boolean;
  onSearchQueryChange: (value: string) => void;
  onCreateToggle: () => void;
  onEditToggle: (toggle: ToggleView) => void;
  onInspectToggle: (toggleId: string) => void;
  onDeleteToggle: (toggleId: string) => void;
}
