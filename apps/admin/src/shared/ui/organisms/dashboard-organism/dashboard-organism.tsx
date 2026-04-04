import { CardAtom, TagAtom } from "../../atoms";
import { MetricMolecule } from "../../molecules";
import type { DashboardOrganismProps } from "./types";
import "./dashboard-organism.css";

const formatPercent = (value: number, digits = 2): string =>
  `${(value * 100).toFixed(digits)}%`;

export const DashboardOrganism = ({
  selectedKey,
  selectedToggle,
  analytics,
  isLoading = false,
  errorMessage = ""
}: DashboardOrganismProps) => {
  const metrics = analytics?.metrics;
  const variants = analytics?.variants ?? [];

  return (
    <CardAtom>
      <h2>Аналитика тоггла</h2>
      <p className="dashboard-organism__muted">
        Выбранный эксперимент: {selectedKey || "не выбран"}
      </p>

      {selectedToggle && (
        <div className="dashboard-organism__tags">
          <TagAtom variant={selectedToggle.featureEnabled ? "success" : "warn"}>
            {selectedToggle.featureEnabled ? "Фича включена" : "Фича выключена"}
          </TagAtom>
          <TagAtom variant="neutral">
            Группы:{" "}
            {(selectedToggle.segmentRules?.includeGroups ?? []).join(", ") || "нет"}
          </TagAtom>
          <TagAtom variant="neutral">
            Rollout: {selectedToggle.segmentRules?.rolloutPercent ?? 100}%
          </TagAtom>
          <TagAtom variant="neutral">
            Traffic: {selectedToggle.trafficPercent ?? 100}%
          </TagAtom>
        </div>
      )}

      {isLoading && <p className="dashboard-organism__muted">Загрузка аналитики...</p>}
      {!isLoading && errorMessage && (
        <p className="dashboard-organism__error">{errorMessage}</p>
      )}

      {selectedKey && metrics && !isLoading && !errorMessage && (
        <div className="dashboard-organism__stats">
          <MetricMolecule label="Показы" value={String(metrics.impressions)} />
          <MetricMolecule label="Клики" value={String(metrics.clicks)} />
          <MetricMolecule label="Конверсии" value={String(metrics.conversions)} />
          <MetricMolecule label="CTR" value={formatPercent(metrics.ctr)} />
          <MetricMolecule
            label="CR (конв./пок.)"
            value={formatPercent(metrics.conversion_rate)}
          />
          <MetricMolecule
            label="Wilson 95%"
            value={`${formatPercent(metrics.wilson_low, 1)} - ${formatPercent(
              metrics.wilson_high,
              1
            )}`}
          />
        </div>
      )}

      {!isLoading &&
        !errorMessage &&
        selectedKey &&
        metrics &&
        variants.length > 0 && (
          <div className="dashboard-organism__variants">
            <h3>По вариантам</h3>
            <table className="dashboard-organism__table">
              <thead>
                <tr>
                  <th>Вариант</th>
                  <th>Показы</th>
                  <th>Клики</th>
                  <th>Конверсии</th>
                  <th>CTR</th>
                  <th>CR</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant) => (
                  <tr key={variant.variantKey}>
                    <td>{variant.variantKey}</td>
                    <td>{variant.impressions}</td>
                    <td>{variant.clicks}</td>
                    <td>{variant.conversions}</td>
                    <td>{formatPercent(variant.ctr)}</td>
                    <td>{formatPercent(variant.conversion_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {!isLoading && !errorMessage && !selectedKey && (
        <p className="dashboard-organism__muted">
          Выбери тоггл в таблице, чтобы загрузить аналитику.
        </p>
      )}

      {!isLoading && !errorMessage && selectedKey && !metrics && (
        <p className="dashboard-organism__muted">
          Пока нет аналитики. Отправь события в `/sdk/events/batch` для этого эксперимента.
        </p>
      )}
    </CardAtom>
  );
};
