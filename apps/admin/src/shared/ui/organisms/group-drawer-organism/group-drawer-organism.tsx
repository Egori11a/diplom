import { ButtonAtom, DrawerAtom, InputAtom, TextareaAtom } from "../../atoms";
import { FieldMolecule } from "../../molecules";
import type { GroupDrawerOrganismProps } from "./types";
import "./group-drawer-organism.css";

export const GroupDrawerOrganism = ({ group, onClose, onGroupChange, onSave }: GroupDrawerOrganismProps) => {
  return (
    <DrawerAtom>
      <h2>Редактирование группы</h2>
      <div className="group-drawer-organism__fields">
        <FieldMolecule label="Название">
          <InputAtom value={group.name} onChange={(event) => onGroupChange({ ...group, name: event.target.value })} />
        </FieldMolecule>
        <FieldMolecule label="Описание">
          <TextareaAtom
            value={group.description}
            onChange={(event) => onGroupChange({ ...group, description: event.target.value })}
          />
        </FieldMolecule>
      </div>
      <div className="group-drawer-organism__actions">
        <ButtonAtom type="button" onClick={onSave}>
          Сохранить
        </ButtonAtom>
        <ButtonAtom variant="secondary" type="button" onClick={onClose}>
          Отмена
        </ButtonAtom>
      </div>
    </DrawerAtom>
  );
};
