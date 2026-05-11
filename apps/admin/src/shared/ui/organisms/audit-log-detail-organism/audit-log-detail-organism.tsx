import { ButtonAtom, DrawerAtom, TagAtom } from "../../atoms";
import { adminUiText } from "../../../config";
import type { AuditLogView } from "../../../api";
import type { AuditLogDetailOrganismProps } from "./types";
import "./audit-log-detail-organism.css";

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

const toJson = (value: unknown): string => JSON.stringify(value ?? {}, null, 2);

const getObjectLabel = (log: AuditLogView): string =>
  log.entityLabel || log.entityId || "-";

export const AuditLogDetailOrganism = ({
  log,
  onClose
}: AuditLogDetailOrganismProps) => {
  return (
    <DrawerAtom>
      <div className="audit-log-detail-organism__header">
        <h2>{adminUiText.audit.detailsHeading}</h2>
        <ButtonAtom variant="secondary" type="button" onClick={onClose}>
          Закрыть
        </ButtonAtom>
      </div>

      <div className="audit-log-detail-organism__meta">
        <div className="audit-log-detail-organism__meta-item">
          <span>Когда</span>
          <strong>{formatDate(log.createdAt)}</strong>
        </div>
        <div className="audit-log-detail-organism__meta-item">
          <span>Кто</span>
          <strong>{log.actorEmail}</strong>
        </div>
        <div className="audit-log-detail-organism__meta-item">
          <span>Роль</span>
          <TagAtom variant={roleTagVariant(log.actorRole)}>{log.actorRole}</TagAtom>
        </div>
        <div className="audit-log-detail-organism__meta-item">
          <span>Действие</span>
          <strong>{log.action}</strong>
        </div>
        <div className="audit-log-detail-organism__meta-item">
          <span>Сущность</span>
          <strong>{log.entityType}</strong>
        </div>
        <div className="audit-log-detail-organism__meta-item">
          <span>Объект</span>
          <strong>{getObjectLabel(log)}</strong>
        </div>
      </div>

      <div className="audit-log-detail-organism__grid">
        <section className="audit-log-detail-organism__section">
          <h3>До изменения</h3>
          <pre className="audit-log-detail-organism__json">{toJson(log.beforeState)}</pre>
        </section>
        <section className="audit-log-detail-organism__section">
          <h3>После изменения</h3>
          <pre className="audit-log-detail-organism__json">{toJson(log.afterState)}</pre>
        </section>
      </div>
    </DrawerAtom>
  );
};
