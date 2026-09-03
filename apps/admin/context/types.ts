import type { LoginFormValues } from "@/validation/login.schema";
import type { AdminUser } from "@/interface/user";

export type { AdminUser };

export type AdminAuthContextType = {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;

  login: (data: LoginFormValues) => Promise<void>;
  logout: () => Promise<void>;
};
