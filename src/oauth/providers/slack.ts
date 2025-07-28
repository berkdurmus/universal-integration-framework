import { OAuthProvider } from "../provider";
import {
  OAuthState,
  OAuthAuthorizationResult,
  OAuthTokenResult,
} from "../types";
import { OAuthConfig, OAuthTokens } from "@/types";

export class SlackOAuth extends OAuthProvider {
  private static readonly AUTH_URL = "https://slack.com/oauth/v2/authorize";
  private static readonly TOKEN_URL = "https://slack.com/api/oauth.v2.access";
  private static readonly USER_URL = "https://slack.com/api/users.identity";
  private static readonly REVOKE_URL = "https://slack.com/api/auth.revoke";

  constructor(config: OAuthConfig) {
    const slackConfig = {
      ...config,
      authUrl: config.authUrl || SlackOAuth.AUTH_URL,
      tokenUrl: config.tokenUrl || SlackOAuth.TOKEN_URL,
      userInfoUrl: config.userInfoUrl || SlackOAuth.USER_URL,
    };

    super("slack", slackConfig);
  }

  async getAuthorizationUrl(
    state: OAuthState
  ): Promise<OAuthAuthorizationResult> {
    const authState = this.generateState();

    const params: Record<string, string> = {
      client_id: this.config.clientId,
      redirect_uri: state.redirectUri,
      scope: state.scopes.join(","),
      state: authState,
      response_type: "code",
    };

    const authorizationUrl = this.buildAuthUrl(this.config.authUrl!, params);

    return {
      authorizationUrl,
      state: authState,
    };
  }

  async exchangeCodeForTokens(
    code: string,
    state: OAuthState
  ): Promise<OAuthTokenResult> {
    const tokenParams = {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: state.redirectUri,
    };

    const response = await this.httpClient.post(
      this.config.tokenUrl!,
      tokenParams,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (!response.data.ok) {
      throw new Error(`Slack OAuth error: ${response.data.error}`);
    }

    // Slack returns a different token structure
    const tokens = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      tokenType: "Bearer",
      scope: response.data.scope,
    };

    const userInfo = await this.getUserInfo(tokens);

    return { tokens, userInfo };
  }

  async getUserInfo(tokens: OAuthTokens): Promise<any> {
    const response = await this.httpClient.get(this.config.userInfoUrl!, {
      headers: this.createAuthHeaders(tokens),
    });

    if (!response.data.ok) {
      throw new Error(`Slack API error: ${response.data.error}`);
    }

    return response.data.user;
  }

  async revokeTokens(tokens: OAuthTokens): Promise<void> {
    await this.httpClient.post(
      SlackOAuth.REVOKE_URL,
      { token: tokens.accessToken },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...this.createAuthHeaders(tokens),
        },
      }
    );
  }

  // Slack-specific methods
  async getChannels(
    tokens: OAuthTokens,
    options?: {
      exclude_archived?: boolean;
      limit?: number;
      cursor?: string;
    }
  ): Promise<any> {
    const params = new URLSearchParams();
    if (options?.exclude_archived) params.append("exclude_archived", "true");
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.cursor) params.append("cursor", options.cursor);

    const response = await this.httpClient.get(
      `https://slack.com/api/conversations.list?${params.toString()}`,
      {
        headers: this.createAuthHeaders(tokens),
      }
    );

    return response.data;
  }

  async getTeamInfo(tokens: OAuthTokens): Promise<any> {
    const response = await this.httpClient.get(
      "https://slack.com/api/team.info",
      {
        headers: this.createAuthHeaders(tokens),
      }
    );

    return response.data;
  }

  async postMessage(
    tokens: OAuthTokens,
    channel: string,
    text: string,
    options?: {
      blocks?: any[];
      attachments?: any[];
      thread_ts?: string;
    }
  ): Promise<any> {
    const message = {
      channel,
      text,
      ...options,
    };

    const response = await this.httpClient.post(
      "https://slack.com/api/chat.postMessage",
      message,
      {
        headers: this.createAuthHeaders(tokens),
      }
    );

    return response.data;
  }
}
