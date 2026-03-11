import { ButtonAtom, CardAtom, InputAtom, TagAtom } from "../../atoms";
import { FieldMolecule } from "../../molecules";
import type { GroupsOrganismProps } from "./types";
import "./groups-organism.css";

export const GroupsOrganism = ({
  groups,
  newGroupName,
  newGroupDescription,
  memberInputs,
  onNewGroupNameChange,
  onNewGroupDescriptionChange,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup,
  onMemberInputChange,
  onAddMember,
  onRemoveMember
}: GroupsOrganismProps) => {
  return (
    <CardAtom>
      <h2>Группы пользователей</h2>
      <div className="groups-organism__create-grid">
        <FieldMolecule label="Название новой группы">
          <InputAtom value={newGroupName} onChange={(event) => onNewGroupNameChange(event.target.value)} />
        </FieldMolecule>
        <FieldMolecule label="Описание">
          <InputAtom
            value={newGroupDescription}
            onChange={(event) => onNewGroupDescriptionChange(event.target.value)}
          />
        </FieldMolecule>
      </div>
      <ButtonAtom type="button" onClick={onCreateGroup}>
        Создать группу
      </ButtonAtom>

      <div className="groups-organism__list">
        {groups.map((group) => (
          <article className="groups-organism__item" key={group.id}>
            <div className="groups-organism__item-header">
              <strong>{group.name}</strong>
              <div className="groups-organism__inline">
                <TagAtom variant="success">{group.members.length} участников</TagAtom>
                <ButtonAtom
                  variant="secondary"
                  type="button"
                  onClick={() =>
                    onEditGroup({ id: group.id, name: group.name, description: group.description })
                  }
                >
                  Изменить
                </ButtonAtom>
                <ButtonAtom variant="secondary" type="button" onClick={() => onDeleteGroup(group.id)}>
                  Удалить
                </ButtonAtom>
              </div>
            </div>
            <p className="groups-organism__muted">{group.description || "Без описания"}</p>
            <div className="groups-organism__inline groups-organism__member-input">
              <InputAtom
                placeholder="Добавить anonymous_id"
                value={memberInputs[group.id] ?? ""}
                onChange={(event) => onMemberInputChange(group.id, event.target.value)}
              />
              <ButtonAtom variant="secondary" type="button" onClick={() => onAddMember(group.id)}>
                Добавить
              </ButtonAtom>
            </div>

            {group.members.map((member) => (
              <div className="groups-organism__item-member" key={member.memberKey}>
                <span className="groups-organism__muted">{member.memberKey}</span>
                <ButtonAtom
                  variant="secondary"
                  type="button"
                  onClick={() => onRemoveMember(group.id, member.memberKey)}
                >
                  Убрать
                </ButtonAtom>
              </div>
            ))}
          </article>
        ))}
      </div>
    </CardAtom>
  );
};
