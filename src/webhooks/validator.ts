import crypto from "crypto";
import {
  WebhookPayload,
  WebhookValidationResult,
  SignatureMethod,
  WebhookSignatureValidator,
} from "./types";
import { WebhookConfig } from "@/types";

export class WebhookValidator {
  private signatureValidators: Map<SignatureMethod, WebhookSignatureValidator>;

  constructor() {
    this.signatureValidators = new Map([
      ["hmac-sha256", new HmacSha256Validator()],
      ["hmac-sha1", new HmacSha1Validator()],
    ]);
  }

  validate(
    payload: WebhookPayload,
    config: WebhookConfig
  ): WebhookValidationResult {
    try {
      // Basic validation
      if (!payload.body || !payload.headers) {
        return {
          isValid: false,
          error: "Missing required payload data",
        };
      }

      // Signature validation
      if (config.secret && payload.signature) {
        const isSignatureValid = this.validateSignature(
          payload,
          config.secret,
          config.signatureMethod || "hmac-sha256",
          config.signatureHeader || "x-hub-signature-256"
        );

        if (!isSignatureValid) {
          return {
            isValid: false,
            error: "Invalid signature",
          };
        }
      }

      // Extract event type
      const event = this.extractEventType(payload, config);

      // Check if event is supported
      if (config.events.length > 0 && event && !config.events.includes(event)) {
        return {
          isValid: false,
          error: `Unsupported event type: ${event}`,
        };
      }

      return {
        isValid: true,
        event,
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Validation error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  private validateSignature(
    payload: WebhookPayload,
    secret: string,
    method: SignatureMethod,
    signatureHeader: string
  ): boolean {
    const validator = this.signatureValidators.get(method);
    if (!validator) {
      throw new Error(`Unsupported signature method: ${method}`);
    }

    const receivedSignature = payload.headers[signatureHeader.toLowerCase()];
    if (!receivedSignature) {
      return false;
    }

    const rawBody =
      typeof payload.rawBody === "string"
        ? payload.rawBody
        : payload.rawBody.toString();

    return validator.validate(rawBody, receivedSignature, secret);
  }

  private extractEventType(
    payload: WebhookPayload,
    config: WebhookConfig
  ): string | undefined {
    // Common event header patterns
    const eventHeaders = [
      "x-github-event",
      "x-gitlab-event",
      "x-event-key",
      "x-event-type",
      "event-type",
    ];

    for (const header of eventHeaders) {
      const event = payload.headers[header.toLowerCase()];
      if (event) {
        return event;
      }
    }

    // Try to extract from payload body
    if (payload.body && typeof payload.body === "object") {
      return (
        payload.body.event_type ||
        payload.body.type ||
        payload.body.action ||
        payload.body.event
      );
    }

    return undefined;
  }

  generateSignature(
    payload: string,
    secret: string,
    method: SignatureMethod = "hmac-sha256"
  ): string {
    const validator = this.signatureValidators.get(method);
    if (!validator) {
      throw new Error(`Unsupported signature method: ${method}`);
    }

    return validator.generate(payload, secret);
  }
}

class HmacSha256Validator implements WebhookSignatureValidator {
  validate(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generate(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  generate(payload: string, secret: string): string {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    return `sha256=${hmac.digest("hex")}`;
  }
}

class HmacSha1Validator implements WebhookSignatureValidator {
  validate(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generate(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  generate(payload: string, secret: string): string {
    const hmac = crypto.createHmac("sha1", secret);
    hmac.update(payload);
    return `sha1=${hmac.digest("hex")}`;
  }
}
