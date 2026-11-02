export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'network_error');
  }
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    if (
      response.status === 401 &&
      path.startsWith('/api/admin/') &&
      !path.endsWith('/login') &&
      !path.endsWith('/session')
    ) {
      window.dispatchEvent(new Event('support:auth-expired'));
    }
    throw new ApiError(response.status, data.error || 'request_failed');
  }
  return data as T;
}

export function json(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

export function safeLink(value?: string | null, type?: 'booking' | 'payment'): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const allowed =
      type === 'booking'
        ? ['calendly.com']
        : type === 'payment'
          ? ['buy.stripe.com', 'checkout.stripe.com']
          : [];
    return value.length <= 2048 &&
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.pathname !== '/' &&
      allowed.includes(url.hostname)
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
