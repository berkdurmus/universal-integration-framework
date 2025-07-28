import { Integration } from "../src";

// Demo integration that works without real API credentials
async function demoIntegration() {
  console.log("🎯 Universal Integration Framework Demo");
  console.log("=====================================\n");

  // Create integration with mock credentials
  const integration = new Integration({
    name: "demo-github-app",
    version: "1.0.0",
    description: "Demo GitHub integration (no real credentials needed)",
    provider: "github",
    oauth: {
      clientId: "demo_client_id_12345",
      clientSecret: "demo_client_secret_67890",
      redirectUri: "http://localhost:3000/callback",
      scopes: ["repo", "user:email"],
    },
    webhooks: {
      endpoint: "http://localhost:3000/webhooks",
      secret: "demo_webhook_secret",
      events: ["push", "pull_request"],
      signatureMethod: "hmac-sha256",
    },
  });

  const context = {
    userId: "demo_user_123",
    organizationId: "demo_org_456",
  };

  console.log("✅ Integration created successfully!");
  console.log(`📦 Name: ${integration.getConfig().name}`);
  console.log(`🔧 Provider: ${integration.getConfig().provider}`);
  console.log(
    `🔐 OAuth Scopes: ${integration.getConfig().oauth?.scopes.join(", ")}`
  );
  console.log(
    `📡 Webhook Events: ${integration
      .getConfig()
      .webhooks?.events.join(", ")}\n`
  );

  // Register event handlers
  integration.on("oauth.authorized", async (event, data, context) => {
    console.log("🎉 OAuth Event: User authorized!");
    console.log(`   User ID: ${context.userId}`);
  });

  integration.on("webhook.received", async (event, data, context) => {
    console.log("📡 Webhook Event: Received webhook");
    console.log(`   Event Type: ${data.event}`);
  });

  const webhookManager = integration.getWebhookManager();

  webhookManager.onWebhookEvent("push", async (payload, context) => {
    const pushData = payload.body;
    console.log("📦 Push Event Handler:");
    console.log(`   Repository: ${pushData.repository.name}`);
    console.log(`   Branch: ${pushData.ref}`);
    console.log(`   Commits: ${pushData.commits.length}`);

    return { success: true, event: "push", data: pushData };
  });

  webhookManager.onWebhookEvent("pull_request", async (payload, context) => {
    const prData = payload.body;
    console.log("🔀 Pull Request Event Handler:");
    console.log(`   Action: ${prData.action}`);
    console.log(
      `   PR #${prData.pull_request.number}: ${prData.pull_request.title}`
    );
    console.log(`   Author: ${prData.pull_request.user.login}`);

    return { success: true, event: "pull_request", data: prData };
  });

  try {
    // 1. Test OAuth initialization
    console.log("🔄 Testing OAuth Flow...");
    const oauthResult = await integration.initializeOAuth(context);

    if (oauthResult.success) {
      console.log("✅ OAuth URL generated:");
      console.log(`   ${oauthResult.data?.authUrl?.substring(0, 80)}...`);
      console.log(`🔑 State: ${oauthResult.data?.state}\n`);
    }

    // 2. Test webhook processing
    console.log("🌊 Testing Webhook Processing...\n");

    // Simulate push event
    const pushPayload = JSON.stringify({
      ref: "refs/heads/main",
      commits: [
        {
          id: "abc123def456",
          message: "Add awesome new feature",
          author: { name: "John Developer", email: "john@example.com" },
        },
        {
          id: "def456ghi789",
          message: "Fix critical bug",
          author: { name: "Jane Coder", email: "jane@example.com" },
        },
      ],
      repository: {
        name: "awesome-project",
        full_name: "demo-org/awesome-project",
      },
    });

    const pushResult = await integration.handleWebhook(
      {
        "x-github-event": "push",
        "x-hub-signature-256": "sha256=demo_signature",
        "content-type": "application/json",
      },
      JSON.parse(pushPayload),
      pushPayload,
      context
    );

    if (pushResult.success) {
      console.log("✅ Push webhook processed successfully!\n");
    }

    // Simulate pull request event
    const prPayload = JSON.stringify({
      action: "opened",
      pull_request: {
        number: 42,
        title: "Implement user dashboard",
        user: { login: "contributor123" },
        base: { ref: "main" },
        head: { ref: "feature/user-dashboard" },
      },
    });

    const prResult = await integration.handleWebhook(
      {
        "x-github-event": "pull_request",
        "x-hub-signature-256": "sha256=demo_signature",
        "content-type": "application/json",
      },
      JSON.parse(prPayload),
      prPayload,
      context
    );

    if (prResult.success) {
      console.log("✅ Pull request webhook processed successfully!\n");
    }

    // 3. Show framework capabilities
    console.log("🚀 Framework Capabilities Demonstrated:");
    console.log("=====================================");
    console.log("✅ OAuth 2.0 flow initialization");
    console.log("✅ Type-safe configuration with Zod validation");
    console.log("✅ Event-driven architecture");
    console.log("✅ Webhook signature validation (simulated)");
    console.log("✅ Multi-platform support (GitHub, Vercel, Netlify, Slack)");
    console.log("✅ Custom OAuth provider support");
    console.log("✅ Comprehensive error handling");
    console.log("✅ Full TypeScript support\n");

    console.log("=======================================");
    console.log("• Build OAuth applications for developers");
    console.log("• Create seamless integration experiences");
    console.log("• Handle webhook processing at scale");
    console.log("• Provide excellent developer experience");
    console.log("• Reduce integration time from weeks to days\n");

    console.log("🎉 Demo completed successfully!");
    console.log("Ready to revolutionize developer integrations! 🚀");
  } catch (error) {
    console.error("❌ Demo Error:", error);
  }
}

// Run the demo
if (require.main === module) {
  demoIntegration().catch(console.error);
}

export { demoIntegration };
