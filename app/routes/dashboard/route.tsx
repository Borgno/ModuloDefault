import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "~/components/layout/PageHeader";
import { APP_NAME } from "~/config/app";
import { meQuery } from "~/lib/auth";
import type { Route } from "./+types/route";
import { AdminDashboard } from "./_components/AdminDashboard";
import { UserDashboard } from "./_components/UserDashboard";

export const meta: Route.MetaFunction = () => [{ title: `Dashboard | ${APP_NAME}` }];

// O conteúdo muda com a role: o admin vê os números do sistema; o usuário comum, o que ele precisa
// no dia a dia (UserDashboard, que cada projeto substitui).
export default function Dashboard() {
  const { data: user } = useQuery(meQuery);
  if (!user) return null;

  const isAdmin = user.role === "admin";
  return (
    <>
      <PageHeader
        title="Dashboard"
        description={isAdmin ? "Visão geral do sistema." : "Resumo do seu acesso."}
      />
      {isAdmin ? <AdminDashboard /> : <UserDashboard user={user} />}
    </>
  );
}
