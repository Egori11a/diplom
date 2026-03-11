import type { DrawerAtomProps } from "./types";
import "./drawer-atom.css";

export const DrawerAtom = ({ className = "", children }: DrawerAtomProps) => {
  return <aside className={`drawer-atom ${className}`.trim()}>{children}</aside>;
};
