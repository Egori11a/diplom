import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { QueryProviderProps } from "./types";

const queryClient = new QueryClient();

export const QueryProvider = ({ children }: QueryProviderProps) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
