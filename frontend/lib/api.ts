const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(
  /\/$/,
  ''
);

export type ResponseData<T> = {
  status: string;
  message: string;
  data: T;
};

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, payload: unknown) {
    super('API request failed');
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

function buildUrl(url: string): string {
  return `${BASE_URL}/${url.replace(/^\//, '')}`;
}

function buildQuery(params?: object): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue;
    searchParams.set(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

async function parseResponse<T>(res: Response): Promise<T> {
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(res.status, payload);
  }

  return payload as T;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const hasJsonBody = options.body != null;

  const res = await fetch(buildUrl(url), {
    ...options,
    credentials: 'include',
    headers: {
      ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  return parseResponse<T>(res);
}

export const api = {
  get: async <T>(url: string, config?: { params?: object }) => {
    return request<T>(`${url}${buildQuery(config?.params)}`);
  },
  post: async <T>(url: string, body?: unknown) => {
    return request<T>(url, {
      method: 'POST',
      body: body == null ? undefined : JSON.stringify(body),
    });
  },
  put: async <T>(url: string, body?: unknown) => {
    return request<T>(url, {
      method: 'PUT',
      body: body == null ? undefined : JSON.stringify(body),
    });
  },
  delete: async <T>(url: string) => {
    return request<T>(url, { method: 'DELETE' });
  },
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (
      error.payload &&
      typeof error.payload === 'object' &&
      'message' in error.payload
    ) {
      return String((error.payload as { message: unknown }).message);
    }
  }
  return 'An unknown error occurred';
};
