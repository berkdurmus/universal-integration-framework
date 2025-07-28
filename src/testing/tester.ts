import { Integration } from "@/integration";
import { TestConfig, TestResult, TestSuite, TestCase } from "./types";
import { IntegrationContext } from "@/types";

export class IntegrationTester {
  private integration: Integration;
  private config: TestConfig;

  constructor(config: TestConfig) {
    this.config = config;
    this.integration = new Integration(config.integration);
  }

  async runTest(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Setup
      if (testCase.setup) {
        await testCase.setup();
      }

      // Run test
      const result = await testCase.test();

      // Teardown
      if (testCase.teardown) {
        await testCase.teardown();
      }

      return {
        ...result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        testName: testCase.name,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async runSuite(suite: TestSuite): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const testCase of suite.tests) {
      const result = await this.runTest(testCase);
      results.push(result);
    }

    return results;
  }

  async testOAuthFlow(context: IntegrationContext): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Test OAuth initialization
      const oauthResult = await this.integration.initializeOAuth(context);

      if (!oauthResult.success) {
        return {
          success: false,
          testName: "OAuth Flow Test",
          duration: Date.now() - startTime,
          error: oauthResult.error?.message || "OAuth initialization failed",
        };
      }

      // Test OAuth completion with mock data
      if (this.config.mockData?.tokens) {
        const tokenResult = await this.integration.completeOAuth(
          "mock_code",
          oauthResult.data?.state || "mock_state",
          context
        );

        return {
          success: tokenResult.success,
          testName: "OAuth Flow Test",
          duration: Date.now() - startTime,
          data: tokenResult.data,
          error: tokenResult.error?.message,
        };
      }

      return {
        success: true,
        testName: "OAuth Flow Test",
        duration: Date.now() - startTime,
        data: oauthResult.data,
      };
    } catch (error) {
      return {
        success: false,
        testName: "OAuth Flow Test",
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async testWebhookProcessing(
    context: IntegrationContext
  ): Promise<TestResult> {
    const startTime = Date.now();

    try {
      if (!this.config.mockData?.webhookPayloads?.length) {
        return {
          success: false,
          testName: "Webhook Processing Test",
          duration: Date.now() - startTime,
          error: "No mock webhook payloads provided",
        };
      }

      const results = [];

      for (const payload of this.config.mockData.webhookPayloads) {
        const result = await this.integration.handleWebhook(
          payload.headers,
          payload.body,
          payload.rawBody,
          context
        );

        results.push(result);
      }

      const allSuccessful = results.every((r) => r.success);

      return {
        success: allSuccessful,
        testName: "Webhook Processing Test",
        duration: Date.now() - startTime,
        data: results,
        error: allSuccessful ? undefined : "Some webhook tests failed",
      };
    } catch (error) {
      return {
        success: false,
        testName: "Webhook Processing Test",
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  getIntegration(): Integration {
    return this.integration;
  }
}
