import { NextResponse } from "next/server";

// Error Types
export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMIT_EXCEEDED"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "UNPROCESSABLE_ENTITY";

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: ApiErrorCode;
  details?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Creates a successful API response
 */
export function apiSuccess<T>(
  data: T,
  message?: string,
  status: number = 200,
  headers?: HeadersInit,
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
  };

  return NextResponse.json(response, { status, headers });
}

/**
 * Creates an error API response
 */
export function apiError(
  error: string,
  code?: ApiErrorCode,
  status: number = 400,
  details?: unknown,
  headers?: HeadersInit,
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error,
    ...(code && { code }),
    ...(details !== undefined && { details }),
  };

  return NextResponse.json(response, { status, headers });
}

/**
 * Common error responses
 */
export const apiErrors = {
  unauthorized: (message: string = "Unauthorized") =>
    apiError(message, "UNAUTHORIZED", 401),
  
  forbidden: (message: string = "Forbidden") =>
    apiError(message, "FORBIDDEN", 403),
  
  notFound: (message: string = "Resource not found") =>
    apiError(message, "NOT_FOUND", 404),
  
  validationError: (details: unknown, message: string = "Validation failed") =>
    apiError(message, "VALIDATION_ERROR", 400, details),
  
  rateLimitExceeded: (retryAfter?: number) =>
    apiError(
      "Rate limit exceeded",
      "RATE_LIMIT_EXCEEDED",
      429,
      retryAfter ? { retryAfter } : undefined,
      retryAfter
        ? { "Retry-After": retryAfter.toString() }
        : undefined,
    ),
  
  serviceUnavailable: (message: string = "Service temporarily unavailable") =>
    apiError(message, "SERVICE_UNAVAILABLE", 503),
  
  internalError: (message: string = "Internal server error", details?: unknown) =>
    apiError(message, "INTERNAL_ERROR", 500, details),
  
  badRequest: (message: string = "Bad request", details?: unknown) =>
    apiError(message, "BAD_REQUEST", 400, details),
  
  conflict: (message: string = "Conflict", details?: unknown) =>
    apiError(message, "CONFLICT", 409, details),
  
  unprocessableEntity: (message: string = "Unprocessable entity", details?: unknown) =>
    apiError(message, "UNPROCESSABLE_ENTITY", 422, details),
};

/**
 * Type guard to check if response is an error
 */
export function isApiError(
  response: ApiResponse,
): response is ApiErrorResponse {
  return !response.success;
}

/**
 * Type guard to check if response is successful
 */
export function isApiSuccess<T>(
  response: ApiResponse<T>,
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Creates a successful API response payload (for use with jsonWithETag)
 */
export function apiSuccessPayload<T>(
  data: T,
  message?: string,
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}

/**
 * Creates an error API response payload (for use with jsonWithETag)
 */
export function apiErrorPayload(
  error: string,
  code?: ApiErrorCode,
  details?: unknown,
): ApiErrorResponse {
  return {
    success: false,
    error,
    ...(code && { code }),
    ...(details !== undefined && { details }),
  };
}
