import {
  WebhookPayload,
  WebhookProcessingResult,
  WebhookEventHandler,
  WebhookDelivery,
  WebhookRetryAttempt,
} from "./types";
import { WebhookConfig, IntegrationContext, RetryPolicy } from "@/types";
import { WebhookValidator } from "./validator";

export class WebhookProcessor {
  private validator: WebhookValidator;
  private eventHandlers: WebhookEventHandler;
  private deliveries: Map<string, WebhookDelivery>;

  constructor() {
    this.validator = new WebhookValidator();
    this.eventHandlers = {};
    this.deliveries = new Map();
  }

  /**
   * Register an event handler for a specific webhook event
   */
  on(
    event: string,
    handler: (
      payload: WebhookPayload,
      context: IntegrationContext
    ) => Promise<WebhookProcessingResult>
  ) {
    this.eventHandlers[event] = handler;
  }

  /**
   * Process an incoming webhook payload
   */
  async process(
    payload: WebhookPayload,
    config: WebhookConfig,
    context: IntegrationContext
  ): Promise<WebhookProcessingResult> {
    // Validate the webhook
    const validationResult = this.validator.validate(payload, config);

    if (!validationResult.isValid) {
      return {
        success: false,
        error: {
          code: "VALIDATION_FAILED",
          message: validationResult.error || "Webhook validation failed",
          retryable: false,
        },
      };
    }

    const event = validationResult.event;
    if (!event) {
      return {
        success: false,
        error: {
          code: "NO_EVENT_TYPE",
          message: "Could not determine event type from webhook payload",
          retryable: false,
        },
      };
    }

    // Find and execute handler
    const handler = this.eventHandlers[event] || this.eventHandlers["*"]; // '*' is a catch-all handler

    if (!handler) {
      return {
        success: false,
        error: {
          code: "NO_HANDLER",
          message: `No handler registered for event: ${event}`,
          retryable: false,
        },
      };
    }

    try {
      const result = await handler(payload, context);

      // Log successful delivery
      this.recordDelivery({
        id: this.generateDeliveryId(),
        url: config.endpoint,
        event,
        payload: payload.body,
        headers: payload.headers,
        timestamp: payload.timestamp,
        status: result.success ? "delivered" : "failed",
        attempts: [
          {
            attempt: 1,
            timestamp: new Date(),
            error: result.error?.message || "",
          },
        ],
      });

      return result;
    } catch (error) {
      const processingError = {
        code: "PROCESSING_ERROR",
        message:
          error instanceof Error ? error.message : "Unknown processing error",
        retryable: true,
        details: error,
      };

      // Log failed delivery
      this.recordDelivery({
        id: this.generateDeliveryId(),
        url: config.endpoint,
        event,
        payload: payload.body,
        headers: payload.headers,
        timestamp: payload.timestamp,
        status: "failed",
        attempts: [
          {
            attempt: 1,
            timestamp: new Date(),
            error: processingError.message,
          },
        ],
      });

      return {
        success: false,
        error: processingError,
        shouldRetry: true,
      };
    }
  }

  /**
   * Retry failed webhook processing with exponential backoff
   */
  async retry(
    deliveryId: string,
    payload: WebhookPayload,
    config: WebhookConfig,
    context: IntegrationContext
  ): Promise<WebhookProcessingResult> {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) {
      return {
        success: false,
        error: {
          code: "DELIVERY_NOT_FOUND",
          message: `Delivery ${deliveryId} not found`,
          retryable: false,
        },
      };
    }

    const retryPolicy = config.retryPolicy || this.getDefaultRetryPolicy();
    const attemptCount = delivery.attempts.length;

    if (attemptCount >= retryPolicy.maxRetries) {
      delivery.status = "failed";
      return {
        success: false,
        error: {
          code: "MAX_RETRIES_EXCEEDED",
          message: `Maximum retry attempts (${retryPolicy.maxRetries}) exceeded`,
          retryable: false,
        },
      };
    }

    // Calculate delay
    const delay = this.calculateRetryDelay(attemptCount, retryPolicy);

    // Wait for the calculated delay
    await this.sleep(delay);

    try {
      delivery.status = "retrying";
      const result = await this.process(payload, config, context);

      // Record retry attempt
      delivery.attempts.push({
        attempt: attemptCount + 1,
        timestamp: new Date(),
        error: result.error?.message || "",
        nextRetry: result.shouldRetry
          ? new Date(Date.now() + delay)
          : undefined,
      });

      if (result.success) {
        delivery.status = "delivered";
      } else if (!result.shouldRetry) {
        delivery.status = "failed";
      }

      return result;
    } catch (error) {
      const retryError = {
        code: "RETRY_FAILED",
        message: error instanceof Error ? error.message : "Retry failed",
        retryable: attemptCount < retryPolicy.maxRetries - 1,
      };

      delivery.attempts.push({
        attempt: attemptCount + 1,
        timestamp: new Date(),
        error: retryError.message,
        nextRetry: retryError.retryable
          ? new Date(Date.now() + delay)
          : undefined,
      });

      return {
        success: false,
        error: retryError,
        shouldRetry: retryError.retryable,
      };
    }
  }

  /**
   * Get delivery information
   */
  getDelivery(deliveryId: string): WebhookDelivery | undefined {
    return this.deliveries.get(deliveryId);
  }

  /**
   * Get all deliveries for debugging/monitoring
   */
  getAllDeliveries(): WebhookDelivery[] {
    return Array.from(this.deliveries.values());
  }

  private recordDelivery(delivery: WebhookDelivery): void {
    this.deliveries.set(delivery.id, delivery);
  }

  private generateDeliveryId(): string {
    return `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultRetryPolicy(): RetryPolicy {
    return {
      maxRetries: 3,
      backoffStrategy: "exponential",
      baseDelay: 1000, // 1 second
      maxDelay: 60000, // 1 minute
    };
  }

  private calculateRetryDelay(attempt: number, policy: RetryPolicy): number {
    if (policy.backoffStrategy === "linear") {
      return Math.min(policy.baseDelay * (attempt + 1), policy.maxDelay);
    } else {
      // Exponential backoff with jitter
      const exponentialDelay = policy.baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
      return Math.min(exponentialDelay + jitter, policy.maxDelay);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
