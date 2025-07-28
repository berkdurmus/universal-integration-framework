import { ApiConfig, RateLimitConfig, RetryPolicy } from "@/types";

export interface ApiRequest {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ApiError {
  code: string;
  message: string;
  status?: number;
  response?: ApiResponse;
  retryable: boolean;
}

export interface RequestInterceptor {
  (request: ApiRequest): Promise<ApiRequest> | ApiRequest;
}

export interface ResponseInterceptor {
  (response: ApiResponse): Promise<ApiResponse> | ApiResponse;
}

export interface ErrorInterceptor {
  (error: ApiError): Promise<ApiError> | ApiError;
}

export interface RateLimitState {
  requests: number;
  windowStart: number;
  nextReset: number;
}
