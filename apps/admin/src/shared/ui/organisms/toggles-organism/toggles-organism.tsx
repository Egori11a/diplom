import { ButtonAtom, CardAtom, InputAtom, TagAtom } from "../../atoms";
import type { TogglesOrganismProps } from "./types";
import "./toggles-organism.css";

export const TogglesOrganism = ({
  toggles,
  searchQuery,
  isBusy,
  onSearchQueryChange,
  onCreateToggle,
  onSelectToggle,
  onDeleteToggle
}: TogglesOrganismProps) => {
  return (
    <CardAtom>
      <div className="toggles-organism__header">
        <h2>Фича-тогглы</h2>
        <div className="toggles-organism__header-actions">
          <InputAtom
            className="toggles-organism__search"
            placeholder="Поиск по названию или ключу"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
          <ButtonAtom type="button" onClick={onCreateToggle} disabled={isBusy}>
            Создать тоггл
          </ButtonAtom>
        </div>
      </div>

      <table className="toggles-organism__table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Ключ</th>
            <th>Состояние</th>
            <th>Команды</th>
            <th>Раскатка</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {toggles.map((toggle) => (
            <tr key={toggle.id} onClick={() => onSelectToggle(toggle)}>
              <td>{toggle.name}</td>
              <td>{toggle.featureKey}</td>
              <td>
                <TagAtom variant={toggle.featureEnabled ? "success" : "warn"}>
                  {toggle.featureEnabled ? "Вкл" : "Выкл"}
                </TagAtom>
              </td>
              <td>{(toggle.segmentRules?.includeGroups ?? []).join(", ") || "-"}</td>
              <td>{toggle.segmentRules?.rolloutPercent ?? 100}%</td>
              <td>
                <ButtonAtom
                  variant="secondary"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteToggle(toggle.id);
                  }}
                  disabled={isBusy}
                >
                  Удалить
                </ButtonAtom>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!toggles.length && <p className="toggles-organism__empty">Ничего не найдено</p>}
    </CardAtom>
  );
};
