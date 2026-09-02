export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface SuccessResponse<T = any> {
  success: true;
  message: string;
  data: T;
}

export interface ErrorResponse {
  success: false;
  message: string | string[];
  error: string | string[];
  statusCode: number;
  code?: string;
  errors?: unknown[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationResult<T, S = Record<string, unknown>> {
  items: T[];
  meta: PaginationMeta;
  stats?: S;
}
