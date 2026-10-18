const resolveHostBase = (port: number, path: string): string => {
  if (typeof window !== 'undefined') {
    // When served behind Nginx on port 80/443, use same-origin relative proxy path
    if (window.location.port === '' || window.location.port === '80' || window.location.port === '443') {
      return path;
    }
    return `${window.location.protocol}//${window.location.hostname}:${port}${path}`;
  }
  return path;
};

export const environment = {
  production: true,
  apiBaseUrl: typeof window !== 'undefined' ? window.location.origin : '',
  productosApiUrl: resolveHostBase(8082, '/api/v1/productos'),
  pedidosApiUrl: resolveHostBase(8081, '/api/v1/pedidos'),
  carritoApiUrl: resolveHostBase(8083, '/api/v1/carrito'),
  enviosApiUrl: resolveHostBase(8085, '/api/v1/envios'),
  pagosApiUrl: resolveHostBase(8086, '/api/v1/pagos'),

  // Microsoft Entra ID / MSAL Configuration
  msal: {
    clientId: '4c9cb95d-2a2e-4f3c-88eb-1fbe551829b5',
    tenantId: 'e5372bf0-c5e3-4286-887c-79069f209c1f',
    redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
    apiScope: 'api://4c9cb95d-2a2e-4f3c-88eb-1fbe551829b5/pedidos360.access',
  },

  // AWS Cognito Configuration (Customer Identity Provider)
  cognito: {
    domain: '',
    clientId: '',
    userPoolId: '',
    region: 'us-east-1',
    redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
    scopes: 'openid profile email'
  }
};
