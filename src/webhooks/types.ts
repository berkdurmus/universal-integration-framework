import { WebhookConfig, IntegrationContext, IntegrationError } from "@/types";

export interface WebhookPayload {
  headers: Record<string, string>;
  body: any;
  rawBody: string | Buffer;
  timestamp: Date;
  signature?: string;
}

export interface WebhookValidationResult {
  isValid: boolean;
  error?: string;
  event?: string;
}

export interface WebhookProcessingResult {
  success: boolean;
  event?: string;
  data?: any;
  error?: IntegrationError;
  shouldRetry?: boolean;
}

export interface WebhookHandler {
  (
    payload: WebhookPayload,
    context: IntegrationContext
  ): Promise<WebhookProcessingResult>;
}

export interface WebhookEventHandler {
  [event: string]: WebhookHandler;
}

export interface WebhookRetryAttempt {
  attempt: number;
  timestamp: Date;
  error: string;
  nextRetry?: Date;
}

export interface WebhookDelivery {
  id: string;
  url: string;
  event: string;
  payload: any;
  headers: Record<string, string>;
  timestamp: Date;
  status: "pending" | "delivered" | "failed" | "retrying";
  attempts: WebhookRetryAttempt[];
  response?: {
    status: number;
    headers: Record<string, string>;
    body: string;
  };
}

export type SignatureMethod = "hmac-sha256" | "hmac-sha1";

export interface WebhookSignatureValidator {
  validate(payload: string, signature: string, secret: string): boolean;
  generate(payload: string, secret: string): string;
}
