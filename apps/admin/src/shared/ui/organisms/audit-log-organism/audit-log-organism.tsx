import { ButtonAtom, CardAtom, InputAtom, TagAtom } from "../../atoms";
import { FieldMolecule } from "../../molecules";
import { adminUiText } from "../../../config";
import type { AuditAction, AuditEntityType, AuditLogView } from "../../../api";
import {
  auditActionOptions,
  auditEntityOptions,
  type AuditLogOrganismProps
} from "./types";
import "./audit-log-organism.css";

const roleTagVariant = (role: string): "neutral" | "success" | "warn" => {
  if (role === "owner" || role === "admin") {
    return "success";
  }

  if (role === "editor") {
    return "neutral";
  }

  return "warn";
};

const formatDate = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(date);
};

const getActionLabel = (action: string): string =>
  auditActionOptions.find((item) => item.value === action)?.label ?? action;

const getEntityLabel = (entityType: string): string =>
  auditEntityOptions.find((item) => item.value === entityType)?.label ?? entityType;

const getObjectLabel = (log: AuditLogView): string =>
  log.entityLabel || log.entityId || "-";

export const AuditLogOrganism = ({
  logs,
  filters,
  isLoading,
  errorMessage,
  onFiltersChange,
  onSelectLog
}: AuditLogOrganismProps) => {
  return (
    <CardAtom>
      <div className="audit-log-organism__header">
        <div>
          <h2>{adminUiText.audit.heading}</h2>
          <p className="audit-log-organism__muted">
            История изменений конфигурации и административных действий.
          </p>
        </div>
        <TagAtom variant="neutral">Read-only</TagAtom>
      </div>

      <div className="audit-log-organism__filters">
        <FieldMolecule label={adminUiText.audit.actorEmailLabel}>
          <InputAtom
            placeholder="owner@company.local"
            value={filters.actorEmail}
            onChange={(event) => onFiltersChange({ actorEmail: event.target.value })}
          />
        </FieldMolecule>
        <FieldMolecule label={adminUiText.audit.actionLabel}>
          <select
            className="audit-log-organism__select"
            value={filters.action}
            onChange={(event) =>
              onFiltersChange({ action: event.target.value as AuditAction | "" })
            }
          >
            <option value="">Все</option>
            {auditActionOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </FieldMolecule>
        <FieldMolecule label={adminUiText.audit.entityTypeLabel}>
          <select
            className="audit-log-organism__select"
            value={filters.entityType}
            onChange={(event) =>
              onFiltersChange({
                entityType: event.target.value as AuditEntityType | ""
              })
            }
          >
            <option value="">Все</option>
            {auditEntityOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </FieldMolecule>
        <FieldMolecule label={adminUiText.audit.limitLabel}>
          <select
            className="audit-log-organism__select"
            value={String(filters.limit)}
            onChange={(event) =>
              onFiltersChange({ limit: Number(event.target.value) })
            }
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>
        </FieldMolecule>
      </div>

      {errorMessage ? <p className="audit-log-organism__error">{errorMessage}</p> : null}

      <div className="audit-log-organism__table-wrap">
        <table className="audit-log-organism__table">
          <thead>
            <tr>
              <th>Когда</th>
              <th>Кто</th>
              <th>Роль</th>
              <th>Действие</th>
              <th>Сущность</th>
              <th>Объект</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{formatDate(log.createdAt)}</td>
                <td>{log.actorEmail}</td>
                <td>
                  <TagAtom variant={roleTagVariant(log.actorRole)}>{log.actorRole}</TagAtom>
                </td>
                <td>{getActionLabel(log.action)}</td>
                <td>{getEntityLabel(log.entityType)}</td>
                <td>{getObjectLabel(log)}</td>
                <td className="audit-log-organism__actions">
                  <ButtonAtom
                    variant="secondary"
                    type="button"
                    onClick={() => onSelectLog(log)}
                    disabled={isLoading}
                  >
                    Подробнее
                  </ButtonAtom>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isLoading && !errorMessage && !logs.length ? (
        <p className="audit-log-organism__empty">Записей аудита пока нет</p>
      ) : null}
    </CardAtom>
  );
};
