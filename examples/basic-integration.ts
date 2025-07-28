import { Integration } from "../src";

// Basic GitHub integration example
async function basicGitHubIntegration() {
  console.log("🚀 Basic GitHub Integration Example");

  // Create integration configuration
  const integration = new Integration({
    name: "my-github-app",
    version: "1.0.0",
    description: "A simple GitHub integration",
    provider: "github",
    oauth: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      redirectUri: "http://localhost:3000/callback",
      scopes: ["repo", "user:email"],
    },
    webhooks: {
      endpoint: "http://localhost:3000/webhooks",
      secret: process.env.GITHUB_WEBHOOK_SECRET!,
      events: ["push", "pull_request"],
      signatureMethod: "hmac-sha256",
    },
  });

  const context = {
    userId: "user123",
    organizationId: "org456",
  };

  try {
    // 1. Initialize OAuth flow
    console.log("📝 Initializing OAuth flow...");
    const oauthResult = await integration.initializeOAuth(context);

    if (oauthResult.success) {
      console.log("✅ OAuth URL generated:", oauthResult.data?.authUrl);
      console.log("🔐 State:", oauthResult.data?.state);
    }

    // 2. Simulate OAuth callback (in real app, this would be handled by your callback endpoint)
    console.log("\n🔄 Simulating OAuth callback...");
    const mockCode = "mock_authorization_code";
    const mockState = oauthResult.data?.state || "mock_state";

    const tokenResult = await integration.completeOAuth(
      mockCode,
      mockState,
      context
    );

    if (tokenResult.success) {
      console.log("✅ OAuth completed successfully!");
      console.log("👤 User info:", tokenResult.data?.userInfo?.login);
    }

    // 3. Handle webhook (simulate)
    console.log("\n📡 Simulating webhook...");
    const mockWebhookPayload = JSON.stringify({
      action: "opened",
      pull_request: {
        id: 123,
        title: "Add new feature",
        user: { login: "developer" },
      },
    });

    const webhookResult = await integration.handleWebhook(
      {
        "x-github-event": "pull_request",
        "x-hub-signature-256": "sha256=mock_signature",
      },
      JSON.parse(mockWebhookPayload),
      mockWebhookPayload,
      context
    );

    if (webhookResult.success) {
      console.log("✅ Webhook processed successfully!");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run the example
if (require.main === module) {
  basicGitHubIntegration().catch(console.error);
}

export { basicGitHubIntegration };
