import { ButtonAtom, CardAtom, InputAtom, TagAtom } from "../../atoms";
import { FieldMolecule } from "../../molecules";
import { adminUiText } from "../../../config";
import type { AdminRole } from "../../../api";
import type { UsersOrganismProps } from "./types";
import "./users-organism.css";

const roleLabels: Record<AdminRole, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer"
};

const formatDate = (value?: string | null): string => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
};

export const UsersOrganism = ({
  users,
  currentAdminEmail,
  createAdminForm,
  isBusy,
  errorMessage,
  onCreateAdminFormChange,
  onCreateAdmin,
  onRoleChange,
  onResetPassword,
  onToggleActive
}: UsersOrganismProps) => {
  return (
    <CardAtom>
      <div className="users-organism__header">
        <div>
          <h2>{adminUiText.users.heading}</h2>
          <p>Управление административными аккаунтами, ролями и доступом к конфигурации.</p>
        </div>
        <TagAtom variant="neutral">Только для owner</TagAtom>
      </div>

      <div className="users-organism__layout">
        <section className="users-organism__panel">
          <h3>{adminUiText.users.createButton}</h3>
          <div className="users-organism__form">
            <FieldMolecule label={adminUiText.users.emailLabel}>
              <InputAtom
                type="email"
                value={createAdminForm.email}
                onChange={(event) =>
                  onCreateAdminFormChange({ email: event.target.value })
                }
              />
            </FieldMolecule>
            <FieldMolecule label={adminUiText.users.passwordLabel}>
              <InputAtom
                type="password"
                value={createAdminForm.password}
                onChange={(event) =>
                  onCreateAdminFormChange({ password: event.target.value })
                }
              />
            </FieldMolecule>
            <FieldMolecule label={adminUiText.users.roleLabel}>
              <select
                className="users-organism__select"
                value={createAdminForm.role}
                onChange={(event) =>
                  onCreateAdminFormChange({ role: event.target.value as AdminRole })
                }
              >
                <option value="owner">{roleLabels.owner}</option>
                <option value="admin">{roleLabels.admin}</option>
                <option value="editor">{roleLabels.editor}</option>
                <option value="viewer">{roleLabels.viewer}</option>
              </select>
            </FieldMolecule>
            <ButtonAtom
              type="button"
              onClick={onCreateAdmin}
              disabled={
                isBusy ||
                !createAdminForm.email.trim() ||
                !createAdminForm.password.trim()
              }
            >
              {adminUiText.users.createButton}
            </ButtonAtom>
            {errorMessage ? <p className="users-organism__error">{errorMessage}</p> : null}
          </div>
        </section>

        <section className="users-organism__panel">
          <div className="users-organism__table-wrap">
            <table className="users-organism__table">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Роль</th>
                  <th>Статус</th>
                  <th>Последний вход</th>
                  <th>Создан</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user.email === currentAdminEmail;

                  return (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.email}</strong>
                        <span className="users-organism__muted">
                          {isSelf ? "Текущий аккаунт" : "Админ-консоль"}
                        </span>
                      </td>
                      <td className="users-organism__role-cell">
                        <select
                          className="users-organism__select"
                          value={user.role}
                          disabled={isBusy || isSelf}
                          onChange={(event) =>
                            onRoleChange(user.id, event.target.value as AdminRole)
                          }
                        >
                          <option value="owner">{roleLabels.owner}</option>
                          <option value="admin">{roleLabels.admin}</option>
                          <option value="editor">{roleLabels.editor}</option>
                          <option value="viewer">{roleLabels.viewer}</option>
                        </select>
                      </td>
                      <td>
                        <TagAtom variant={user.isActive ? "success" : "warn"}>
                          {user.isActive ? "Активен" : "Отключен"}
                        </TagAtom>
                      </td>
                      <td>{formatDate(user.lastLoginAt)}</td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        <div className="users-organism__actions">
                          <ButtonAtom
                            variant="secondary"
                            type="button"
                            onClick={() => onResetPassword(user)}
                            disabled={isBusy}
                          >
                            Сбросить пароль
                          </ButtonAtom>
                          <ButtonAtom
                            variant="secondary"
                            type="button"
                            onClick={() => onToggleActive(user)}
                            disabled={isBusy || isSelf}
                          >
                            {user.isActive ? "Отключить" : "Включить"}
                          </ButtonAtom>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!users.length ? <p className="users-organism__empty">Пользователей пока нет</p> : null}
        </section>
      </div>
    </CardAtom>
  );
};
