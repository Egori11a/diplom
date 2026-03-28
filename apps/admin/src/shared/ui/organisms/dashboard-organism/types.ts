import type { ToggleAnalyticsView, ToggleView } from "../../../api";

export interface DashboardOrganismProps {
  selectedKey: string;
  selectedToggle?: ToggleView;
  analytics?: ToggleAnalyticsView;
  isLoading?: boolean;
  errorMessage?: string;
}
