import type { AuditLogView } from "../../../../shared/api";

export interface AuditLogDetailOrganismProps {
  log: AuditLogView;
  onClose: () => void;
}
