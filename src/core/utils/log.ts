// Errors routed here never leak auth headers or key-bearing URLs into logcat.
// Release builds log nothing.

function sanitizeUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return url.split('?')[0];
}

export function logError(context: string, error: unknown): void {
  if (!__DEV__) return;
  const e = error as any;
  if (e?.isAxiosError || e?.config) {
    console.error(context, {
      message: e.message,
      status: e.response?.status,
      url: sanitizeUrl(e.config?.url ?? e.config?.baseURL),
    });
  } else {
    console.error(context, e?.message ?? e);
  }
}
