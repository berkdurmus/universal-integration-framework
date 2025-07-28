import { OAuthProvider } from "../provider";
import {
  OAuthState,
  OAuthAuthorizationResult,
  OAuthTokenResult,
} from "../types";
import { OAuthConfig, OAuthTokens } from "@/types";

export class VercelOAuth extends OAuthProvider {
  private static readonly AUTH_URL = "https://vercel.com/oauth/authorize";
  private static readonly TOKEN_URL =
    "https://api.vercel.com/v2/oauth/access_token";
  private static readonly USER_URL = "https://api.vercel.com/v2/user";

  constructor(config: OAuthConfig) {
    const vercelConfig = {
      ...config,
      authUrl: config.authUrl || VercelOAuth.AUTH_URL,
      tokenUrl: config.tokenUrl || VercelOAuth.TOKEN_URL,
      userInfoUrl: config.userInfoUrl || VercelOAuth.USER_URL,
    };

    super("vercel", vercelConfig);
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
      tokenParams
    );

    const tokens = this.parseTokenResponse(response.data);
    const userInfo = await this.getUserInfo(tokens);

    return { tokens, userInfo };
  }

  async getUserInfo(tokens: OAuthTokens): Promise<any> {
    const response = await this.httpClient.get(this.config.userInfoUrl!, {
      headers: this.createAuthHeaders(tokens),
    });

    return response.data.user;
  }

  // Vercel-specific methods
  async getTeams(tokens: OAuthTokens): Promise<any[]> {
    const response = await this.httpClient.get(
      "https://api.vercel.com/v2/teams",
      {
        headers: this.createAuthHeaders(tokens),
      }
    );

    return response.data.teams;
  }

  async getProjects(tokens: OAuthTokens, teamId?: string): Promise<any[]> {
    let url = "https://api.vercel.com/v9/projects";
    if (teamId) {
      url += `?teamId=${teamId}`;
    }

    const response = await this.httpClient.get(url, {
      headers: this.createAuthHeaders(tokens),
    });

    return response.data.projects;
  }

  async getDeployments(
    tokens: OAuthTokens,
    options?: {
      teamId?: string;
      projectId?: string;
      limit?: number;
    }
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (options?.teamId) params.append("teamId", options.teamId);
    if (options?.projectId) params.append("projectId", options.projectId);
    if (options?.limit) params.append("limit", options.limit.toString());

    const response = await this.httpClient.get(
      `https://api.vercel.com/v6/deployments?${params.toString()}`,
      {
        headers: this.createAuthHeaders(tokens),
      }
    );

    return response.data.deployments;
  }

  async getEnvironmentVariables(
    tokens: OAuthTokens,
    projectId: string,
    teamId?: string
  ): Promise<any[]> {
    let url = `https://api.vercel.com/v9/projects/${projectId}/env`;
    if (teamId) {
      url += `?teamId=${teamId}`;
    }

    const response = await this.httpClient.get(url, {
      headers: this.createAuthHeaders(tokens),
    });

    return response.data.envs;
  }
}
