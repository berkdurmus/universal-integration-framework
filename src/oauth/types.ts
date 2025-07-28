import { OAuthConfig, OAuthTokens, IntegrationContext } from "@/types";

export interface OAuthState {
  state: string;
  codeVerifier?: string; // For PKCE
  redirectUri: string;
  scopes: string[];
  userId?: string;
  metadata?: Record<string, any>;
}

export interface OAuthAuthorizationResult {
  authorizationUrl: string;
  state: string;
  codeVerifier?: string;
}

export interface OAuthTokenResult {
  tokens: OAuthTokens;
  userInfo?: any;
}

export interface OAuthRefreshResult {
  tokens: OAuthTokens;
}

export interface OAuthProvider {
  readonly name: string;
  readonly config: OAuthConfig;

  // Authorization flow
  getAuthorizationUrl(state: OAuthState): Promise<OAuthAuthorizationResult>;
  exchangeCodeForTokens(
    code: string,
    state: OAuthState
  ): Promise<OAuthTokenResult>;
  refreshTokens(
    refreshToken: string,
    context?: IntegrationContext
  ): Promise<OAuthRefreshResult>;
  revokeTokens(
    tokens: OAuthTokens,
    context?: IntegrationContext
  ): Promise<void>;

  // User info
  getUserInfo(tokens: OAuthTokens): Promise<any>;

  // Token validation
  validateTokens(tokens: OAuthTokens): Promise<boolean>;
}

export interface PKCEChallenge {
  codeChallenge: string;
  codeChallengeMethod: "S256";
  codeVerifier: string;
}
