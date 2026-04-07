const ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cache-Control": "no-store",
} as const;

export class HttpError extends Error {
  status: number;
  extraHeaders?: HeadersInit;

  constructor(status: number, message: string, extraHeaders?: HeadersInit) {
    super(message);
    this.status = status;
    this.extraHeaders = extraHeaders;
  }
}

function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("origin");

  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function buildHeaders(req: Request, extra: HeadersInit = {}) {
  return {
    ...buildCorsHeaders(req),
    ...SECURITY_HEADERS,
    ...extra,
  };
}

export function handlePreflight(req: Request) {
  if (req.method !== "OPTIONS") {
    return null;
  }

  return new Response(null, {
    status: 204,
    headers: buildHeaders(req),
  });
}

export function requirePost(req: Request) {
  if (req.method !== "POST") {
    throw new HttpError(405, "Method not allowed", { Allow: "POST, OPTIONS" });
  }
}

export async function parseJsonBody<T>(req: Request): Promise<T> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new HttpError(415, "Content-Type must be application/json");
  }

  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Malformed JSON request body");
  }
}

export function jsonResponse(
  req: Request,
  status: number,
  payload: unknown,
  extraHeaders: HeadersInit = {},
) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: buildHeaders(req, {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    }),
  });
}

export function streamResponse(req: Request, body: ReadableStream<Uint8Array> | null) {
  return new Response(body, {
    headers: buildHeaders(req, {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
    }),
  });
}

export function estimateDataUrlBytes(value: string) {
  const base64 = value.includes(",") ? value.split(",")[1] : value;
  const sanitized = base64.replace(/\s/g, "");
  const padding = sanitized.endsWith("==") ? 2 : sanitized.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((sanitized.length * 3) / 4) - padding);
}

export function assertString(
  value: unknown,
  fieldName: string,
  maxLength: number,
  options: { minLength?: number; optional?: boolean } = {},
) {
  if (value == null || value === "") {
    if (options.optional) {
      return "";
    }
    throw new HttpError(400, `${fieldName} is required`);
  }

  if (typeof value !== "string") {
    throw new HttpError(400, `${fieldName} must be a string`);
  }

  const trimmed = value.trim();
  if ((options.minLength ?? 1) > 0 && trimmed.length < (options.minLength ?? 1)) {
    throw new HttpError(400, `${fieldName} is too short`);
  }
  if (trimmed.length > maxLength) {
    throw new HttpError(400, `${fieldName} is too long`);
  }

  return trimmed;
}

export function assertEnum<T extends string>(
  value: unknown,
  fieldName: string,
  allowed: readonly T[],
) {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new HttpError(400, `${fieldName} is invalid`);
  }

  return value as T;
}

export function assertNumber(
  value: unknown,
  fieldName: string,
  options: { min?: number; max?: number } = {},
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new HttpError(400, `${fieldName} must be a number`);
  }

  if (options.min != null && value < options.min) {
    throw new HttpError(400, `${fieldName} is out of range`);
  }
  if (options.max != null && value > options.max) {
    throw new HttpError(400, `${fieldName} is out of range`);
  }

  return value;
}

export function assertDataUrl(
  value: unknown,
  fieldName: string,
  allowedPrefixes: readonly string[],
  maxBytes: number,
) {
  const dataUrl = assertString(value, fieldName, Math.ceil((maxBytes * 4) / 3) + 128);
  const normalized = dataUrl.toLowerCase();

  if (!allowedPrefixes.some((prefix) => normalized.startsWith(prefix))) {
    throw new HttpError(400, `${fieldName} format is not allowed`);
  }

  if (estimateDataUrlBytes(dataUrl) > maxBytes) {
    throw new HttpError(413, `${fieldName} exceeds the size limit`);
  }

  return dataUrl;
}

export function assertOptionalDataUrl(
  value: unknown,
  fieldName: string,
  allowedPrefixes: readonly string[],
  maxBytes: number,
) {
  if (value == null || value === "") {
    return null;
  }

  return assertDataUrl(value, fieldName, allowedPrefixes, maxBytes);
}

export function assertArray(value: unknown, fieldName: string, maxLength: number) {
  if (!Array.isArray(value)) {
    throw new HttpError(400, `${fieldName} must be an array`);
  }
  if (value.length > maxLength) {
    throw new HttpError(400, `${fieldName} is too large`);
  }
  return value;
}

export function errorResponse(req: Request, error: unknown, logLabel: string) {
  if (error instanceof HttpError) {
    return jsonResponse(req, error.status, { error: error.message }, error.extraHeaders);
  }

  console.error(logLabel, error);
  return jsonResponse(req, 500, { error: "Internal server error" });
}
