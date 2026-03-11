import type { GroupView } from "../../../api";
import type { ToggleForm } from "../../../../pages/admin-page/types";

export interface ToggleDrawerOrganismProps {
  groups: GroupView[];
  form: ToggleForm;
  saveError: string;
  onClose: () => void;
  onFormChange: (patch: Partial<ToggleForm>) => void;
  onToggleGroup: (groupName: string, checked: boolean) => void;
  onSave: () => void;
}
