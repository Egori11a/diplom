import type { CardAtomProps } from "./types";
import "./card-atom.css";

export const CardAtom = ({ className = "", children }: CardAtomProps) => {
  return <section className={`card-atom ${className}`.trim()}>{children}</section>;
};
