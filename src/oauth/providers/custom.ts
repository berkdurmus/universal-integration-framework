import { OAuthProvider } from "../provider";
import {
  OAuthState,
  OAuthAuthorizationResult,
  OAuthTokenResult,
} from "../types";
import { OAuthConfig, OAuthTokens } from "@/types";

export class CustomOAuth extends OAuthProvider {
  constructor(name: string, config: OAuthConfig) {
    if (!config.authUrl || !config.tokenUrl) {
      throw new Error("Custom OAuth provider requires authUrl and tokenUrl");
    }

    super(name, config);
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

    // Support for PKCE
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
      grant_type: "authorization_code",
      client_id: this.config.clientId,
      code,
      redirect_uri: state.redirectUri,
    };

    // Include client secret if not using PKCE
    if (!this.config.usePKCE && this.config.clientSecret) {
      tokenParams.client_secret = this.config.clientSecret;
    }

    // Include code verifier for PKCE
    if (state.codeVerifier) {
      tokenParams.code_verifier = state.codeVerifier;
    }

    const response = await this.httpClient.post(
      this.config.tokenUrl!,
      tokenParams
    );

    const tokens = this.parseTokenResponse(response.data);

    // Get user info if URL is provided
    let userInfo;
    if (this.config.userInfoUrl) {
      userInfo = await this.getUserInfo(tokens);
    }

    return { tokens, userInfo };
  }

  async getUserInfo(tokens: OAuthTokens): Promise<any> {
    if (!this.config.userInfoUrl) {
      throw new Error("User info URL not configured for custom provider");
    }

    const response = await this.httpClient.get(this.config.userInfoUrl, {
      headers: this.createAuthHeaders(tokens),
    });

    return response.data;
  }
}
