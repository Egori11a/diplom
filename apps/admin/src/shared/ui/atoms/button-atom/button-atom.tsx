import type { ButtonAtomProps } from "./types";
import "./button-atom.css";

export const ButtonAtom = ({
  variant = "primary",
  className = "",
  children,
  ...buttonProps
}: ButtonAtomProps) => {
  return (
    <button className={`button-atom button-atom--${variant} ${className}`.trim()} {...buttonProps}>
      {children}
    </button>
  );
};
