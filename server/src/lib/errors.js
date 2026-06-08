/**
 * Centralized error code registry.
 *
 * Why? Eliminates hardcoded string literals scattered across controllers.
 * Client-side error handling can safely match on these stable codes without
 * worrying about typo drift between backend and frontend.
 */
export const ErrorCodes = Object.freeze({
  // Auth
  VALIDATION_ERROR: 'validation_error',
  NOT_AUTHENTICATED: 'not_authenticated',
  INVALID_CREDENTIALS: 'invalid_credentials',
  INVALID_TOKEN: 'invalid_token',
  FORBIDDEN: 'forbidden',
  MISSING_CREDENTIAL: 'missing_credential',
  MISSING_EMAIL: 'missing_email',

  // User
  USER_NOT_FOUND: 'user_not_found',
  EMAIL_TAKEN: 'email_taken',

  // OTP
  OTP_NOT_FOUND: 'otp_not_found',
  OTP_EXPIRED: 'otp_expired',
  INVALID_OTP: 'invalid_otp',
  TOO_MANY_ATTEMPTS: 'too_many_attempts',
  PASSWORD_REQUIRED: 'password_required',
  UNKNOWN_PURPOSE: 'unknown_purpose',

  // Subscription
  NO_SUBSCRIPTION: 'no_subscription',
  NO_SCHEDULED_CHANGE: 'no_scheduled_change',
  DUPLICATE_SUBSCRIPTION: 'duplicate_subscription',

  // Payments
  CARD_ERROR: 'card_error',
  INVALID_REQUEST: 'invalid_request',
  PAYMENT_FAILED: 'payment_failed',

  // Milestones
  MILESTONE_NOT_FOUND: 'milestone_not_found',
  ALREADY_CLAIMED: 'already_claimed',
  NOT_ELIGIBLE: 'not_eligible',

  // Rate Limiting
  RATE_LIMITED: 'rate_limited',

  // Admin
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
});
