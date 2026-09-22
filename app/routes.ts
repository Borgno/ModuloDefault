import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("change-password", "routes/change-password.tsx"),

  // Tudo aqui dentro exige sessão (guard no clientMiddleware do layout).
  layout("routes/app-layout.tsx", [
    index("routes/dashboard/route.tsx"),
    route("users", "routes/users/route.tsx"),
    route("profile", "routes/profile.tsx"),
    route("*", "routes/not-found.tsx"),
  ]),
] satisfies RouteConfig;
