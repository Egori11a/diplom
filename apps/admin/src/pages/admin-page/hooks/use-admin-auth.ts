import { useState } from "react";
import type { CurrentAdminView } from "../../../shared/api";
import { fetchCurrentAdmin, login } from "../../../shared/api";

interface UseAdminAuthParams {
  initialEmail: string;
  initialPassword: string;
}

export const useAdminAuth = ({
  initialEmail,
  initialPassword
}: UseAdminAuthParams) => {
  const [token, setToken] = useState("");
  const [currentAdmin, setCurrentAdmin] = useState<CurrentAdminView | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [loginError, setLoginError] = useState("");

  const handleLogin = async () => {
    try {
      const nextToken = await login(email, password);
      setToken(nextToken);
      setIsLoadingProfile(true);
      setCurrentAdmin(await fetchCurrentAdmin(nextToken));
      setLoginError("");
    } catch {
      setToken("");
      setCurrentAdmin(null);
      setLoginError("Ошибка входа");
    } finally {
      setIsLoadingProfile(false);
    }
  };

  return {
    token,
    currentAdmin,
    isLoadingProfile,
    email,
    password,
    loginError,
    setEmail,
    setPassword,
    handleLogin
  };
};
