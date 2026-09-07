// See RESEND_ERROR_CODE_KEY in the `resend` package's type definitions.
const RETRYABLE_ERROR_CODES = new Set([
  'rate_limit_exceeded',
  'concurrent_idempotent_requests',
  'application_error',
  'internal_server_error',
]);

export function isRetryableResendError(errorName: string | undefined): boolean {
  return !!errorName && RETRYABLE_ERROR_CODES.has(errorName);
}
