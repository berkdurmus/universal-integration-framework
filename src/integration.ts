import {
  IntegrationConfig,
  IntegrationContext,
  IntegrationResult,
  IntegrationEvent,
  EventHandler,
  OAuthTokens,
  ValidatedIntegrationConfig,
  IntegrationConfigSchema,
} from "@/types";
import { WebhookManager } from "@/webhooks";
import {
  OAuthProvider,
  GitHubOAuth,
  VercelOAuth,
  NetlifyOAuth,
  SlackOAuth,
  CustomOAuth,
} from "@/oauth";

export class Integration {
  private config: ValidatedIntegrationConfig;
  private oauthProvider?: OAuthProvider;
  private webhookManager: WebhookManager;
  private eventHandlers: Map<IntegrationEvent, EventHandler[]>;

  constructor(config: IntegrationConfig) {
    // Validate configuration using Zod schema
    const validationResult = IntegrationConfigSchema.safeParse(config);
    if (!validationResult.success) {
      throw new Error(
        `Invalid integration configuration: ${validationResult.error.message}`
      );
    }

    this.config = validationResult.data;
    this.webhookManager = new WebhookManager();
    this.eventHandlers = new Map();

    this.initializeOAuthProvider();
    this.initializeWebhooks();
  }

  /**
   * Get the integration configuration
   */
  getConfig(): ValidatedIntegrationConfig {
    return { ...this.config };
  }

  /**
   * Initialize OAuth flow for user authorization
   */
  async initializeOAuth(
    context: IntegrationContext
  ): Promise<IntegrationResult<{ authUrl: string; state: string }>> {
    if (!this.config.oauth || !this.oauthProvider) {
      return {
        success: false,
        error: {
          code: "OAUTH_NOT_CONFIGURED",
          message: "OAuth is not configured for this integration",
          retryable: false,
        },
      };
    }

    try {
      const result = await this.oauthProvider.getAuthorizationUrl({
        state: this.generateState(),
        redirectUri: this.config.oauth.redirectUri,
        scopes: this.config.oauth.scopes,
        userId: context.userId,
        metadata: context.metadata,
      });

      await this.emitEvent("oauth.authorized", result, context);

      return {
        success: true,
        data: {
          authUrl: result.authorizationUrl,
          state: result.state,
        },
      };
    } catch (error) {
      const oauthError = {
        code: "OAUTH_INIT_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "OAuth initialization failed",
        retryable: true,
        details: error,
      };

      return {
        success: false,
        error: oauthError,
      };
    }
  }

  /**
   * Complete OAuth flow by exchanging authorization code for tokens
   */
  async completeOAuth(
    code: string,
    state: string,
    context: IntegrationContext
  ): Promise<IntegrationResult<{ tokens: OAuthTokens; userInfo?: any }>> {
    if (!this.config.oauth || !this.oauthProvider) {
      return {
        success: false,
        error: {
          code: "OAUTH_NOT_CONFIGURED",
          message: "OAuth is not configured for this integration",
          retryable: false,
        },
      };
    }

    try {
      const oauthState = {
        state,
        redirectUri: this.config.oauth.redirectUri,
        scopes: this.config.oauth.scopes,
        userId: context.userId,
        metadata: context.metadata,
      };

      const result = await this.oauthProvider.exchangeCodeForTokens(
        code,
        oauthState
      );

      await this.emitEvent(
        "oauth.authorized",
        { tokens: result.tokens, userInfo: result.userInfo },
        context
      );

      return {
        success: true,
        data: {
          tokens: result.tokens,
          userInfo: result.userInfo,
        },
      };
    } catch (error) {
      const oauthError = {
        code: "OAUTH_EXCHANGE_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "OAuth token exchange failed",
        retryable: true,
        details: error,
      };

      return {
        success: false,
        error: oauthError,
      };
    }
  }

  /**
   * Refresh OAuth tokens
   */
  async refreshTokens(
    refreshToken: string,
    context: IntegrationContext
  ): Promise<IntegrationResult<OAuthTokens>> {
    if (!this.oauthProvider) {
      return {
        success: false,
        error: {
          code: "OAUTH_NOT_CONFIGURED",
          message: "OAuth is not configured for this integration",
          retryable: false,
        },
      };
    }

    try {
      const result = await this.oauthProvider.refreshTokens(
        refreshToken,
        context
      );

      await this.emitEvent(
        "oauth.refreshed",
        { tokens: result.tokens },
        context
      );

      return {
        success: true,
        data: result.tokens,
      };
    } catch (error) {
      const refreshError = {
        code: "TOKEN_REFRESH_FAILED",
        message:
          error instanceof Error ? error.message : "Token refresh failed",
        retryable: true,
        details: error,
      };

      return {
        success: false,
        error: refreshError,
      };
    }
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(
    headers: Record<string, string>,
    body: any,
    rawBody: string | Buffer,
    context: IntegrationContext
  ): Promise<IntegrationResult> {
    if (!this.config.webhooks) {
      return {
        success: false,
        error: {
          code: "WEBHOOKS_NOT_CONFIGURED",
          message: "Webhooks are not configured for this integration",
          retryable: false,
        },
      };
    }

    try {
      const result = await this.webhookManager.handleWebhook(
        this.config.name,
        headers,
        body,
        rawBody,
        context
      );

      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      const webhookError = {
        code: "WEBHOOK_PROCESSING_FAILED",
        message:
          error instanceof Error ? error.message : "Webhook processing failed",
        retryable: true,
        details: error,
      };

      return {
        success: false,
        error: webhookError,
      };
    }
  }

  /**
   * Register event handler
   */
  on(event: IntegrationEvent, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Remove event handler
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
   * Get OAuth provider instance for advanced usage
   */
  getOAuthProvider(): OAuthProvider | undefined {
    return this.oauthProvider;
  }

  /**
   * Get webhook manager instance for advanced usage
   */
  getWebhookManager(): WebhookManager {
    return this.webhookManager;
  }

  private initializeOAuthProvider(): void {
    if (!this.config.oauth) {
      return;
    }

    switch (this.config.provider) {
      case "github":
        this.oauthProvider = new GitHubOAuth(this.config.oauth);
        break;
      case "vercel":
        this.oauthProvider = new VercelOAuth(this.config.oauth);
        break;
      case "netlify":
        this.oauthProvider = new NetlifyOAuth(this.config.oauth);
        break;
      case "slack":
        this.oauthProvider = new SlackOAuth(this.config.oauth);
        break;
      case "custom":
        this.oauthProvider = new CustomOAuth(
          this.config.name,
          this.config.oauth
        );
        break;
      default:
        throw new Error(`Unsupported OAuth provider: ${this.config.provider}`);
    }
  }

  private initializeWebhooks(): void {
    if (!this.config.webhooks) {
      return;
    }

    this.webhookManager.register(this.config.name, this.config.webhooks);
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
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
