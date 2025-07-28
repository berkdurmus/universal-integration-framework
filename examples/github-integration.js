"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.advancedGitHubIntegration = advancedGitHubIntegration;
const src_1 = require("../src");
// Advanced GitHub integration with repository management
async function advancedGitHubIntegration() {
    console.log("🔧 Advanced GitHub Integration Example");
    const integration = new src_1.Integration({
        name: "github-repo-manager",
        version: "1.0.0",
        description: "Advanced GitHub repository management integration",
        provider: "github",
        oauth: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            redirectUri: "http://localhost:3000/auth/github/callback",
            scopes: ["repo", "user:email", "admin:org"],
            usePKCE: false, // GitHub Apps typically don't use PKCE
        },
        webhooks: {
            endpoint: "http://localhost:3000/webhooks/github",
            secret: process.env.GITHUB_WEBHOOK_SECRET,
            events: ["push", "pull_request", "issues", "repository"],
            signatureMethod: "hmac-sha256",
            retryPolicy: {
                maxRetries: 3,
                backoffStrategy: "exponential",
                baseDelay: 1000,
                maxDelay: 30000,
            },
        },
    });
    // Register event handlers
    integration.on("oauth.authorized", async (event, data, context) => {
        console.log("🎉 OAuth authorized for user:", context.userId);
        console.log("👤 User info:", data.userInfo?.login);
    });
    integration.on("webhook.received", async (event, data, context) => {
        console.log("📡 Webhook received:", data.event);
    });
    // Register webhook event handlers
    const webhookManager = integration.getWebhookManager();
    webhookManager.onWebhookEvent("push", async (payload, context) => {
        const pushData = payload.body;
        console.log(`📦 Push to ${pushData.repository.name}:${pushData.ref}`);
        console.log(`💻 Commits: ${pushData.commits.length}`);
        // Process commits
        for (const commit of pushData.commits) {
            console.log(`  - ${commit.id.substring(0, 7)}: ${commit.message}`);
        }
        return { success: true, event: "push", data: pushData };
    });
    webhookManager.onWebhookEvent("pull_request", async (payload, context) => {
        const prData = payload.body;
        console.log(`🔀 Pull Request ${prData.action}: #${prData.pull_request.number}`);
        console.log(`📝 Title: ${prData.pull_request.title}`);
        console.log(`👤 Author: ${prData.pull_request.user.login}`);
        if (prData.action === "opened") {
            // Auto-assign reviewers or add labels
            console.log("🏷️  Auto-processing new PR...");
        }
        return { success: true, event: "pull_request", data: prData };
    });
    webhookManager.onWebhookEvent("issues", async (payload, context) => {
        const issueData = payload.body;
        console.log(`🐛 Issue ${issueData.action}: #${issueData.issue.number}`);
        console.log(`📋 Title: ${issueData.issue.title}`);
        return { success: true, event: "issues", data: issueData };
    });
    const context = {
        userId: "user123",
        organizationId: "org456",
        metadata: { source: "api" },
    };
    try {
        // 1. Get GitHub OAuth provider for advanced operations
        const githubProvider = integration.getOAuthProvider();
        if (githubProvider) {
            // Mock tokens for demonstration
            const mockTokens = {
                accessToken: "gho_mock_token",
                tokenType: "Bearer",
                scope: "repo user:email",
            };
            // 2. Fetch user repositories
            console.log("\n📚 Fetching repositories...");
            try {
                const repos = await githubProvider.getRepositories(mockTokens, {
                    type: "all",
                    sort: "updated",
                    direction: "desc",
                    per_page: 10,
                });
                console.log(`✅ Found ${repos.length} repositories:`);
                for (const repo of repos.slice(0, 5)) {
                    console.log(`  - ${repo.full_name} (${repo.language || "Unknown"})`);
                }
            }
            catch (error) {
                console.log("⚠️  Could not fetch repositories (mock tokens)");
            }
            // 3. Fetch user organizations
            console.log("\n🏢 Fetching organizations...");
            try {
                const orgs = await githubProvider.getOrganizations(mockTokens);
                console.log(`✅ Found ${orgs.length} organizations:`);
                for (const org of orgs) {
                    console.log(`  - ${org.login}`);
                }
            }
            catch (error) {
                console.log("⚠️  Could not fetch organizations (mock tokens)");
            }
        }
        // 4. Simulate complex webhook scenarios
        console.log("\n🌊 Simulating webhook scenarios...");
        // Push event
        await simulateWebhook(integration, "push", {
            ref: "refs/heads/main",
            commits: [
                {
                    id: "abc123def456",
                    message: "Add user authentication",
                    author: { name: "John Doe", email: "john@example.com" },
                },
                {
                    id: "def456ghi789",
                    message: "Fix validation bug",
                    author: { name: "Jane Smith", email: "jane@example.com" },
                },
            ],
            repository: { name: "my-app", full_name: "user/my-app" },
        }, context);
        // Pull request event
        await simulateWebhook(integration, "pull_request", {
            action: "opened",
            pull_request: {
                number: 42,
                title: "Implement new dashboard",
                user: { login: "contributor" },
                base: { ref: "main" },
                head: { ref: "feature/dashboard" },
            },
        }, context);
        // Issue event
        await simulateWebhook(integration, "issues", {
            action: "opened",
            issue: {
                number: 123,
                title: "Bug: Login form validation",
                user: { login: "bug-reporter" },
                labels: [{ name: "bug" }, { name: "frontend" }],
            },
        }, context);
    }
    catch (error) {
        console.error("❌ Error:", error);
    }
}
async function simulateWebhook(integration, event, data, context) {
    const payload = JSON.stringify(data);
    const signature = integration
        .getWebhookManager()
        .generateSignature("github-repo-manager", payload);
    const result = await integration.handleWebhook({
        "x-github-event": event,
        "x-hub-signature-256": signature || "sha256=mock_signature",
        "content-type": "application/json",
    }, data, payload, context);
    if (!result.success) {
        console.error(`❌ Webhook simulation failed for ${event}:`, result.error);
    }
}
// Run the example
if (require.main === module) {
    advancedGitHubIntegration().catch(console.error);
}
//# sourceMappingURL=github-integration.js.map