import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonAtomProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
}
