// React components are optional - only export if React is available
let OAuthButton: any;
let WebhookStatus: any;
let IntegrationCard: any;

try {
  // Only load components if React is available
  require("react");

  const components = require("./oauth-button");
  OAuthButton = components.OAuthButton;

  const webhookComponents = require("./webhook-status");
  WebhookStatus = webhookComponents.WebhookStatus;

  const cardComponents = require("./integration-card");
  IntegrationCard = cardComponents.IntegrationCard;
} catch (error) {
  // React not available, components will be undefined
}

export { OAuthButton, WebhookStatus, IntegrationCard };
