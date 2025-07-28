import { OAuthProvider } from "../provider";
import {
  OAuthState,
  OAuthAuthorizationResult,
  OAuthTokenResult,
} from "../types";
import { OAuthConfig, OAuthTokens } from "@/types";

export class NetlifyOAuth extends OAuthProvider {
  private static readonly AUTH_URL = "https://app.netlify.com/authorize";
  private static readonly TOKEN_URL = "https://api.netlify.com/oauth/token";
  private static readonly USER_URL = "https://api.netlify.com/api/v1/user";

  constructor(config: OAuthConfig) {
    const netlifyConfig = {
      ...config,
      authUrl: config.authUrl || NetlifyOAuth.AUTH_URL,
      tokenUrl: config.tokenUrl || NetlifyOAuth.TOKEN_URL,
      userInfoUrl: config.userInfoUrl || NetlifyOAuth.USER_URL,
    };

    super("netlify", netlifyConfig);
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
      grant_type: "authorization_code",
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

    return response.data;
  }

  // Netlify-specific methods
  async getSites(tokens: OAuthTokens): Promise<any[]> {
    const response = await this.httpClient.get(
      "https://api.netlify.com/api/v1/sites",
      {
        headers: this.createAuthHeaders(tokens),
      }
    );

    return response.data;
  }

  async getDeploys(tokens: OAuthTokens, siteId: string): Promise<any[]> {
    const response = await this.httpClient.get(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
      {
        headers: this.createAuthHeaders(tokens),
      }
    );

    return response.data;
  }

  async getForms(tokens: OAuthTokens, siteId?: string): Promise<any[]> {
    let url = "https://api.netlify.com/api/v1/forms";
    if (siteId) {
      url = `https://api.netlify.com/api/v1/sites/${siteId}/forms`;
    }

    const response = await this.httpClient.get(url, {
      headers: this.createAuthHeaders(tokens),
    });

    return response.data;
  }

  async getEnvironmentVariables(
    tokens: OAuthTokens,
    siteId: string
  ): Promise<any[]> {
    const response = await this.httpClient.get(
      `https://api.netlify.com/api/v1/sites/${siteId}/env`,
      {
        headers: this.createAuthHeaders(tokens),
      }
    );

    return response.data;
  }
}
