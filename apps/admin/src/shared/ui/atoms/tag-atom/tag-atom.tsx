import type { TagAtomProps } from "./types";
import "./tag-atom.css";

export const TagAtom = ({ variant = "neutral", className = "", children }: TagAtomProps) => {
  return <span className={`tag-atom tag-atom--${variant} ${className}`.trim()}>{children}</span>;
};
