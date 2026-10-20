import { applyDecorator, SetMetadata } from '@nestjs/common';
import { ThrottlerLimit, ThrottlerTtl } from '@nestjs/throttler';

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
  return applyDecorator(
    ThrottlerLimit('5'),
    ThrottlerTtl('300'), // 5 minutes in seconds
    SetMetadata(RATE_LIMIT_OVERRIDE, true),
  );
}

/**
 * Moderate rate limit for password change operations
 * - 3 requests per 15 minutes (prevent credential stuffing)
 */
export function RateLimitPasswordChange() {
  return applyDecorator(
    ThrottlerLimit('3'),
    ThrottlerTtl('900'), // 15 minutes in seconds
    SetMetadata(RATE_LIMIT_OVERRIDE, true),
  );
}

/**
 * Lenient rate limit for email verification
 * - 3 requests per 60 minutes (prevent email enumeration)
 */
export function RateLimitEmailVerification() {
  return applyDecorator(
    ThrottlerLimit('3'),
    ThrottlerTtl('3600'), // 60 minutes in seconds
    SetMetadata(RATE_LIMIT_OVERRIDE, true),
  );
}
