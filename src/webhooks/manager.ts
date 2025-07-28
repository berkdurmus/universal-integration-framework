import { WebhookProcessor } from "./processor";
import { WebhookValidator } from "./validator";
import {
  WebhookPayload,
  WebhookProcessingResult,
  WebhookEventHandler,
} from "./types";
import {
  WebhookConfig,
  IntegrationContext,
  IntegrationEvent,
  EventHandler,
} from "@/types";

export class WebhookManager {
  private processor: WebhookProcessor;
  private validator: WebhookValidator;
  private eventHandlers: Map<IntegrationEvent, EventHandler[]>;
  private configs: Map<string, WebhookConfig>;

  constructor() {
    this.processor = new WebhookProcessor();
    this.validator = new WebhookValidator();
    this.eventHandlers = new Map();
    this.configs = new Map();
  }

  /**
   * Register a webhook configuration
   */
  register(integrationId: string, config: WebhookConfig): void {
    this.configs.set(integrationId, config);
  }

  /**
   * Unregister a webhook configuration
   */
  unregister(integrationId: string): void {
    this.configs.delete(integrationId);
  }

  /**
   * Get webhook configuration for an integration
   */
  getConfig(integrationId: string): WebhookConfig | undefined {
    return this.configs.get(integrationId);
  }

  /**
   * Handle incoming webhook request
   */
  async handleWebhook(
    integrationId: string,
    headers: Record<string, string>,
    body: any,
    rawBody: string | Buffer,
    context: IntegrationContext
  ): Promise<WebhookProcessingResult> {
    const config = this.configs.get(integrationId);
    if (!config) {
      return {
        success: false,
        error: {
          code: "NO_CONFIG",
          message: `No webhook configuration found for integration: ${integrationId}`,
          retryable: false,
        },
      };
    }

    const payload: WebhookPayload = {
      headers: this.normalizeHeaders(headers),
      body,
      rawBody,
      timestamp: new Date(),
      signature: this.extractSignature(headers, config),
    };

    const result = await this.processor.process(payload, config, context);

    // Emit integration events
    if (result.success && result.event) {
      await this.emitEvent(
        "webhook.received",
        { event: result.event, data: result.data },
        context
      );
    } else if (!result.success) {
      await this.emitEvent("webhook.failed", { error: result.error }, context);
    }

    return result;
  }

  /**
   * Register webhook event handlers
   */
  onWebhookEvent(
    event: string,
    handler: (
      payload: WebhookPayload,
      context: IntegrationContext
    ) => Promise<WebhookProcessingResult>
  ): void {
    this.processor.on(event, handler);
  }

  /**
   * Register integration event handlers
   */
  on(event: IntegrationEvent, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Remove integration event handler
   */
  off(event: IntegrationEvent, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Validate webhook signature without processing
   */
  validateSignature(
    integrationId: string,
    payload: string,
    signature: string
  ): boolean {
    const config = this.configs.get(integrationId);
    if (!config || !config.secret) {
      return false;
    }

    try {
      const expectedSignature = this.validator.generateSignature(
        payload,
        config.secret,
        config.signatureMethod || "hmac-sha256"
      );

      return expectedSignature === signature;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate webhook signature for outgoing webhooks
   */
  generateSignature(integrationId: string, payload: string): string | null {
    const config = this.configs.get(integrationId);
    if (!config || !config.secret) {
      return null;
    }

    return this.validator.generateSignature(
      payload,
      config.secret,
      config.signatureMethod || "hmac-sha256"
    );
  }

  /**
   * Get webhook delivery information
   */
  getDeliveries(): any[] {
    return this.processor.getAllDeliveries();
  }

  /**
   * Get webhook delivery by ID
   */
  getDelivery(deliveryId: string): any {
    return this.processor.getDelivery(deliveryId);
  }

  private normalizeHeaders(
    headers: Record<string, string>
  ): Record<string, string> {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      normalized[key.toLowerCase()] = value;
    }
    return normalized;
  }

  private extractSignature(
    headers: Record<string, string>,
    config: WebhookConfig
  ): string | undefined {
    const signatureHeader = config.signatureHeader || "x-hub-signature-256";
    return headers[signatureHeader.toLowerCase()];
  }

  private async emitEvent(
    event: IntegrationEvent,
    data: any,
    context: IntegrationContext
  ): Promise<void> {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      await Promise.all(
        handlers.map((handler) =>
          Promise.resolve(handler(event, data, context)).catch((error: any) =>
            console.error(`Error in event handler for ${event}:`, error)
          )
        )
      );
    }
  }
}
