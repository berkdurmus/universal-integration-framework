import { OAuthTokens, IntegrationContext } from "@/types";
import { WebhookPayload } from "@/webhooks/types";

export class MockProvider {
  static createMockTokens(overrides?: Partial<OAuthTokens>): OAuthTokens {
    return {
      accessToken: "mock_access_token_12345",
      refreshToken: "mock_refresh_token_67890",
      tokenType: "Bearer",
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      scope: "read write",
      ...overrides,
    };
  }

  static createMockContext(
    overrides?: Partial<IntegrationContext>
  ): IntegrationContext {
    return {
      userId: "mock_user_123",
      organizationId: "mock_org_456",
      installationId: "mock_install_789",
      metadata: { source: "test" },
      ...overrides,
    };
  }

  static createMockWebhookPayload(
    event: string,
    data: any,
    overrides?: Partial<WebhookPayload>
  ): WebhookPayload {
    const payload = JSON.stringify(data);

    return {
      headers: {
        "content-type": "application/json",
        "x-event-type": event,
        "x-signature": "mock_signature",
        ...overrides?.headers,
      },
      body: data,
      rawBody: payload,
      timestamp: new Date(),
      signature: "mock_signature",
      ...overrides,
    };
  }

  static createGitHubPushPayload(): any {
    return {
      ref: "refs/heads/main",
      commits: [
        {
          id: "abc123def456789",
          message: "Add new feature",
          author: {
            name: "John Doe",
            email: "john@example.com",
          },
          timestamp: new Date().toISOString(),
        },
      ],
      repository: {
        id: 123456,
        name: "test-repo",
        full_name: "user/test-repo",
        private: false,
      },
      pusher: {
        name: "john",
        email: "john@example.com",
      },
    };
  }

  static createVercelDeploymentPayload(
    state: "BUILDING" | "READY" | "ERROR" = "READY"
  ): any {
    return {
      id: "dpl_mock_deployment_123",
      name: "my-app",
      url: "my-app-git-main-user.vercel.app",
      state,
      createdAt: new Date().toISOString(),
      project: {
        id: "prj_mock_project_456",
        name: "my-app",
      },
      ...(state === "ERROR" && {
        error: {
          message: "Build failed: Module not found",
          code: "BUILD_ERROR",
        },
      }),
    };
  }

  static createSlackMessagePayload(): any {
    return {
      token: "mock_token",
      team_id: "T123456",
      api_app_id: "A123456",
      event: {
        type: "message",
        channel: "C123456",
        user: "U123456",
        text: "Hello world!",
        ts: "1234567890.123456",
      },
      type: "event_callback",
      event_id: "Ev123456",
      event_time: Date.now(),
    };
  }

  static createNetlifyDeployPayload(
    state: "building" | "ready" | "error" = "ready"
  ): any {
    return {
      id: "deploy_mock_123",
      site_id: "site_mock_456",
      name: "my-netlify-site",
      url: "https://my-netlify-site.netlify.app",
      deploy_url: "https://deploy-abc123--my-netlify-site.netlify.app",
      state,
      created_at: new Date().toISOString(),
      ...(state === "ready" && {
        published_at: new Date().toISOString(),
      }),
      ...(state === "error" && {
        error_message: "Build failed",
      }),
    };
  }

  static async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static mockFetch(responses: Record<string, any>) {
    const originalFetch = global.fetch;

    global.fetch = jest.fn((url: string) => {
      const response = responses[url];
      if (response) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(response),
          text: () => Promise.resolve(JSON.stringify(response)),
        } as Response);
      }

      return Promise.reject(new Error(`No mock response for ${url}`));
    }) as jest.Mock;

    return () => {
      global.fetch = originalFetch;
    };
  }
}
