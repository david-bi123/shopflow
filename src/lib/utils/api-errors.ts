export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 422, 'VALIDATION_ERROR')
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    }
  }

  if (error instanceof Error) {
    return {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    }
  }

  return {
    error: 'Unknown error',
    code: 'UNKNOWN',
    statusCode: 500,
  }
}
