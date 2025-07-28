# Universal Integration Framework

A TypeScript framework for building marketplace integrations with major developer platforms like GitHub, Vercel, Netlify, and Slack.

## 🚀 Features

- **OAuth 2.0 Support**: Pre-built OAuth providers for popular platforms
- **Webhook Management**: Signature validation, retry logic, and event handling
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Rate Limiting**: Built-in API rate limiting with configurable strategies
- **Retry Logic**: Exponential backoff and error handling for robust integrations
- **Testing Utilities**: Built-in testing framework for integration workflows
- **React Components**: Optional UI components for OAuth flows (peer dependency)

## 📦 Installation

```bash
npm install universal-integration-framework
```

For React components (optional):
```bash
npm install universal-integration-framework react @types/react
```

## 🎯 Quick Start

### Basic GitHub Integration

```typescript
import { Integration } from 'universal-integration-framework';

const integration = new Integration({
  name: 'my-github-app',
  version: '1.0.0',
  provider: 'github',
  oauth: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    redirectUri: 'http://localhost:3000/callback',
    scopes: ['repo', 'user:email']
  },
  webhooks: {
    endpoint: 'http://localhost:3000/webhooks',
    secret: process.env.GITHUB_WEBHOOK_SECRET!,
    events: ['push', 'pull_request']
  }
});

// Initialize OAuth flow
const oauthResult = await integration.initializeOAuth({
  userId: 'user123'
});

console.log('Visit:', oauthResult.data?.authUrl);

// Handle OAuth callback
const tokenResult = await integration.completeOAuth(
  authCode, 
  state, 
  { userId: 'user123' }
);

// Handle webhooks
const webhookResult = await integration.handleWebhook(
  headers,
  body,
  rawBody,
  { userId: 'user123' }
);
```

## 🔧 Supported Platforms

### OAuth Providers

- **GitHub**: Full API access, repository management
- **Vercel**: Deployment monitoring, project management  
- **Netlify**: Site management, build hooks
- **Slack**: Workspace integration, messaging
- **Custom**: Build your own OAuth provider

### Webhook Support

- **Signature Validation**: HMAC-SHA256/SHA1 verification
- **Event Filtering**: Process only relevant events
- **Retry Logic**: Configurable backoff strategies
- **Delivery Tracking**: Monitor webhook delivery status

## 📖 Documentation

### Core Concepts

#### 1. Integration Configuration

```typescript
interface IntegrationConfig {
  name: string;
  version: string;
  provider: 'github' | 'vercel' | 'netlify' | 'slack' | 'custom';
  oauth?: OAuthConfig;
  webhooks?: WebhookConfig;
  api?: ApiConfig;
}
```

#### 2. OAuth Configuration

```typescript
interface OAuthConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
  usePKCE?: boolean;  // For enhanced security
}
```

#### 3. Webhook Configuration

```typescript
interface WebhookConfig {
  endpoint: string;
  secret?: string;
  events: string[];
  signatureMethod?: 'hmac-sha256' | 'hmac-sha1';
  retryPolicy?: RetryPolicy;
}
```

### Advanced Usage

#### Custom OAuth Provider

```typescript
import { CustomOAuth } from 'universal-integration-framework';

const integration = new Integration({
  name: 'my-custom-integration',
  version: '1.0.0',
  provider: 'custom',
  oauth: {
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    redirectUri: 'http://localhost:3000/callback',
    scopes: ['read', 'write'],
    authUrl: 'https://api.example.com/oauth/authorize',
    tokenUrl: 'https://api.example.com/oauth/token',
    userInfoUrl: 'https://api.example.com/user'
  }
});
```

#### Event Handlers

```typescript
// OAuth events
integration.on('oauth.authorized', async (event, data, context) => {
  console.log('User authorized:', data.userInfo);
});

integration.on('oauth.refreshed', async (event, data, context) => {
  console.log('Tokens refreshed:', data.tokens);
});

// Webhook events
const webhookManager = integration.getWebhookManager();

webhookManager.onWebhookEvent('push', async (payload, context) => {
  const pushData = payload.body;
  console.log(`New push to ${pushData.repository.name}`);
  
  return { success: true, data: pushData };
});
```

#### API Client Usage

