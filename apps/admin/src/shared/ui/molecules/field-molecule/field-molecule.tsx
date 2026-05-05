import { useId } from "react";
import type { FieldMoleculeProps } from "./types";
import "./field-molecule.css";

export const FieldMolecule = ({ label, children }: FieldMoleculeProps) => {
  const labelId = useId();

  return (
    <div className="field-molecule" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="field-molecule__label">
        {label}
      </span>
      {children}
    </div>
  );
};
