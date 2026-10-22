import { applyDecorators, SetMetadata } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

/**
 * Metadata key for custom rate limit override
 */
export const RATE_LIMIT_OVERRIDE = 'rate_limit_override';

/**
 * Stricter rate limit for authentication endpoints (T-1.6)
 * - 5 requests per 5 minutes (anti brute-force on login/register)
 * - Applied to login, register, forgot-password, reset-password
 */
export function RateLimitAuth() {
  return applyDecorators(
    Throttle({ default: { limit: 5, ttl: 300000 } }),
    SetMetadata(RATE_LIMIT_OVERRIDE, true),
  );
}

/**
 * Moderate rate limit for password change operations
 * - 3 requests per 15 minutes (prevent credential stuffing)
 */
export function RateLimitPasswordChange() {
  return applyDecorators(
    Throttle({ default: { limit: 3, ttl: 900000 } }),
    SetMetadata(RATE_LIMIT_OVERRIDE, true),
  );
}

/**
 * Lenient rate limit for email verification
 * - 3 requests per 60 minutes (prevent email enumeration)
 */
export function RateLimitEmailVerification() {
  return applyDecorators(
    Throttle({ default: { limit: 3, ttl: 3600000 } }),
    SetMetadata(RATE_LIMIT_OVERRIDE, true),
  );
}
