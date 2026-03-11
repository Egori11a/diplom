import { QueryProvider } from "../providers/query-provider";
import { AdminPage } from "../../pages/admin-page";
import "./app-root.css";

export const AppRoot = () => {
  return (
    <QueryProvider>
      <AdminPage />
    </QueryProvider>
  );
};
