// Unified HTTP client for Quantum Talent Console API
// All API responses follow: { success: true, data: T } | { success: false, error: { code, message, details } }
// Paginated: { success: true, data: { data: T[], total, page, pageSize, totalPages } }

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

export type ApiResult<T = unknown> = ApiResponse<T> | ApiErrorResponse;

export interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

class ApiClientError extends Error {
  code: string;
  details?: unknown;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.details = error.details;
  }
}

/**
 * Send a request to the internal API.
 *
 * Authentication is handled by the quantum_console_access HttpOnly cookie
 * which the browser automatically attaches to same-origin requests.
 * No manual token / x-session header is needed.
 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const json: ApiResult<T> = await res.json();

  if (!json.success) {
    throw new ApiClientError(json.error);
  }

  return json.data;
}

export const api = {
  get<T>(url: string, params?: Record<string, string | undefined>): Promise<T> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') searchParams.set(k, v);
      });
    }
    const qs = searchParams.toString();
    return request<T>(`${url}${qs ? `?${qs}` : ''}`);
  },

  post<T>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(url: string): Promise<T> {
    return request<T>(url, { method: 'DELETE' });
  },
};

export { ApiClientError };
