/**
 * Simple in-memory rate limiter for login attempts
 * Prevents brute-force attacks on the login endpoint
 */

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
}

interface RateLimiterConfig {
  windowMs: number;
  maxAttempts: number;
}

const DEFAULT_CONFIG: RateLimiterConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 5,
};

const attempts: Map<string, RateLimitEntry> = new Map();

/**
 * Check if an IP/key is rate limited
 */
export function isRateLimited(key: string, config: RateLimiterConfig = DEFAULT_CONFIG): boolean {
  const now: number = Date.now();
  const entry: RateLimitEntry | undefined = attempts.get(key);

  if (!entry) {
    return false;
  }

  if (now - entry.firstAttempt > config.windowMs) {
    attempts.delete(key);
    return false;
  }

  return entry.count >= config.maxAttempts;
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(key: string): void {
  const now: number = Date.now();
  const entry: RateLimitEntry | undefined = attempts.get(key);

  if (!entry || now - entry.firstAttempt > DEFAULT_CONFIG.windowMs) {
    attempts.set(key, { count: 1, firstAttempt: now });
  } else {
    entry.count += 1;
  }
}

/**
 * Clear rate limit for a key (e.g., after successful login)
 */
export function clearRateLimit(key: string): void {
  attempts.delete(key);
}
