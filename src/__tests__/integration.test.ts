import { Integration } from "../integration";

describe("Integration", () => {
  it("should create an integration with valid config", () => {
    const integration = new Integration({
      name: "test-integration",
      version: "1.0.0",
      provider: "github",
      oauth: {
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
        redirectUri: "http://localhost:3000/callback",
        scopes: ["repo"],
      },
    });

    expect(integration).toBeDefined();
    expect(integration.getConfig().name).toBe("test-integration");
    expect(integration.getConfig().provider).toBe("github");
  });

  it("should throw error with invalid config", () => {
    expect(() => {
      new Integration({
        name: "", // Invalid empty name
        version: "1.0.0",
        provider: "github",
      } as any);
    }).toThrow();
  });

  it("should initialize OAuth flow", async () => {
    const integration = new Integration({
      name: "test-integration",
      version: "1.0.0",
      provider: "github",
      oauth: {
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
        redirectUri: "http://localhost:3000/callback",
        scopes: ["repo"],
      },
    });

    const result = await integration.initializeOAuth({
      userId: "test-user",
    });

    expect(result.success).toBe(true);
    expect(result.data?.authUrl).toContain("github.com");
    expect(result.data?.state).toBeDefined();
  });
});
