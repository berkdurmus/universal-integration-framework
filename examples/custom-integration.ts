import { Integration } from "../src";

// Custom integration example for any OAuth 2.0 provider
async function customIntegrationExample() {
  console.log("🔧 Custom Integration Example");

  // Example: Integrating with a custom API that supports OAuth 2.0
  const integration = new Integration({
    name: "my-custom-service",
    version: "1.0.0",
    description: "Custom service integration with OAuth 2.0",
    provider: "custom",
    oauth: {
      clientId: "your-custom-client-id",
      clientSecret: "your-custom-client-secret",
      redirectUri: "http://localhost:3000/auth/custom/callback",
      scopes: ["read", "write", "admin"],
      authUrl: "https://api.customservice.com/oauth/authorize",
      tokenUrl: "https://api.customservice.com/oauth/token",
      userInfoUrl: "https://api.customservice.com/user/me",
      usePKCE: true, // Enable PKCE for enhanced security
    },
    webhooks: {
      endpoint: "http://localhost:3000/webhooks/custom",
      secret: "your-webhook-secret",
      events: ["user.created", "data.updated", "system.alert"],
      signatureMethod: "hmac-sha256",
    },
  });

  // Register event handlers
  integration.on("oauth.authorized", async (event, data, context) => {
    console.log("🎉 User authorized:", data.userInfo);
    // Store tokens securely in your database
    await storeTokens(context.userId!, data.tokens);
  });

  const webhookManager = integration.getWebhookManager();

  // Handle user creation events
  webhookManager.onWebhookEvent("user.created", async (payload, context) => {
    const userData = payload.body;
    console.log(`👤 New user created: ${userData.user.email}`);

    // Send welcome email or setup user account
    await sendWelcomeEmail(userData.user);

    return { success: true, event: "user.created", data: userData };
  });

  // Handle data update events
  webhookManager.onWebhookEvent("data.updated", async (payload, context) => {
    const updateData = payload.body;
    console.log(
      `📊 Data updated: ${updateData.entity_type}#${updateData.entity_id}`
    );

    // Sync data with local database
    await syncData(updateData);

    return { success: true, event: "data.updated", data: updateData };
  });

  // Handle system alerts
  webhookManager.onWebhookEvent("system.alert", async (payload, context) => {
    const alertData = payload.body;
    console.log(
      `🚨 System alert: ${alertData.alert_type} - ${alertData.message}`
    );

    if (alertData.severity === "critical") {
      await sendCriticalAlert(alertData);
    }

    return { success: true, event: "system.alert", data: alertData };
  });

  const context = {
    userId: "user123",
    organizationId: "org456",
  };

  try {
    // 1. Initialize OAuth flow
    console.log("🚀 Starting OAuth flow...");
    const oauthResult = await integration.initializeOAuth(context);

    if (oauthResult.success) {
      console.log("✅ OAuth URL:", oauthResult.data?.authUrl);
      console.log("🔐 State (store this):", oauthResult.data?.state);
    }

    // 2. Simulate OAuth callback handling
    console.log("\n🔄 Simulating OAuth callback...");
    const mockCode = "mock_auth_code_12345";
    const mockState = oauthResult.data?.state || "mock_state";

    const tokenResult = await integration.completeOAuth(
      mockCode,
      mockState,
      context
    );

    if (tokenResult.success) {
      console.log("✅ OAuth completed!");
      console.log("👤 User:", tokenResult.data?.userInfo);
      console.log(
        "🔑 Access Token:",
        tokenResult.data?.tokens.accessToken.substring(0, 10) + "..."
      );
    }

    // 3. Simulate various webhook events
    console.log("\n🌊 Simulating webhook events...");

    // User creation event
    await simulateCustomWebhook(
      integration,
      "user.created",
      {
        user: {
          id: "user_789",
          email: "newuser@example.com",
          name: "John Doe",
          created_at: new Date().toISOString(),
        },
        metadata: {
          source: "signup_form",
          referrer: "google",
        },
      },
      context
    );

    // Data update event
    await simulateCustomWebhook(
      integration,
      "data.updated",
      {
        entity_type: "project",
        entity_id: "proj_123",
        changes: {
          name: { from: "Old Project", to: "New Project Name" },
          status: { from: "draft", to: "published" },
        },
        updated_by: "user_456",
        updated_at: new Date().toISOString(),
      },
      context
    );

    // System alert event
    await simulateCustomWebhook(
      integration,
      "system.alert",
      {
        alert_id: "alert_999",
        alert_type: "performance",
        severity: "warning",
        message: "API response time increased by 200%",
        metrics: {
          avg_response_time: "850ms",
          threshold: "500ms",
        },
        timestamp: new Date().toISOString(),
      },
      context
    );

    // Critical alert
    setTimeout(async () => {
      await simulateCustomWebhook(
        integration,
        "system.alert",
        {
          alert_id: "alert_1000",
          alert_type: "security",
          severity: "critical",
          message: "Multiple failed login attempts detected",
          details: {
            attempts: 50,
            ip_address: "192.168.1.100",
            timeframe: "5 minutes",
          },
          timestamp: new Date().toISOString(),
        },
        context
      );
    }, 1000);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

async function simulateCustomWebhook(
  integration: Integration,
  event: string,
  data: any,
  context: any
) {
  const payload = JSON.stringify(data);
  const signature = integration
    .getWebhookManager()
    .generateSignature("my-custom-service", payload);

  const result = await integration.handleWebhook(
    {
      "x-custom-event": event,
      "x-custom-signature": signature || "mock_signature",
      "content-type": "application/json",
      "user-agent": "CustomService-Webhook/1.0",
    },
    data,
    payload,
    context
  );

  if (!result.success) {
    console.error(`❌ Webhook simulation failed for ${event}:`, result.error);
  }
}

// Mock helper functions
async function storeTokens(userId: string, tokens: any) {
  console.log(`💾 Storing tokens for user ${userId} (mock implementation)`);
  // In real app: await database.tokens.create({ userId, ...tokens });
}

async function sendWelcomeEmail(user: any) {
  console.log(
    `📧 Sending welcome email to ${user.email} (mock implementation)`
  );
  // In real app: await emailService.send('welcome', user);
}

async function syncData(updateData: any) {
  console.log(
    `🔄 Syncing ${updateData.entity_type} data (mock implementation)`
  );
  // In real app: await database.sync(updateData);
}

async function sendCriticalAlert(alertData: any) {
  console.log(`🚨 Sending critical alert notification (mock implementation)`);
  console.log(`   Alert: ${alertData.message}`);
  // In real app: await alertingService.sendCritical(alertData);
}

// Run the example
if (require.main === module) {
  customIntegrationExample().catch(console.error);
}

export { customIntegrationExample };
