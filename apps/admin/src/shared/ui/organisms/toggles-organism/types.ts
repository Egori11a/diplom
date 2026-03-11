import type { ToggleView } from "../../../api";

export interface TogglesOrganismProps {
  toggles: ToggleView[];
  onCreateToggle: () => void;
  onSelectToggle: (toggle: ToggleView) => void;
}
