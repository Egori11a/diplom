import { useState } from "react";
import { login } from "../../../shared/api";

interface UseAdminAuthParams {
  initialEmail: string;
  initialPassword: string;
}

export const useAdminAuth = ({
  initialEmail,
  initialPassword
}: UseAdminAuthParams) => {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [loginError, setLoginError] = useState("");

  const handleLogin = async () => {
    try {
      setToken(await login(email, password));
      setLoginError("");
    } catch {
      setLoginError("Ошибка входа");
    }
  };

  return {
    token,
    email,
    password,
    loginError,
    setEmail,
    setPassword,
    handleLogin
  };
};
