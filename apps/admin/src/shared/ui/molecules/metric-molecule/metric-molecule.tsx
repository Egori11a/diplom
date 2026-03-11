import type { MetricMoleculeProps } from "./types";
import "./metric-molecule.css";

export const MetricMolecule = ({ label, value }: MetricMoleculeProps) => {
  return (
    <article className="metric-molecule">
      <span className="metric-molecule__label">{label}</span>
      <strong>{value}</strong>
    </article>
  );
};
