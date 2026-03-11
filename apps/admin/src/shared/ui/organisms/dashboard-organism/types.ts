import type { AnalyticsView, ToggleView } from "../../../api";

export interface DashboardOrganismProps {
  selectedKey: string;
  selectedToggle?: ToggleView;
  metrics?: AnalyticsView;
}
