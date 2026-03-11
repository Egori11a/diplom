import type { ReactNode } from "react";

export interface TagAtomProps {
  variant?: "neutral" | "success" | "warn" | "error";
  className?: string;
  children: ReactNode;
}
