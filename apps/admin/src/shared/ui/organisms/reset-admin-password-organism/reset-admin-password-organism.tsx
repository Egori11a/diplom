import { ButtonAtom, DrawerAtom, InputAtom } from "../../atoms";
import { FieldMolecule } from "../../molecules";
import { adminUiText } from "../../../config";
import type { ResetAdminPasswordOrganismProps } from "./types";
import "./reset-admin-password-organism.css";

export const ResetAdminPasswordOrganism = ({
  email,
  password,
  isBusy,
  errorMessage,
  onPasswordChange,
  onClose,
  onSubmit
}: ResetAdminPasswordOrganismProps) => {
  return (
    <DrawerAtom>
      <div className="reset-admin-password-organism__header">
        <h2>{adminUiText.users.resetPasswordHeading}</h2>
        <ButtonAtom variant="secondary" type="button" onClick={onClose}>
          Закрыть
        </ButtonAtom>
      </div>

      <p className="reset-admin-password-organism__meta">{email}</p>

      <FieldMolecule label={adminUiText.users.passwordLabel}>
        <InputAtom
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
        />
      </FieldMolecule>

      {errorMessage ? (
        <p className="reset-admin-password-organism__error">{errorMessage}</p>
      ) : null}

      <div className="reset-admin-password-organism__actions">
        <ButtonAtom
          type="button"
          onClick={onSubmit}
          disabled={isBusy || !password.trim()}
        >
          Сохранить
        </ButtonAtom>
        <ButtonAtom variant="secondary" type="button" onClick={onClose}>
          Отмена
        </ButtonAtom>
      </div>
    </DrawerAtom>
  );
};
