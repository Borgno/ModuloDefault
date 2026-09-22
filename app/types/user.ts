// Espelha o UserSchema de server/routes/users/users.schemas.ts. O frontend não importa o servidor
// (regra do ESLint), então o contrato é repetido aqui.
export type Role = "admin" | "user";

export type User = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};
