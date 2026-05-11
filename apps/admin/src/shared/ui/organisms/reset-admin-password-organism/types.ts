export interface ResetAdminPasswordOrganismProps {
  email: string;
  password: string;
  isBusy: boolean;
  errorMessage: string;
  onPasswordChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}
