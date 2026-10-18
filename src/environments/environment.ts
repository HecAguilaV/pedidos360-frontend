export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080',
  productosApiUrl: 'http://localhost:8082/api/v1/productos',
  pedidosApiUrl: 'http://localhost:8081/api/v1/pedidos',
  carritoApiUrl: 'http://localhost:8083/api/v1/carrito',
  enviosApiUrl: 'http://localhost:8085/api/v1/envios',
  pagosApiUrl: 'http://localhost:8086/api/v1/pagos',

  // Microsoft Entra ID / MSAL Configuration
  msal: {
    clientId: '4c9cb95d-2a2e-4f3c-88eb-1fbe551829b5',
    tenantId: 'e5372bf0-c5e3-4286-887c-79069f209c1f',
    redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200',
    apiScope: 'api://4c9cb95d-2a2e-4f3c-88eb-1fbe551829b5/pedidos360.access',
  },

  // AWS Cognito Configuration (Customer Identity Provider)
  cognito: {
    domain: '',
    clientId: '',
    userPoolId: '',
    region: 'us-east-1',
    redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200',
    scopes: 'openid profile email'
  }
};
