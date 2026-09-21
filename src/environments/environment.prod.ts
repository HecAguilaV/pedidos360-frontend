export const environment = {
  production: true,
  // AWS API Gateway HTTP API endpoint (Section 14)
  apiBaseUrl: 'https://api-gateway-id.execute-api.us-east-1.amazonaws.com',
  productosApiUrl: 'https://api-gateway-id.execute-api.us-east-1.amazonaws.com/api/v1/productos',
  pedidosApiUrl: 'https://api-gateway-id.execute-api.us-east-1.amazonaws.com/api/v1/pedidos',

  // Microsoft Entra ID / MSAL Configuration (Section 24)
  msal: {
    clientId: 'YOUR_AZURE_CLIENT_ID',
    tenantId: 'YOUR_AZURE_TENANT_ID',
    redirectUri: 'https://your-frontend-domain.com',
    apiScope: 'api://YOUR_BACKEND_CLIENT_ID/pedidos.read',
  }
};
