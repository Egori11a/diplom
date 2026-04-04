import { ButtonAtom, CardAtom, InputAtom, TagAtom } from "../../atoms";
import { adminUiText } from "../../../config";
import type { TogglesOrganismProps } from "./types";
import "./toggles-organism.css";

export const TogglesOrganism = ({
  toggles,
  searchQuery,
  selectedToggleId,
  isBusy,
  onSearchQueryChange,
  onCreateToggle,
  onEditToggle,
  onInspectToggle,
  onDeleteToggle
}: TogglesOrganismProps) => {
  return (
    <CardAtom>
      <div className="toggles-organism__header">
        <h2>{adminUiText.toggles.heading}</h2>
        <div className="toggles-organism__header-actions">
          <InputAtom
            className="toggles-organism__search"
            placeholder="Поиск по названию или ключу"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
          <ButtonAtom type="button" onClick={onCreateToggle} disabled={isBusy}>
            {adminUiText.toggles.createButton}
          </ButtonAtom>
        </div>
      </div>

      <table className="toggles-organism__table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Ключ фичи</th>
            <th>Статус</th>
            <th>Группы</th>
            <th>Раскатка</th>
            <th>Трафик</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {toggles.map((toggle) => (
            <tr
              key={toggle.id}
              className={
                selectedToggleId === toggle.id
                  ? "toggles-organism__row toggles-organism__row--selected"
                  : "toggles-organism__row"
              }
            >
              <td>{toggle.name}</td>
              <td>{toggle.featureKey}</td>
              <td>
                <TagAtom variant={toggle.featureEnabled ? "success" : "warn"}>
                  {toggle.featureEnabled ? "ВКЛ" : "ВЫКЛ"}
                </TagAtom>
              </td>
              <td>{(toggle.segmentRules?.includeGroups ?? []).join(", ") || "-"}</td>
              <td>{toggle.segmentRules?.rolloutPercent ?? 100}%</td>
              <td>{toggle.trafficPercent ?? 100}%</td>
              <td>
                <div className="toggles-organism__actions">
                  <ButtonAtom
                    variant="secondary"
                    type="button"
                    onClick={() => onEditToggle(toggle)}
                    disabled={isBusy}
                  >
                    Изменить
                  </ButtonAtom>
                  <ButtonAtom
                    variant="secondary"
                    type="button"
                    onClick={() => onInspectToggle(toggle.id)}
                    disabled={isBusy}
                  >
                    Аналитика
                  </ButtonAtom>
                  <ButtonAtom
                    variant="secondary"
                    type="button"
                    onClick={() => onDeleteToggle(toggle.id)}
                    disabled={isBusy}
                  >
                    Удалить
                  </ButtonAtom>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!toggles.length && <p className="toggles-organism__empty">Ничего не найдено</p>}
    </CardAtom>
  );
};
