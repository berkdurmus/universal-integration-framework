import { OAuthProvider } from "../provider";
import {
  OAuthState,
  OAuthAuthorizationResult,
  OAuthTokenResult,
} from "../types";
import { OAuthConfig, OAuthTokens, IntegrationContext } from "@/types";

export class GitHubOAuth extends OAuthProvider {
  private static readonly AUTH_URL = "https://github.com/login/oauth/authorize";
  private static readonly TOKEN_URL =
    "https://github.com/login/oauth/access_token";
  private static readonly USER_URL = "https://api.github.com/user";
  private static readonly REVOKE_URL =
    "https://api.github.com/applications/{client_id}/grant";

  constructor(config: OAuthConfig) {
    const githubConfig = {
      ...config,
      authUrl: config.authUrl || GitHubOAuth.AUTH_URL,
      tokenUrl: config.tokenUrl || GitHubOAuth.TOKEN_URL,
      userInfoUrl: config.userInfoUrl || GitHubOAuth.USER_URL,
    };

    super("github", githubConfig);
  }

  async getAuthorizationUrl(
    state: OAuthState
  ): Promise<OAuthAuthorizationResult> {
    const authState = this.generateState();

    const params: Record<string, string> = {
      client_id: this.config.clientId,
      redirect_uri: state.redirectUri,
      scope: state.scopes.join(" "),
      state: authState,
      response_type: "code",
    };

    // GitHub supports PKCE but it's optional
    let codeVerifier: string | undefined;
    if (this.config.usePKCE) {
      const pkce = this.generatePKCEChallenge();
      params.code_challenge = pkce.codeChallenge;
      params.code_challenge_method = pkce.codeChallengeMethod;
      codeVerifier = pkce.codeVerifier;
    }

    const authorizationUrl = this.buildAuthUrl(this.config.authUrl!, params);

    return {
      authorizationUrl,
      state: authState,
      codeVerifier,
    };
  }

  async exchangeCodeForTokens(
    code: string,
    state: OAuthState
  ): Promise<OAuthTokenResult> {
    const tokenParams: any = {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: state.redirectUri,
    };

    if (state.codeVerifier) {
      tokenParams.code_verifier = state.codeVerifier;
    }

    const response = await this.httpClient.post(
      this.config.tokenUrl!,
      tokenParams,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    const tokens = this.parseTokenResponse(response.data);
    const userInfo = await this.getUserInfo(tokens);

    return { tokens, userInfo };
  }

  async getUserInfo(tokens: OAuthTokens): Promise<any> {
    const response = await this.httpClient.get(this.config.userInfoUrl!, {
      headers: this.createAuthHeaders(tokens),
    });

    return response.data;
  }

  async revokeTokens(
    tokens: OAuthTokens,
    context?: IntegrationContext
  ): Promise<void> {
    const revokeUrl = GitHubOAuth.REVOKE_URL.replace(
      "{client_id}",
      this.config.clientId
    );

    await this.httpClient.delete(revokeUrl, {
      headers: {
        ...this.createAuthHeaders(tokens),
        Accept: "application/vnd.github.v3+json",
      },
      data: {
        access_token: tokens.accessToken,
      },
    });
  }

  // GitHub-specific methods
  async getRepositories(
    tokens: OAuthTokens,
    options?: {
      type?: "all" | "owner" | "public" | "private" | "member";
      sort?: "created" | "updated" | "pushed" | "full_name";
      direction?: "asc" | "desc";
      per_page?: number;
      page?: number;
    }
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (options?.type) params.append("type", options.type);
    if (options?.sort) params.append("sort", options.sort);
    if (options?.direction) params.append("direction", options.direction);
    if (options?.per_page)
      params.append("per_page", options.per_page.toString());
    if (options?.page) params.append("page", options.page.toString());

    const response = await this.httpClient.get(
      `https://api.github.com/user/repos?${params.toString()}`,
      {
        headers: {
          ...this.createAuthHeaders(tokens),
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    return response.data;
  }

  async getOrganizations(tokens: OAuthTokens): Promise<any[]> {
    const response = await this.httpClient.get(
      "https://api.github.com/user/orgs",
      {
        headers: {
          ...this.createAuthHeaders(tokens),
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    return response.data;
  }
}
