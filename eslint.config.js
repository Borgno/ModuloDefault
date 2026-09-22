import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["build/", ".react-router/", "coverage/"]),

  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },

  // Frontend: navegador, hooks do React
  {
    files: ["app/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/server/**", "@prisma/client"],
              message:
                "ARCHITECTURE_VIOLATION: o frontend fala com o backend só por app/lib/api.ts, nunca importando o servidor.",
            },
            {
              group: ["~/components/ui/select", "**/components/ui/select"],
              message:
                "Todo select é pesquisável: use SearchableSelect (~/components/patterns/SearchableSelect).",
            },
          ],
        },
      ],
    },
  },

  // Backend: Node
  {
    files: ["server/**/*.ts"],
    languageOptions: { globals: globals.node },
  },

  // Acesso a dados só em server/services/. Testes ficam de fora: eles leem o store para conferir o
  // efeito de uma requisição.
  {
    files: ["server/routes/**/*.ts", "server/middleware/**/*.ts"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/lib/memoryStore*", "**/lib/prisma*", "@prisma/client"],
              message: "ARCHITECTURE_VIOLATION: acesso a dados só em server/services/.",
            },
          ],
        },
      ],
    },
  },

  // Desliga as regras de estilo que o Prettier cuida
  prettier,
]);
