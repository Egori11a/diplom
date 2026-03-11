import type { InputAtomProps } from "./types";
import "./input-atom.css";

export const InputAtom = ({ className = "", ...props }: InputAtomProps) => {
  return <input className={`input-atom ${className}`.trim()} {...props} />;
};
