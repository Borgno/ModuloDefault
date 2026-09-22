import type { Role } from "./user";

// Espelha o UserStatsSchema de server/routes/userStats/userStats.schemas.ts.
export type UserStats = {
  total: number;
  active: number;
  inactive: number;
  pendingPasswordChange: number;
  byRole: { role: Role; count: number }[];
  recentLogins: { id: string; fullName: string; email: string; lastLoginAt: string }[];
};
