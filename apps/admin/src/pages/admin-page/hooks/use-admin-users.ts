import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  authFetch,
  type AdminRole,
  type AdminUserView,
  type CurrentAdminView
} from "../../../shared/api";
import type { CreateAdminForm, ResetPasswordTarget, UsersQuery } from "../types";
import { adminDataQueryKeys } from "./use-admin-data.query-keys";

const defaultCreateAdminForm = (): CreateAdminForm => ({
  email: "",
  password: "",
  role: "viewer"
});

const ensureMutationSuccess = async (response: Response): Promise<void> => {
  if (!response.ok) {
    throw new Error(await response.text());
  }
};

export const useAdminUsers = (
  token: string,
  currentAdmin: CurrentAdminView | null
) => {
  const queryClient = useQueryClient();
  const invalidateAuditLogs = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["audit-logs", token]
    });
  };
  const [createAdminForm, setCreateAdminForm] = useState<CreateAdminForm>(
    defaultCreateAdminForm
  );
  const [resetPasswordTarget, setResetPasswordTarget] =
    useState<ResetPasswordTarget | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");

  const isOwner = currentAdmin?.role === "owner";

  const usersQuery = useQuery({
    queryKey: adminDataQueryKeys.users(token),
    enabled: Boolean(token && isOwner),
    queryFn: async () => {
      const response = await authFetch("/admin/users", token);
      if (!response.ok) {
        throw new Error("Failed to load admin users");
      }
      return (await response.json()) as UsersQuery;
    }
  });

  const createAdminMutation = useMutation({
    mutationFn: async () => {
      const response = await authFetch("/admin/users", token, {
        method: "POST",
        body: JSON.stringify({
          email: createAdminForm.email.trim(),
          password: createAdminForm.password,
          role: createAdminForm.role
        })
      });
      await ensureMutationSuccess(response);
      return (await response.json()) as { id: string };
    },
    onSuccess: async () => {
      setCreateAdminForm(defaultCreateAdminForm());
      await queryClient.invalidateQueries({
        queryKey: adminDataQueryKeys.users(token)
      });
      await invalidateAuditLogs();
    }
  });

  const updateAdminRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      role
    }: {
      userId: string;
      role: AdminRole;
    }) => {
      const response = await authFetch(`/admin/users/${userId}`, token, {
        method: "PATCH",
        body: JSON.stringify({ role })
      });
      await ensureMutationSuccess(response);
      return { userId, role };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminDataQueryKeys.users(token)
      });
      await invalidateAuditLogs();
    }
  });

  const resetAdminPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!resetPasswordTarget) {
        return;
      }

      const response = await authFetch(
        `/admin/users/${resetPasswordTarget.id}/reset-password`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ password: resetPasswordValue })
        }
      );
      await ensureMutationSuccess(response);
    },
    onSuccess: async () => {
      setResetPasswordTarget(null);
      setResetPasswordValue("");
      await invalidateAuditLogs();
    }
  });

  const toggleAdminActiveMutation = useMutation({
    mutationFn: async ({
      userId,
      isActive
    }: {
      userId: string;
      isActive: boolean;
    }) => {
      const response = await authFetch(
        `/admin/users/${userId}/${isActive ? "deactivate" : "activate"}`,
        token,
        { method: "POST" }
      );
      await ensureMutationSuccess(response);
      return { userId };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminDataQueryKeys.users(token)
      });
      await invalidateAuditLogs();
    }
  });

  const users = usersQuery.data?.admins ?? [];
  const isBusy =
    createAdminMutation.isPending ||
    updateAdminRoleMutation.isPending ||
    resetAdminPasswordMutation.isPending ||
    toggleAdminActiveMutation.isPending;

  const actionError =
    (createAdminMutation.error as Error | undefined)?.message ||
    (updateAdminRoleMutation.error as Error | undefined)?.message ||
    (resetAdminPasswordMutation.error as Error | undefined)?.message ||
    (toggleAdminActiveMutation.error as Error | undefined)?.message ||
    "";

  const openResetPassword = (user: AdminUserView) => {
    setResetPasswordTarget({ id: user.id, email: user.email });
    setResetPasswordValue("");
  };

  return {
    users,
    isOwner,
    isBusy,
    actionError,
    usersQuery,
    createAdminForm,
    setCreateAdminForm,
    resetPasswordTarget,
    setResetPasswordTarget,
    resetPasswordValue,
    setResetPasswordValue,
    createAdminMutation,
    updateAdminRoleMutation,
    resetAdminPasswordMutation,
    toggleAdminActiveMutation,
    openResetPassword
  };
};
