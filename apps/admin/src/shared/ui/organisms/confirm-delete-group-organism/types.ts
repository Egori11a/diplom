export interface ConfirmDeleteGroupOrganismProps {
  groupName: string;
  isBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}
