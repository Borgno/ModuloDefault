import type { Router } from "./router";

// Métodos declarados no contrato OpenAPI para um path concreto. Serve para responder 405 com o header
// Allow quando o path existe mas o método não.
export function allowedMethods(router: Router, path: string): string[] {
  const methods = new Set<string>();

  for (const definition of router.openAPIRegistry.definitions) {
    if (definition.type !== "route") continue;
    const pattern = definition.route.path
      .split("/")
      .map((segment) => (/^\{.+\}$/.test(segment) ? "[^/]+" : escapeRegExp(segment)))
      .join("/");
    if (new RegExp(`^${pattern}$`).test(path)) {
      methods.add(definition.route.method.toUpperCase());
    }
  }

  return [...methods];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
