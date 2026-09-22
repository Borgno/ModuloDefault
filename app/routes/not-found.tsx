import { Link } from "react-router";
import { PageHeader } from "~/components/layout/PageHeader";
import { Button } from "~/components/ui/button";
import { APP_NAME } from "~/config/app";
import type { Route } from "./+types/not-found";

export const meta: Route.MetaFunction = () => [{ title: `Página não encontrada | ${APP_NAME}` }];

export default function NotFound() {
  return (
    <>
      <PageHeader title="Página não encontrada" description="O endereço acessado não existe." />
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </>
  );
}
