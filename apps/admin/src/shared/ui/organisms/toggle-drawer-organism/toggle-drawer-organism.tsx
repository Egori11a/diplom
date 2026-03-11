import { ButtonAtom, CheckboxAtom, DrawerAtom, InputAtom, TextareaAtom } from "../../atoms";
import { FieldMolecule } from "../../molecules";
import type { ToggleDrawerOrganismProps } from "./types";
import "./toggle-drawer-organism.css";

export const ToggleDrawerOrganism = ({
  groups,
  form,
  saveError,
  onClose,
  onFormChange,
  onToggleGroup,
  onSave
}: ToggleDrawerOrganismProps) => {
  return (
    <DrawerAtom>
      <div className="toggle-drawer-organism__header">
        <h2>{form.id ? "Редактирование тоггла" : "Создание тоггла"}</h2>
        <ButtonAtom variant="secondary" type="button" onClick={onClose}>
          Закрыть
        </ButtonAtom>
      </div>

      <div className="toggle-drawer-organism__grid">
        <FieldMolecule label="App ID">
          <InputAtom value={form.appId} onChange={(event) => onFormChange({ appId: event.target.value })} />
        </FieldMolecule>
        <FieldMolecule label="Toggle Key">
          <InputAtom
            value={form.featureKey}
            onChange={(event) => onFormChange({ featureKey: event.target.value })}
          />
        </FieldMolecule>
      </div>

      <div className="toggle-drawer-organism__grid">
        <FieldMolecule label="Experiment Key">
          <InputAtom value={form.key} onChange={(event) => onFormChange({ key: event.target.value })} />
        </FieldMolecule>
        <FieldMolecule label="Название">
          <InputAtom value={form.name} onChange={(event) => onFormChange({ name: event.target.value })} />
        </FieldMolecule>
      </div>

      <FieldMolecule label="Группы сегмента (можно несколько)">
        <div className="toggle-drawer-organism__groups">
          {groups.map((group) => {
            const checked = form.groupNames.includes(group.name);
            return (
              <label className="toggle-drawer-organism__checkbox" key={group.id}>
                <CheckboxAtom checked={checked} onChange={(event) => onToggleGroup(group.name, event.target.checked)} />
                {group.name}
              </label>
            );
          })}
        </div>
      </FieldMolecule>

      <div className="toggle-drawer-organism__grid">
        <FieldMolecule label="Rollout %">
          <InputAtom
            type="number"
            min={0}
            max={100}
            value={form.rolloutPercent}
            onChange={(event) => onFormChange({ rolloutPercent: Number(event.target.value) })}
          />
        </FieldMolecule>
        <label className="toggle-drawer-organism__checkbox toggle-drawer-organism__feature-switch">
          <CheckboxAtom
            checked={form.featureEnabled}
            onChange={(event) => onFormChange({ featureEnabled: event.target.checked })}
          />
          Фича включена
        </label>
      </div>

      <FieldMolecule label="Доп. anonymous_id через запятую">
        <TextareaAtom
          value={form.includeIdsRaw}
          onChange={(event) => onFormChange({ includeIdsRaw: event.target.value })}
          placeholder="id-1,id-2"
        />
      </FieldMolecule>

      <div className="toggle-drawer-organism__actions">
        <ButtonAtom type="button" onClick={onSave}>
          {form.id ? "Сохранить" : "Создать"}
        </ButtonAtom>
      </div>

      {saveError && <p className="toggle-drawer-organism__error">{saveError}</p>}
    </DrawerAtom>
  );
};
