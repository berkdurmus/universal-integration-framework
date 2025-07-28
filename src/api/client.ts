import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { RateLimiter } from "@/api";
import {
  ApiRequest,
  ApiResponse,
  ApiError,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
} from "./types";
import { ApiConfig, RetryPolicy } from "@/types";

export class ApiClient {
  private httpClient: AxiosInstance;
  private rateLimiter?: RateLimiter;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor(private config: ApiConfig) {
    this.httpClient = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 10000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Universal-Integration-Framework/1.0",
        ...config.headers,
      },
    });

    if (config.rateLimit) {
      this.rateLimiter = new RateLimiter(config.rateLimit);
    }

    this.setupInterceptors();
  }

  async request<T = any>(request: ApiRequest): Promise<ApiResponse<T>> {
    // Apply rate limiting
    if (this.rateLimiter) {
      await this.rateLimiter.waitForSlot();
    }

    // Apply request interceptors
    let processedRequest = request;
    for (const interceptor of this.requestInterceptors) {
      processedRequest = await interceptor(processedRequest);
    }

    try {
      const axiosConfig: AxiosRequestConfig = {
        method: processedRequest.method.toLowerCase() as any,
        url: processedRequest.url,
        headers: processedRequest.headers,
        params: processedRequest.params,
        data: processedRequest.data,
        timeout: processedRequest.timeout || this.config.timeout,
      };

      const response = await this.executeWithRetry(axiosConfig);

      let apiResponse: ApiResponse<T> = {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: this.normalizeHeaders(response.headers),
      };

      // Apply response interceptors
      for (const interceptor of this.responseInterceptors) {
        apiResponse = await interceptor(apiResponse);
      }

      return apiResponse;
    } catch (error) {
      let apiError: ApiError = {
        code: "REQUEST_FAILED",
        message: error instanceof Error ? error.message : "Request failed",
        retryable: this.isRetryableError(error),
      };

      if (axios.isAxiosError(error) && error.response) {
        apiError = {
          code: `HTTP_${error.response.status}`,
          message: error.response.statusText || error.message,
          status: error.response.status,
          response: {
            data: error.response.data,
            status: error.response.status,
            statusText: error.response.statusText,
            headers: this.normalizeHeaders(error.response.headers),
          },
          retryable: this.isRetryableError(error),
        };
      }

      // Apply error interceptors
      for (const interceptor of this.errorInterceptors) {
        apiError = await interceptor(apiError);
      }

      throw apiError;
    }
  }

  async get<T = any>(
    url: string,
    config?: Partial<ApiRequest>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: "GET",
      url,
      ...config,
    });
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: Partial<ApiRequest>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: "POST",
      url,
      data,
      ...config,
    });
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: Partial<ApiRequest>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: "PUT",
      url,
      data,
      ...config,
    });
  }

  async delete<T = any>(
    url: string,
    config?: Partial<ApiRequest>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: "DELETE",
      url,
      ...config,
    });
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: Partial<ApiRequest>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: "PATCH",
      url,
      data,
      ...config,
    });
  }

  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  private async executeWithRetry(
    config: AxiosRequestConfig
  ): Promise<AxiosResponse> {
    const retryPolicy = this.config.retryPolicy || this.getDefaultRetryPolicy();
    let lastError: any;

    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        return await this.httpClient.request(config);
      } catch (error) {
        lastError = error;

        if (
          attempt === retryPolicy.maxRetries ||
          !this.isRetryableError(error)
        ) {
          throw error;
        }

        const delay = this.calculateRetryDelay(attempt, retryPolicy);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private isRetryableError(error: any): boolean {
    if (axios.isAxiosError(error)) {
      // Network errors
      if (!error.response) {
        return true;
      }

      // Retryable HTTP status codes
      const status = error.response.status;
      return status >= 500 || status === 429 || status === 408;
    }

    return false;
  }

  private calculateRetryDelay(attempt: number, policy: RetryPolicy): number {
    if (policy.backoffStrategy === "linear") {
      return Math.min(policy.baseDelay * (attempt + 1), policy.maxDelay);
    } else {
      // Exponential backoff with jitter
      const exponentialDelay = policy.baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 0.1 * exponentialDelay;
      return Math.min(exponentialDelay + jitter, policy.maxDelay);
    }
  }

  private getDefaultRetryPolicy(): RetryPolicy {
    return {
      maxRetries: 3,
      backoffStrategy: "exponential",
      baseDelay: 1000,
      maxDelay: 30000,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private normalizeHeaders(headers: any): Record<string, string> {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers || {})) {
      normalized[key.toLowerCase()] = String(value);
    }
    return normalized;
  }

  private setupInterceptors(): void {
    // Default request interceptor for authentication
    this.httpClient.interceptors.request.use(
      (config) => {
        // Add any default headers or authentication here
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Default response interceptor for common processing
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(error)
    );
  }
}
