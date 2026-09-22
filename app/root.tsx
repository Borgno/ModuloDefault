import { QueryClientProvider } from "@tanstack/react-query";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { Splash } from "~/components/layout/Splash";
import { ConfirmProvider } from "~/components/patterns/ConfirmDialog";
import { Button } from "~/components/ui/button";
import { Toaster } from "~/components/ui/sonner";
import { TooltipProvider } from "~/components/ui/tooltip";
import { APP_NAME } from "~/config/app";
import { THEME_INIT_SCRIPT } from "~/lib/theme";
import type { Route } from "./+types/root";
import { queryClient } from "./lib/queryClient";
import "./app.css";

export const meta: Route.MetaFunction = () => [{ title: APP_NAME }];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: o script do tema pode pôr .dark no <html> antes do React hidratar.
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {
  return <Splash />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ConfirmProvider>
          <Outlet />
        </ConfirmProvider>
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Algo deu errado";
  let details = "Ocorreu um erro inesperado.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? "Página não encontrada" : `Erro ${error.status}`;
    details =
      error.status === 404 ? "O endereço acessado não existe." : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl border bg-card p-8 shadow-card-elevated">
        <h1 className="mb-2 text-xl font-bold tracking-tight">{title}</h1>
        <p className="mb-6 font-inter text-sm text-muted-foreground">{details}</p>
        {stack && (
          <pre className="mb-6 max-h-64 overflow-auto rounded-lg bg-muted p-4 font-mono text-xs">
            <code>{stack}</code>
          </pre>
        )}
        <Button asChild>
          <a href="/">Voltar ao início</a>
        </Button>
      </div>
    </main>
  );
}
