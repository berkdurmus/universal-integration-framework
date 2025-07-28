"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vercelDeploymentMonitor = vercelDeploymentMonitor;
const src_1 = require("../src");
// Vercel integration for deployment monitoring
async function vercelDeploymentMonitor() {
    console.log("🚀 Vercel Deployment Monitor Example");
    const integration = new src_1.Integration({
        name: "vercel-deploy-monitor",
        version: "1.0.0",
        description: "Monitor Vercel deployments and send notifications",
        provider: "vercel",
        oauth: {
            clientId: process.env.VERCEL_CLIENT_ID,
            clientSecret: process.env.VERCEL_CLIENT_SECRET,
            redirectUri: "http://localhost:3000/auth/vercel/callback",
            scopes: ["deployment:read", "project:read", "team:read"],
        },
        webhooks: {
            endpoint: "http://localhost:3000/webhooks/vercel",
            secret: process.env.VERCEL_WEBHOOK_SECRET,
            events: ["deployment", "deployment-ready", "deployment-error"],
            signatureMethod: "hmac-sha256",
        },
    });
    // Register deployment event handlers
    const webhookManager = integration.getWebhookManager();
    webhookManager.onWebhookEvent("deployment", async (payload, context) => {
        const deployment = payload.body;
        console.log(`🚀 New deployment: ${deployment.id}`);
        console.log(`📦 Project: ${deployment.name}`);
        console.log(`🌍 URL: ${deployment.url}`);
        console.log(`⏱️  State: ${deployment.state}`);
        // Track deployment metrics
        const metrics = {
            deploymentId: deployment.id,
            projectName: deployment.name,
            timestamp: new Date(),
            state: deployment.state,
            url: deployment.url,
        };
        return {
            success: true,
            event: "deployment",
            data: { ...deployment, metrics },
        };
    });
    webhookManager.onWebhookEvent("deployment-ready", async (payload, context) => {
        const deployment = payload.body;
        console.log(`✅ Deployment ready: ${deployment.id}`);
        console.log(`🌐 Live at: https://${deployment.url}`);
        // Send success notification
        await sendNotification({
            type: "success",
            title: "Deployment Successful! 🎉",
            message: `${deployment.name} is now live at ${deployment.url}`,
            deployment,
        });
        return { success: true, event: "deployment-ready", data: deployment };
    });
    webhookManager.onWebhookEvent("deployment-error", async (payload, context) => {
        const deployment = payload.body;
        console.log(`❌ Deployment failed: ${deployment.id}`);
        console.log(`🐛 Error: ${deployment.error?.message || "Unknown error"}`);
        // Send error notification
        await sendNotification({
            type: "error",
            title: "Deployment Failed! 💥",
            message: `${deployment.name} deployment failed: ${deployment.error?.message}`,
            deployment,
        });
        return { success: true, event: "deployment-error", data: deployment };
    });
    const context = {
        userId: "user123",
        organizationId: "team456",
    };
    try {
        // Get Vercel OAuth provider for API operations
        const vercelProvider = integration.getOAuthProvider();
        if (vercelProvider) {
            // Mock tokens for demonstration
            const mockTokens = {
                accessToken: "mock_vercel_token",
                tokenType: "Bearer",
            };
            console.log("\n👥 Fetching teams...");
            try {
                const teams = await vercelProvider.getTeams(mockTokens);
                console.log(`✅ Found ${teams.length} teams:`);
                for (const team of teams) {
                    console.log(`  - ${team.name} (${team.slug})`);
                }
            }
            catch (error) {
                console.log("⚠️  Could not fetch teams (mock tokens)");
            }
            console.log("\n📦 Fetching projects...");
            try {
                const projects = await vercelProvider.getProjects(mockTokens);
                console.log(`✅ Found ${projects.length} projects:`);
                for (const project of projects.slice(0, 5)) {
                    console.log(`  - ${project.name} (${project.framework || "Unknown"})`);
                }
            }
            catch (error) {
                console.log("⚠️  Could not fetch projects (mock tokens)");
            }
            console.log("\n🚀 Fetching recent deployments...");
            try {
                const deployments = await vercelProvider.getDeployments(mockTokens, {
                    limit: 10,
                });
                console.log(`✅ Found ${deployments.length} deployments:`);
                for (const deployment of deployments.slice(0, 3)) {
                    console.log(`  - ${deployment.name}: ${deployment.state} (${deployment.url})`);
                }
            }
            catch (error) {
                console.log("⚠️  Could not fetch deployments (mock tokens)");
            }
        }
        // Simulate deployment webhooks
        console.log("\n🌊 Simulating deployment webhooks...");
        // New deployment
        await simulateVercelWebhook(integration, "deployment", {
            id: "dpl_abc123",
            name: "my-nextjs-app",
            url: "my-nextjs-app-git-main-user.vercel.app",
            state: "BUILDING",
            createdAt: new Date().toISOString(),
            project: {
                id: "prj_123",
                name: "my-nextjs-app",
            },
        }, context);
        // Deployment ready
        setTimeout(async () => {
            await simulateVercelWebhook(integration, "deployment-ready", {
                id: "dpl_abc123",
                name: "my-nextjs-app",
                url: "my-nextjs-app-git-main-user.vercel.app",
                state: "READY",
                readyAt: new Date().toISOString(),
            }, context);
        }, 1000);
        // Simulate deployment error
        setTimeout(async () => {
            await simulateVercelWebhook(integration, "deployment-error", {
                id: "dpl_def456",
                name: "my-broken-app",
                state: "ERROR",
                error: {
                    message: "Build failed: Module not found",
                    code: "BUILD_ERROR",
                },
            }, context);
        }, 2000);
    }
    catch (error) {
        console.error("❌ Error:", error);
    }
}
async function simulateVercelWebhook(integration, event, data, context) {
    const payload = JSON.stringify(data);
    const result = await integration.handleWebhook({
        "x-vercel-signature": "v1=mock_signature",
        "content-type": "application/json",
    }, data, payload, context);
    if (!result.success) {
        console.error(`❌ Webhook simulation failed for ${event}:`, result.error);
    }
}
async function sendNotification(notification) {
    // In a real implementation, this would send to Slack, email, etc.
    console.log(`📢 Notification [${notification.type.toUpperCase()}]:`);
    console.log(`   ${notification.title}`);
    console.log(`   ${notification.message}`);
    // Mock Slack webhook
    const slackPayload = {
        text: notification.title,
        attachments: [
            {
                color: notification.type === "success" ? "good" : "danger",
                fields: [
                    {
                        title: "Project",
                        value: notification.deployment.name,
                        short: true,
                    },
                    {
                        title: "URL",
                        value: notification.deployment.url,
                        short: true,
                    },
                ],
            },
        ],
    };
    console.log("   📱 Slack payload:", JSON.stringify(slackPayload, null, 2));
}
// Run the example
if (require.main === module) {
    vercelDeploymentMonitor().catch(console.error);
}
//# sourceMappingURL=vercel-integration.js.map