export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// A sleeping server answers through the proxy with a gateway error until it has woken up.
const WAKING = new Set([502, 504]);
// A cold start on the free host can take over a minute, so keep trying for about three.
const RETRY_DELAYS = [2000, 3000, 5000, ...Array<number>(17).fill(10000)];
/** Fired on window while requests are waiting for the server to wake (detail: true) and when it answers (false). */
export const WAKING_EVENT = "wn:waking";
const announce = (waking: boolean) => typeof window !== "undefined" && window.dispatchEvent(new CustomEvent(WAKING_EVENT, { detail: waking }));

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`/api${path}`, {
      method,
      credentials: "include",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).catch(() => null);
    if ((!res || WAKING.has(res.status)) && attempt < RETRY_DELAYS.length) {
      announce(true);
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      continue;
    }
    if (attempt > 0) announce(false);
    if (!res) throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data.error ?? (WAKING.has(res.status) ? "The server is still starting up. Please try again in a moment." : `Request failed (${res.status})`));
    return data as T;
  }
}

/** Wakes a sleeping server ahead of the first real request. */
export function warmUp() {
  fetch("/api/health").catch(() => {});
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown = {}) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};

export function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}
