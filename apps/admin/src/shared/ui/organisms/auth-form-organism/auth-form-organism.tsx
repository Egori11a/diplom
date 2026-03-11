import { ButtonAtom, CardAtom, InputAtom, TagAtom } from "../../atoms";
import { FieldMolecule } from "../../molecules";
import type { AuthFormOrganismProps } from "./types";
import "./auth-form-organism.css";

export const AuthFormOrganism = ({
  email,
  password,
  loginError,
  onEmailChange,
  onPasswordChange,
  onLogin
}: AuthFormOrganismProps) => {
  return (
    <CardAtom className="auth-form-organism">
      <h2>Вход администратора</h2>
      <div className="auth-form-organism__grid">
        <FieldMolecule label="Почта">
          <InputAtom value={email} onChange={(event) => onEmailChange(event.target.value)} />
        </FieldMolecule>
        <FieldMolecule label="Пароль">
          <InputAtom
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
          />
        </FieldMolecule>
      </div>
      <div className="auth-form-organism__actions">
        <ButtonAtom type="button" onClick={onLogin}>
          Войти
        </ButtonAtom>
        {loginError && <TagAtom variant="error">{loginError}</TagAtom>}
      </div>
    </CardAtom>
  );
};
