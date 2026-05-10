import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  authFetch,
  type AuditAction,
  type AuditEntityType,
  type AuditLogView,
  type AuditLogsQuery
} from "../../../shared/api";
import type { AuditFilters } from "../types";
import { adminDataQueryKeys } from "./use-admin-data.query-keys";

const defaultFilters = (): AuditFilters => ({
  actorEmail: "",
  action: "",
  entityType: "",
  limit: 100
});

const buildAuditQuery = (filters: AuditFilters): string => {
  const params = new URLSearchParams();

  if (filters.actorEmail.trim()) {
    params.set("actorEmail", filters.actorEmail.trim());
  }

  if (filters.action) {
    params.set("action", filters.action);
  }

  if (filters.entityType) {
    params.set("entityType", filters.entityType);
  }

  params.set("limit", String(filters.limit));

  const query = params.toString();
  return query ? `?${query}` : "";
};

export const useAdminAudit = (token: string) => {
  const [filters, setFilters] = useState<AuditFilters>(defaultFilters);
  const [selectedLog, setSelectedLog] = useState<AuditLogView | null>(null);

  const auditQuery = useQuery({
    queryKey: adminDataQueryKeys.audit(token, filters),
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await authFetch(
        `/admin/audit-logs${buildAuditQuery(filters)}`,
        token
      );

      if (!response.ok) {
        throw new Error("Не удалось загрузить журнал аудита");
      }

      return (await response.json()) as AuditLogsQuery;
    }
  });

  const logs = auditQuery.data?.logs ?? [];
  const isLoading = auditQuery.isFetching;
  const errorMessage = auditQuery.isError
    ? ((auditQuery.error as Error | undefined)?.message ?? "Не удалось загрузить журнал аудита")
    : "";

  return {
    filters,
    setFilters,
    selectedLog,
    setSelectedLog,
    logs,
    isLoading,
    errorMessage
  };
};
