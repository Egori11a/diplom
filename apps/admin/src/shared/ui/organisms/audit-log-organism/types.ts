import type {
  AuditAction,
  AuditEntityType,
  AuditLogView
} from "../../../../shared/api";
import type { AuditFilters } from "../../../../pages/admin-page/types";

export interface AuditLogOrganismProps {
  logs: AuditLogView[];
  filters: AuditFilters;
  isLoading: boolean;
  errorMessage: string;
  onFiltersChange: (patch: Partial<AuditFilters>) => void;
  onSelectLog: (log: AuditLogView) => void;
}

export const auditActionOptions: Array<{ value: AuditAction; label: string }> = [
  { value: "experiment.created", label: "Создание тоггла" },
  { value: "experiment.updated", label: "Изменение тоггла" },
  { value: "experiment.deleted", label: "Удаление тоггла" },
  { value: "group.created", label: "Создание группы" },
  { value: "group.updated", label: "Изменение группы" },
  { value: "group.deleted", label: "Удаление группы" },
  { value: "group.member_added", label: "Добавление участника в группу" },
  { value: "group.member_removed", label: "Удаление участника из группы" },
  { value: "admin.created", label: "Создание администратора" },
  { value: "admin.role_changed", label: "Изменение роли администратора" },
  { value: "admin.password_reset", label: "Сброс пароля администратора" },
  { value: "admin.deactivated", label: "Отключение администратора" },
  { value: "admin.activated", label: "Включение администратора" }
];

export const auditEntityOptions: Array<{ value: AuditEntityType; label: string }> = [
  { value: "experiment", label: "Тоггл" },
  { value: "group", label: "Группа" },
  { value: "admin", label: "Администратор" }
];
