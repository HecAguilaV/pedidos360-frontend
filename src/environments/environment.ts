export const environment = {
  production: false,
  // API Gateway URL in production, or direct microservice URLs for local dev
  apiBaseUrl: 'http://localhost:8080',
  productosApiUrl: 'http://localhost:8082/api/v1/productos',
  pedidosApiUrl: 'http://localhost:8081/api/v1/pedidos',

  // Microsoft Entra ID / MSAL Configuration (Section 24)
  msal: {
    clientId: '', // e.g. '00000000-0000-0000-0000-000000000000'
    tenantId: '', // e.g. 'common' or tenant UUID
    redirectUri: 'http://localhost:4200',
    apiScope: 'api://pedidos360/pedidos.read',
  }
};
