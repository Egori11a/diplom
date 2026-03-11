import type { FieldMoleculeProps } from "./types";
import "./field-molecule.css";

export const FieldMolecule = ({ label, children }: FieldMoleculeProps) => {
  return (
    <label className="field-molecule">
      <span className="field-molecule__label">{label}</span>
      {children}
    </label>
  );
};
