import {
  ApiResponse,
  SuccessResponse,
  ErrorResponse,
  PaginationResult,
} from 'src/types';

/**
 * Builders for the standard response envelope: `{ success, message, data }`.
 * Controllers return the output of one of these; `ResponseInterceptor` then
 * localizes `message` and wraps any bare value that slipped through.
 */
export class ResponseHelper {
  static success<T>(
    data: T,
    message = 'Operation completed successfully',
  ): SuccessResponse<T> {
    return { success: true, message, data };
  }

  static successMessage(message: string): ApiResponse<null> {
    return { success: true, message, data: null };
  }

  static created<T>(
    data: T,
    message = 'Resource created successfully',
  ): SuccessResponse<T> {
    return { success: true, message, data };
  }

  static updated<T>(
    data: T,
    message = 'Resource updated successfully',
  ): SuccessResponse<T> {
    return { success: true, message, data };
  }

  static deleted(message = 'Resource deleted successfully'): ApiResponse<null> {
    return { success: true, message, data: null };
  }

  static paginated<T>(
    result: PaginationResult<T>,
    message = 'Data retrieved successfully',
  ): SuccessResponse<PaginationResult<T>> {
    return { success: true, message, data: result };
  }

  static authenticated<T>(
    data: T,
    message = 'Authentication successful',
  ): SuccessResponse<T> {
    return { success: true, message, data };
  }

  static error(
    message: string,
    error: string = message,
    statusCode = 400,
  ): ErrorResponse {
    return { success: false, message, error, statusCode };
  }
}
