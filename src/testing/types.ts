import { IntegrationConfig, OAuthTokens } from "@/types";
import { WebhookPayload } from "@/webhooks/types";

export interface TestConfig {
  integration: IntegrationConfig;
  mockData?: {
    tokens?: OAuthTokens;
    userInfo?: any;
    webhookPayloads?: WebhookPayload[];
  };
  environment?: "test" | "development" | "staging";
}

export interface TestResult {
  success: boolean;
  testName: string;
  duration: number;
  error?: string;
  data?: any;
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
}

export interface TestCase {
  name: string;
  description?: string;
  setup?: () => Promise<void> | void;
  test: () => Promise<TestResult> | TestResult;
  teardown?: () => Promise<void> | void;
}