```typescript
import { ApiClient } from 'universal-integration-framework';

const apiClient = new ApiClient({
  baseUrl: 'https://api.github.com',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json'
  },
  rateLimit: {
    requests: 5000,
    window: 3600000, // 1 hour
    strategy: 'sliding'
  },
  retryPolicy: {
    maxRetries: 3,
    backoffStrategy: 'exponential',
    baseDelay: 1000,
    maxDelay: 30000
  }
});

const response = await apiClient.get('/user/repos');
```

## 🧪 Testing

### Integration Testing

```typescript
import { Integration } from 'universal-integration-framework';

describe('GitHub Integration', () => {
  let integration: Integration;

  beforeEach(() => {
    integration = new Integration({
      name: 'test-github-app',
      version: '1.0.0',
      provider: 'github',
      oauth: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/callback',
        scopes: ['repo']
      }
    });
  });

  it('should initialize OAuth flow', async () => {
    const result = await integration.initializeOAuth({
      userId: 'test-user'
    });

    expect(result.success).toBe(true);
    expect(result.data?.authUrl).toContain('github.com');
  });

  it('should handle webhooks', async () => {
    const payload = JSON.stringify({ action: 'opened' });
    
    const result = await integration.handleWebhook(
      { 'x-github-event': 'pull_request' },
      { action: 'opened' },
      payload,
      { userId: 'test-user' }
    );

    expect(result.success).toBe(true);
  });
});
```

## 📋 Examples

Check out the `examples/` directory for comprehensive integration examples:

- `basic-integration.ts` - Simple GitHub integration
- `github-integration.ts` - Advanced GitHub repository management
- `vercel-integration.ts` - Vercel deployment monitoring
- `slack-integration.ts` - Slack workspace integration

## 🛠️ Development

### Building the Framework

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Watch mode
npm run dev
```

### Running Examples

```bash
# Set environment variables
export GITHUB_CLIENT_ID="your-github-client-id"
export GITHUB_CLIENT_SECRET="your-github-client-secret"
export GITHUB_WEBHOOK_SECRET="your-webhook-secret"

# Run basic example
npm run example:basic

# Run GitHub example
npm run example:github

# Run Vercel example
npm run example:vercel
```

## 🔒 Security

### Webhook Signature Validation

All webhook payloads are validated using HMAC signatures:

```typescript
const webhookManager = integration.getWebhookManager();

// Validate signature manually
const isValid = webhookManager.validateSignature(
  'integration-id',
  payload,
  signature
);

// Generate signature for outgoing webhooks
const signature = webhookManager.generateSignature(
  'integration-id',
  payload
);
```

### OAuth Security

- PKCE support for enhanced security
- Secure token storage (implement your own)
- Automatic token refresh handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the developer tools ecosystem
- Designed with marketplace approval processes in mind

## 📚 API Reference

### Integration Class

#### Methods

- `initializeOAuth(context)` - Start OAuth flow
- `completeOAuth(code, state, context)` - Complete OAuth flow
- `refreshTokens(refreshToken, context)` - Refresh OAuth tokens
- `handleWebhook(headers, body, rawBody, context)` - Process webhooks
- `on(event, handler)` - Register event handlers
- `getOAuthProvider()` - Get OAuth provider instance
- `getWebhookManager()` - Get webhook manager instance

### OAuth Providers

#### GitHub
- `getRepositories(tokens, options)` - Fetch user repositories
- `getOrganizations(tokens)` - Fetch user organizations
- `getUserInfo(tokens)` - Get user information

#### Vercel
- `getTeams(tokens)` - Fetch user teams
- `getProjects(tokens, teamId?)` - Fetch projects
- `getDeployments(tokens, options)` - Fetch deployments
- `getEnvironmentVariables(tokens, projectId, teamId?)` - Get env vars

#### Netlify
- `getSites(tokens)` - Fetch user sites
- `getDeploys(tokens, siteId)` - Fetch site deployments
- `getForms(tokens, siteId?)` - Fetch forms
- `getEnvironmentVariables(tokens, siteId)` - Get env vars

## 🆘 Support

- [GitHub Issues](https://github.com/your-org/universal-integration-framework/issues)
- [Documentation](https://docs.example.com)
- [Community Discord](https://discord.gg/example)

---

Built with ❤️ for the developer community 