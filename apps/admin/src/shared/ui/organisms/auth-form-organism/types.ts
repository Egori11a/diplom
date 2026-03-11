export interface AuthFormOrganismProps {
  email: string;
  password: string;
  loginError: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onLogin: () => void;
}
