export class NoCodeBackendError extends Error {
  constructor(message, { code = 'NCB_REQUEST_FAILED', status = null, details = null, cause } = {}) {
    super(message, cause ? { cause } : undefined)
    this.name = 'NoCodeBackendError'
    this.code = code
    this.status = status
    this.details = details
  }
}

export const requireAuthenticatedUser = (userId) => {
  if (!userId) {
    throw new NoCodeBackendError('An authenticated user is required.', { code: 'AUTH_REQUIRED', status: 401 })
  }
  return userId
}

export class DomainValidationError extends NoCodeBackendError {
  constructor(message, details = null) {
    super(message, { code: 'DOMAIN_VALIDATION_ERROR', status: 422, details })
    this.name = 'DomainValidationError'
  }
}
