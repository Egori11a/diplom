import type { TextareaAtomProps } from "./types";
import "./textarea-atom.css";

export const TextareaAtom = ({ className = "", ...props }: TextareaAtomProps) => {
  return <textarea className={`textarea-atom ${className}`.trim()} {...props} />;
};
