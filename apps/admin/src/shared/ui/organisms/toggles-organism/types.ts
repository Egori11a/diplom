import type { ToggleView } from "../../../api";

export interface TogglesOrganismProps {
  toggles: ToggleView[];
  searchQuery: string;
  isBusy: boolean;
  onSearchQueryChange: (value: string) => void;
  onCreateToggle: () => void;
  onSelectToggle: (toggle: ToggleView) => void;
  onDeleteToggle: (toggleId: string) => void;
}
