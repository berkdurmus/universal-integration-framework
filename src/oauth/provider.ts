import crypto from "crypto";
import axios, { AxiosInstance } from "axios";
import {
  OAuthProvider as IOAuthProvider,
  OAuthState,
  OAuthAuthorizationResult,
  OAuthTokenResult,
  OAuthRefreshResult,
  PKCEChallenge,
} from "./types";
import { OAuthConfig, OAuthTokens, IntegrationContext } from "@/types";

export abstract class OAuthProvider implements IOAuthProvider {
  protected httpClient: AxiosInstance;

  constructor(
    public readonly name: string,
    public readonly config: OAuthConfig
  ) {
    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Universal-Integration-Framework/1.0",
      },
    });
  }

  abstract getAuthorizationUrl(
    state: OAuthState
  ): Promise<OAuthAuthorizationResult>;
  abstract exchangeCodeForTokens(
    code: string,
    state: OAuthState
  ): Promise<OAuthTokenResult>;
  abstract getUserInfo(tokens: OAuthTokens): Promise<any>;

  async refreshTokens(
    refreshToken: string,
    context?: IntegrationContext
  ): Promise<OAuthRefreshResult> {
    if (!this.config.tokenUrl) {
      throw new Error(`Token URL not configured for ${this.name} provider`);
    }

    const response = await this.httpClient.post(this.config.tokenUrl, {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    const tokens = this.parseTokenResponse(response.data);
    return { tokens };
  }

  async revokeTokens(
    tokens: OAuthTokens,
    context?: IntegrationContext
  ): Promise<void> {
    // Default implementation - providers can override
    // Most providers have a revoke endpoint
  }

  async validateTokens(tokens: OAuthTokens): Promise<boolean> {
    try {
      if (tokens.expiresAt && new Date() >= tokens.expiresAt) {
        return false;
      }

      // Try to get user info to validate token
      await this.getUserInfo(tokens);
      return true;
    } catch (error) {
      return false;
    }
  }

  protected generatePKCEChallenge(): PKCEChallenge {
    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: "S256",
    };
  }

  protected generateState(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  protected buildAuthUrl(
    baseUrl: string,
    params: Record<string, string>
  ): string {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    return url.toString();
  }

  protected parseTokenResponse(data: any): OAuthTokens {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      tokenType: data.token_type || "Bearer",
      scope: data.scope,
    };
  }

  protected createAuthHeaders(tokens: OAuthTokens): Record<string, string> {
    return {
      Authorization: `${tokens.tokenType || "Bearer"} ${tokens.accessToken}`,
    };
  }
}
