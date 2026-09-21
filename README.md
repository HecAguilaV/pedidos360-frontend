# Pedidos360 - Frontend (Angular)

Aplicación web frontend en **Angular 22** con **TypeScript** y autenticación **MSAL / Microsoft Entra ID** para la plataforma **Pedidos360** (Cloud Native).

## Características

- **Componentes mínimos obligatorios (Sección 18):**
  - `Login` (`/login`): Acceso con Microsoft Entra ID o perfil local para pruebas de desarrollo.
  - `Logout` (`/logout`): Cierre seguro de sesión y revocación de tokens locales.
  - `Home` (`/home`): Panel principal con diagrama de flujo de arquitectura y estado del usuario.
  - `Productos` (`/productos`): Catálogo de productos interactivo, altas y bajas con control de stock y verificación de permisos (`productos.read`, `productos.write`, `ROLE_ADMIN`).
  - `Pedidos` (`/pedidos`): Gestión de órdenes con badges de estado (`pedidos.read`, `pedidos.write`).
- **Seguridad & MSAL:**
  - `AuthGuard` protegiendo las rutas privadas.
  - `authInterceptor` inyectando `Authorization: Bearer <access-token>` en cada llamada HTTP.
  - Variables de entorno desacopladas (`src/environments/`) preparadas para Azure Entra ID y AWS API Gateway.

## Ejecución en Desarrollo

1. Instalar dependencias:
   ```bash
   pnpm install
   ```

2. Levantar el servidor de desarrollo:
   ```bash
   pnpm start
   ```

3. Abrir en el navegador:
   ```text
   http://localhost:4200
   ```

## Configuración para Producción (Microsoft Entra ID + AWS API Gateway)

Al momento de disponer de las credenciales de Azure y el endpoint de AWS API Gateway, editar `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiBaseUrl: 'https://<api-gateway-id>.execute-api.us-east-1.amazonaws.com',
  productosApiUrl: 'https://<api-gateway-id>.execute-api.us-east-1.amazonaws.com/api/v1/productos',
  pedidosApiUrl: 'https://<api-gateway-id>.execute-api.us-east-1.amazonaws.com/api/v1/pedidos',
  msal: {
    clientId: '<AZURE_CLIENT_ID>',
    tenantId: '<AZURE_TENANT_ID>',
    redirectUri: 'https://<FRONTEND_PUBLIC_DOMAIN>',
    apiScope: 'api://<BACKEND_APP_ID>/pedidos.read'
  }
};
```
