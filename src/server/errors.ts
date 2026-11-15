/** Errors whose message is safe to show to end users. Anything else is reported generically. */
export class AppError extends Error {
  constructor(
    message: string,
    public code: "VALIDATION" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED" | "BAD_REQUEST" = "BAD_REQUEST",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export function toActionError(err: unknown): { ok: false; error: string } {
  if (err instanceof AppError) return { ok: false, error: err.message };
  console.error("[action:error]", err);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export const HTTP_STATUS: Record<AppError["code"], number> = {
  VALIDATION: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  BAD_REQUEST: 400,
};
