import { CardAtom, TagAtom } from "../../atoms";
import { MetricMolecule } from "../../molecules";
import type { DashboardOrganismProps } from "./types";
import "./dashboard-organism.css";

export const DashboardOrganism = ({ selectedKey, selectedToggle, metrics }: DashboardOrganismProps) => {
  return (
    <CardAtom>
      <h2>Дашборд эксперимента</h2>
      <p className="dashboard-organism__muted">Выбранный эксперимент: {selectedKey || "не выбран"}</p>
      {selectedToggle && (
        <div className="dashboard-organism__tags">
          <TagAtom variant={selectedToggle.featureEnabled ? "success" : "warn"}>
            {selectedToggle.featureEnabled ? "Фича включена" : "Фича выключена"}
          </TagAtom>
          <TagAtom variant="neutral">
            Группы: {(selectedToggle.segmentRules?.includeGroups ?? []).join(", ") || "нет"}
          </TagAtom>
          <TagAtom variant="neutral">Раскатка: {selectedToggle.segmentRules?.rolloutPercent ?? 100}%</TagAtom>
        </div>
      )}
      {metrics && (
        <div className="dashboard-organism__stats">
          <MetricMolecule label="Показы" value={String(metrics.impressions)} />
          <MetricMolecule label="Клики" value={String(metrics.clicks)} />
          <MetricMolecule label="Конверсии" value={String(metrics.conversions)} />
          <MetricMolecule label="CTR" value={`${(metrics.ctr * 100).toFixed(2)}%`} />
          <MetricMolecule label="CR" value={`${(metrics.conversion_rate * 100).toFixed(2)}%`} />
          <MetricMolecule
            label="Wilson 95%"
            value={`${(metrics.wilson_low * 100).toFixed(1)}-${(metrics.wilson_high * 100).toFixed(1)}%`}
          />
        </div>
      )}
    </CardAtom>
  );
};
