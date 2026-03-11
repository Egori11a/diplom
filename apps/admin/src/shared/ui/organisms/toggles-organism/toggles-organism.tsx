import { ButtonAtom, CardAtom, TagAtom } from "../../atoms";
import type { TogglesOrganismProps } from "./types";
import "./toggles-organism.css";

export const TogglesOrganism = ({
  toggles,
  onCreateToggle,
  onSelectToggle
}: TogglesOrganismProps) => {
  return (
    <CardAtom>
      <div className="toggles-organism__header">
        <h2>Фича-тогглы</h2>
        <ButtonAtom type="button" onClick={onCreateToggle}>
          Создать тоггл
        </ButtonAtom>
      </div>
      <table className="toggles-organism__table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Ключ</th>
            <th>Состояние</th>
            <th>Раскатка</th>
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
              <td>{toggle.segmentRules?.rolloutPercent ?? 100}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardAtom>
  );
};
