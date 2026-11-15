import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import { env, integrations } from "@/server/env";
import { AppError } from "@/server/errors";

type Rule = { limit: number; windowSeconds: number };

export const RATE_LIMITS = {
  contact: { limit: 5, windowSeconds: 600 },
  booking: { limit: 10, windowSeconds: 600 },
  availability: { limit: 120, windowSeconds: 60 },
  payment: { limit: 20, windowSeconds: 600 },
  review: { limit: 5, windowSeconds: 3600 },
  upload: { limit: 60, windowSeconds: 600 },
  account: { limit: 20, windowSeconds: 600 },
} satisfies Record<string, Rule>;

export type RateLimitKey = keyof typeof RATE_LIMITS;

// ── Upstash (production, shared across instances) ──
const redis = integrations.upstash ? new Redis({ url: env.upstash.url!, token: env.upstash.token! }) : null;
const upstashLimiters = new Map<RateLimitKey, Ratelimit>();
function upstashLimiter(key: RateLimitKey) {
  let limiter = upstashLimiters.get(key);
  if (!limiter && redis) {
    const rule = RATE_LIMITS[key];
    limiter = new Ratelimit({
      redis,
      prefix: `be:rl:${key}`,
      limiter: Ratelimit.slidingWindow(rule.limit, `${rule.windowSeconds} s`),
      analytics: false,
    });
    upstashLimiters.set(key, limiter);
  }
  return limiter;
}

// ── In-memory fallback (development / single instance) ──
const memory = new Map<string, number[]>();
function memoryLimit(id: string, rule: Rule) {
  const now = Date.now();
  const windowStart = now - rule.windowSeconds * 1000;
  const hits = (memory.get(id) ?? []).filter((t) => t > windowStart);
  if (hits.length >= rule.limit) {
    memory.set(id, hits);
    return false;
  }
  hits.push(now);
  memory.set(id, hits);
  if (memory.size > 10_000) memory.clear();
  return true;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}

/** Throws AppError(RATE_LIMITED) when the caller exceeded the rule. */
export async function enforceRateLimit(key: RateLimitKey, identifier?: string) {
  if (process.env.DISABLE_RATE_LIMIT === "true" && !env.isProduction) return;
  const id = `${key}:${identifier ?? (await clientIp())}`;
  const limiter = upstashLimiter(key);
  const allowed = limiter ? (await limiter.limit(id)).success : memoryLimit(id, RATE_LIMITS[key]);
  if (!allowed) throw new AppError("Too many requests. Please wait a moment and try again.", "RATE_LIMITED");
}
