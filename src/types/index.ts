import { z } from "zod";

// Base integration configuration
export interface IntegrationConfig {
  name: string;
  version: string;
  description?: string;
  provider: SupportedProvider;
  oauth?: OAuthConfig;
  webhooks?: WebhookConfig;
  api?: ApiConfig;
}

// Supported integration providers
export type SupportedProvider =
  | "github"
  | "vercel"
  | "netlify"
  | "slack"
  | "discord"
  | "custom";

// OAuth configuration
export interface OAuthConfig {
  clientId: string;
  clientSecret?: string; // Optional for PKCE flows
  redirectUri: string;
  scopes: string[];
  authUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  usePKCE?: boolean;
}

// OAuth flow types
export type OAuthFlow = "authorization_code" | "client_credentials" | "pkce";

// OAuth tokens
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string;
}

// Webhook configuration
export interface WebhookConfig {
  endpoint: string;
  secret?: string;
  events: string[];
  signatureHeader?: string;
  signatureMethod?: "hmac-sha256" | "hmac-sha1";
  retryPolicy?: RetryPolicy;
}

// Retry policy for failed webhooks
export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: "linear" | "exponential";
  baseDelay: number; // in milliseconds
  maxDelay: number;
}

// API configuration
export interface ApiConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  rateLimit?: RateLimitConfig;
}

// Rate limiting configuration
export interface RateLimitConfig {
  requests: number;
  window: number; // in milliseconds
  strategy: "sliding" | "fixed";
}

// Integration context passed to handlers
export interface IntegrationContext {
  userId?: string;
  organizationId?: string;
  installationId?: string;
  tokens?: OAuthTokens;
  metadata?: Record<string, any>;
}

// Integration event types
export type IntegrationEvent =
  | "oauth.authorized"
  | "oauth.refreshed"
  | "oauth.revoked"
  | "webhook.received"
  | "webhook.failed"
  | "api.request"
  | "api.error"
  | "integration.installed"
  | "integration.uninstalled";

// Event handler function
export type EventHandler<T = any> = (
  event: IntegrationEvent,
  data: T,
  context: IntegrationContext
) => Promise<void> | void;

// Integration result types
export interface IntegrationResult<T = any> {
  success: boolean;
  data?: T;
  error?: IntegrationError;
  metadata?: Record<string, any>;
}

// Error types
export interface IntegrationError {
  code: string;
  message: string;
  details?: any;
  retryable?: boolean;
}

// Marketplace-specific configurations
export interface MarketplaceConfig {
  provider: SupportedProvider;
  appId?: string;
  manifestUrl?: string;
  permissions?: string[];
  categories?: string[];
}

// Zod schemas for validation
export const IntegrationConfigSchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().optional(),
  provider: z.enum([
    "github",
    "vercel",
    "netlify",
    "slack",
    "discord",
    "custom",
  ]),
  oauth: z
    .object({
      clientId: z.string(),
      clientSecret: z.string().optional(),
      redirectUri: z.string().url(),
      scopes: z.array(z.string()),
      authUrl: z.string().url().optional(),
      tokenUrl: z.string().url().optional(),
      userInfoUrl: z.string().url().optional(),
      usePKCE: z.boolean().optional(),
    })
    .optional(),
  webhooks: z
    .object({
      endpoint: z.string().url(),
      secret: z.string().optional(),
      events: z.array(z.string()),
      signatureHeader: z.string().optional(),
      signatureMethod: z.enum(["hmac-sha256", "hmac-sha1"]).optional(),
      retryPolicy: z
        .object({
          maxRetries: z.number().min(0).max(10),
          backoffStrategy: z.enum(["linear", "exponential"]),
          baseDelay: z.number().min(100),
          maxDelay: z.number().min(1000),
        })
        .optional(),
    })
    .optional(),
  api: z
    .object({
      baseUrl: z.string().url(),
      headers: z.record(z.string()).optional(),
      timeout: z.number().min(1000).optional(),
      retryPolicy: z
        .object({
          maxRetries: z.number().min(0).max(10),
          backoffStrategy: z.enum(["linear", "exponential"]),
          baseDelay: z.number().min(100),
          maxDelay: z.number().min(1000),
        })
        .optional(),
      rateLimit: z
        .object({
          requests: z.number().min(1),
          window: z.number().min(1000),
          strategy: z.enum(["sliding", "fixed"]),
        })
        .optional(),
    })
    .optional(),
});

export type ValidatedIntegrationConfig = z.infer<
  typeof IntegrationConfigSchema
>;
