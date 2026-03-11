import type { CheckboxAtomProps } from "./types";
import "./checkbox-atom.css";

export const CheckboxAtom = ({ className = "", ...props }: CheckboxAtomProps) => {
  return <input className={`checkbox-atom ${className}`.trim()} type="checkbox" {...props} />;
};
