import { ButtonAtom, DrawerAtom, InputAtom, TagAtom, TextareaAtom } from "../../atoms";
import { FieldMolecule } from "../../molecules";
import type { GroupDrawerOrganismProps } from "./types";
import "./group-drawer-organism.css";

export const GroupDrawerOrganism = ({
  group,
  linkedToggleKeys,
  memberInput,
  isBusy,
  onClose,
  onGroupChange,
  onMemberInputChange,
  onAddMember,
  onRemoveMember,
  onSave
}: GroupDrawerOrganismProps) => {
  return (
    <DrawerAtom>
      <div className="group-drawer-organism__header">
        <h2>Редактирование группы</h2>
        <ButtonAtom variant="secondary" type="button" onClick={onClose}>
          Закрыть
        </ButtonAtom>
      </div>

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

      <section className="group-drawer-organism__section">
        <h3>Подключенные фича-тогглы</h3>
        <div className="group-drawer-organism__chips">
          {linkedToggleKeys.length ? (
            linkedToggleKeys.map((toggleKey) => (
              <TagAtom key={toggleKey} variant="neutral">
                {toggleKey}
              </TagAtom>
            ))
          ) : (
            <p className="group-drawer-organism__muted">Группа пока не подключена ни к одному тогглу</p>
          )}
        </div>
      </section>

      <section className="group-drawer-organism__section">
        <h3>Состав группы</h3>
        <div className="group-drawer-organism__member-input">
          <InputAtom
            placeholder="Добавить subject_key"
            value={memberInput}
            onChange={(event) => onMemberInputChange(event.target.value)}
          />
          <ButtonAtom type="button" variant="secondary" onClick={onAddMember} disabled={isBusy || !memberInput.trim()}>
            Добавить
          </ButtonAtom>
        </div>

        <div className="group-drawer-organism__members">
          {group.members.length ? (
            group.members.map((member) => (
              <div className="group-drawer-organism__member-row" key={member.memberKey}>
                <span>{member.memberKey}</span>
                <ButtonAtom
                  variant="secondary"
                  type="button"
                  onClick={() => onRemoveMember(member.memberKey)}
                  disabled={isBusy}
                >
                  Убрать
                </ButtonAtom>
              </div>
            ))
          ) : (
            <p className="group-drawer-organism__muted">В группе пока нет участников</p>
          )}
        </div>
      </section>

      <div className="group-drawer-organism__actions">
        <ButtonAtom type="button" onClick={onSave} disabled={isBusy || !group.name.trim()}>
          Сохранить
        </ButtonAtom>
        <ButtonAtom variant="secondary" type="button" onClick={onClose}>
          Отмена
        </ButtonAtom>
      </div>
    </DrawerAtom>
  );
};

