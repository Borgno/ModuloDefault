import { requestFinished, requestStarted } from "./loading";

// Única camada de fetch do frontend. Em erro, LANÇA ApiError com o Problem Details da API: o TanStack
// Query só marca a query como erro (isError, retry) quando a função lança.

export type Problem = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  code: string;
  errors?: { field: string; message: string }[];
};

export class ApiError extends Error {
  readonly problem: Problem;

  constructor(problem: Problem) {
    super(problem.detail ?? problem.title);
    this.problem = problem;
  }

  get status() {
    return this.problem.status;
  }

  get code() {
    return this.problem.code;
  }

  // Mensagem do campo, para exibir no formulário.
  fieldError(field: string) {
    return this.problem.errors?.find((error) => error.field === field)?.message;
  }
}

export const isUnauthorized = (error: unknown) => error instanceof ApiError && error.status === 401;

function isProblem(value: unknown): value is Problem {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Problem).status === "number" &&
    typeof (value as Problem).code === "string"
  );
}

type RequestOptions = { body?: unknown; signal?: AbortSignal };

async function request<T>(method: string, path: string, { body, signal }: RequestOptions = {}) {
  requestStarted();
  try {
    return await send<T>(method, path, { body, signal });
  } finally {
    requestFinished();
  }
}

async function send<T>(method: string, path: string, { body, signal }: RequestOptions) {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError({
      type: "about:blank",
      title: "Network Error",
      status: 0,
      code: "NETWORK_ERROR",
      detail: "Não foi possível falar com o servidor. Verifique a conexão.",
    });
  }

  if (res.status === 204) return undefined as T;

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      isProblem(data)
        ? data
        : { type: "about:blank", title: res.statusText, status: res.status, code: "HTTP_ERROR" },
    );
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, { body }),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
