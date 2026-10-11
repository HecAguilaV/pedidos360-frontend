export const environment = {
  production: false,
  // API Gateway URL in production, or direct microservice URLs for local dev
  apiBaseUrl: 'http://localhost:8080',
  productosApiUrl: 'http://localhost:8082/api/v1/productos',
  pedidosApiUrl: 'http://localhost:8081/api/v1/pedidos',

  // Microsoft Entra ID / MSAL Configuration (Section 24)
  msal: {
    clientId: '4c9cb95d-2a2e-4f3c-88eb-1fbe551829b5',
    tenantId: 'e5372bf0-c5e3-4286-887c-79069f209c1f',
    redirectUri: 'http://localhost:4200',
    apiScope: 'api://4c9cb95d-2a2e-4f3c-88eb-1fbe551829b5/pedidos360.access',
  }
};
