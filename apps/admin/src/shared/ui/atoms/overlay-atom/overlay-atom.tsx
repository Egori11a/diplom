import type { OverlayAtomProps } from "./types";
import "./overlay-atom.css";

export const OverlayAtom = ({ onClick }: OverlayAtomProps) => {
  return <div className="overlay-atom" onClick={onClick} role="presentation" />;
};
