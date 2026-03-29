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
      <h2>Toggle Analytics</h2>
      <p className="dashboard-organism__muted">
        Selected experiment: {selectedKey || "none"}
      </p>

      {selectedToggle && (
        <div className="dashboard-organism__tags">
          <TagAtom variant={selectedToggle.featureEnabled ? "success" : "warn"}>
            {selectedToggle.featureEnabled ? "Feature ON" : "Feature OFF"}
          </TagAtom>
          <TagAtom variant="neutral">
            Groups:{" "}
            {(selectedToggle.segmentRules?.includeGroups ?? []).join(", ") || "none"}
          </TagAtom>
          <TagAtom variant="neutral">
            Rollout: {selectedToggle.segmentRules?.rolloutPercent ?? 100}%
          </TagAtom>
          <TagAtom variant="neutral">
            Traffic: {selectedToggle.trafficPercent ?? 100}%
          </TagAtom>
        </div>
      )}

      {isLoading && <p className="dashboard-organism__muted">Loading analytics...</p>}
      {!isLoading && errorMessage && (
        <p className="dashboard-organism__error">{errorMessage}</p>
      )}

      {selectedKey && metrics && !isLoading && !errorMessage && (
        <div className="dashboard-organism__stats">
          <MetricMolecule label="Impressions" value={String(metrics.impressions)} />
          <MetricMolecule label="Clicks" value={String(metrics.clicks)} />
          <MetricMolecule label="Conversions" value={String(metrics.conversions)} />
          <MetricMolecule label="CTR" value={formatPercent(metrics.ctr)} />
          <MetricMolecule
            label="CR (conv/impr)"
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
            <h3>By Variant</h3>
            <table className="dashboard-organism__table">
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  <th>Conversions</th>
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
          Select a toggle in the table to load analytics.
        </p>
      )}

      {!isLoading && !errorMessage && selectedKey && !metrics && (
        <p className="dashboard-organism__muted">
          No analytics yet. Send events to `/sdk/events/batch` for this experiment.
        </p>
      )}
    </CardAtom>
  );
};
