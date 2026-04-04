import { ButtonAtom, CardAtom, InputAtom, TagAtom } from "../../atoms";
import { FieldMolecule } from "../../molecules";
import { adminUiText } from "../../../config";
import type { GroupsOrganismProps } from "./types";
import "./groups-organism.css";

export const GroupsOrganism = ({
  groups,
  searchQuery,
  newGroupName,
  newGroupDescription,
  isBusy,
  onSearchQueryChange,
  onNewGroupNameChange,
  onNewGroupDescriptionChange,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup
}: GroupsOrganismProps) => {
  return (
    <CardAtom>
      <div className="groups-organism__header">
        <h2>{adminUiText.groups.heading}</h2>
        <InputAtom
          className="groups-organism__search"
          placeholder="Поиск группы по названию"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
        />
      </div>

      <div className="groups-organism__create-grid">
        <FieldMolecule label={adminUiText.groups.nameLabel}>
          <InputAtom value={newGroupName} onChange={(event) => onNewGroupNameChange(event.target.value)} />
        </FieldMolecule>
        <FieldMolecule label={adminUiText.groups.descriptionLabel}>
          <InputAtom
            value={newGroupDescription}
            onChange={(event) => onNewGroupDescriptionChange(event.target.value)}
          />
        </FieldMolecule>
      </div>

      <ButtonAtom type="button" onClick={onCreateGroup} disabled={isBusy || !newGroupName.trim()}>
        {adminUiText.groups.createButton}
      </ButtonAtom>

      <div className="groups-organism__list">
        {groups.map((group) => (
          <article className="groups-organism__item" key={group.id}>
            <div className="groups-organism__item-header">
              <strong>{group.name}</strong>
              <div className="groups-organism__inline">
                <ButtonAtom
                  variant="secondary"
                  type="button"
                  onClick={() =>
                    onEditGroup({
                      id: group.id,
                      name: group.name,
                      description: group.description,
                      initialName: group.name,
                      members: group.members
                    })
                  }
                  disabled={isBusy}
                >
                  Изменить
                </ButtonAtom>
                <ButtonAtom
                  variant="secondary"
                  type="button"
                  onClick={() => onDeleteGroup(group.id)}
                  disabled={isBusy}
                >
                  Удалить
                </ButtonAtom>
              </div>
            </div>
            <p className="groups-organism__muted">{group.description || "Без описания"}</p>
            <div className="groups-organism__inline">
              <TagAtom variant="success">Участников: {group.members.length}</TagAtom>
              <TagAtom variant="neutral">Подключено тогглов: {group.linkedTogglesCount}</TagAtom>
            </div>
          </article>
        ))}
      </div>

      {!groups.length && <p className="groups-organism__muted">Ничего не найдено</p>}
    </CardAtom>
  );
};
