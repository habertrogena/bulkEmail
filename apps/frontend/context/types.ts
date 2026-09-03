import { LoginFormValues } from "@/validation/login.schema";
import { RegisterFormValues } from "@/validation/register.schema";

export type AuthUser = {
  id: string;
  email: string;
  companyId: string;
  role: string;
};

export type AuthContextType = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;

  register: (data: RegisterFormValues) => Promise<void>;
  login: (data: LoginFormValues) => Promise<void>;
  logout: () => Promise<void>;
};
