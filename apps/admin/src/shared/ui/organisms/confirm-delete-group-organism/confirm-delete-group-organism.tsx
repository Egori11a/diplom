import { ButtonAtom, DrawerAtom } from "../../atoms";
import type { ConfirmDeleteGroupOrganismProps } from "./types";
import "./confirm-delete-group-organism.css";

export const ConfirmDeleteGroupOrganism = ({
  groupName,
  isBusy,
  onCancel,
  onConfirm
}: ConfirmDeleteGroupOrganismProps) => {
  return (
    <DrawerAtom>
      <h2>Подтверждение удаления</h2>
      <p className="confirm-delete-group-organism__text">
        Ты точно хочешь удалить группу <strong>{groupName}</strong>? Это действие нельзя отменить.
      </p>
      <div className="confirm-delete-group-organism__actions">
        <ButtonAtom variant="secondary" type="button" onClick={onCancel} disabled={isBusy}>
          Отмена
        </ButtonAtom>
        <ButtonAtom type="button" onClick={onConfirm} disabled={isBusy}>
          Удалить группу
        </ButtonAtom>
      </div>
    </DrawerAtom>
  );
};
