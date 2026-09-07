const RETRYABLE_ERROR_NAMES = new Set([
  'ThrottlingException',
  'TooManyRequestsException',
  'ServiceUnavailableException',
  'LimitExceededException',
]);

export function isRetryableSesError(error: unknown): boolean {
  const name = (error as { name?: string })?.name;
  if (name && RETRYABLE_ERROR_NAMES.has(name)) return true;

  const statusCode = (error as { $metadata?: { httpStatusCode?: number } })
    ?.$metadata?.httpStatusCode;
  return statusCode === 429 || statusCode === 503;
}

export function sesErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown SES error';
}
