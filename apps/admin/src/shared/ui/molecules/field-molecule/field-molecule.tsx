import { Children, cloneElement, isValidElement, useId } from "react";
import type { ReactElement } from "react";
import type { FieldMoleculeProps } from "./types";
import "./field-molecule.css";

const isGroupContainer = (element: ReactElement): boolean =>
  typeof element.type === "string" && element.type === "div";

export const FieldMolecule = ({ label, children }: FieldMoleculeProps) => {
  const labelId = useId();
  const controlId = useId();
  const child = Children.count(children) === 1 ? Children.only(children) : null;

  if (child && isValidElement(child) && !isGroupContainer(child)) {
    const nextChild = cloneElement(child, {
      id: child.props.id ?? controlId,
      "aria-labelledby": child.props["aria-labelledby"] ?? labelId
    });

    return (
      <div className="field-molecule">
        <label id={labelId} className="field-molecule__label" htmlFor={child.props.id ?? controlId}>
          {label}
        </label>
        {nextChild}
      </div>
    );
  }

  return (
    <div className="field-molecule" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="field-molecule__label">
        {label}
      </span>
      {children}
    </div>
  );
};
