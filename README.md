# Pedidos360 - Frontend (Angular 22)

Aplicación web frontend en **Angular 22** con **TypeScript**, componentes standalone, **Phosphor Icons**, diseño responsivo premium y soporte de autenticación híbrida dual (**Microsoft Entra ID** para Staff corporativo y **AWS Cognito** para Clientes) para la plataforma **Pedidos360** (Cloud Native).

---

## Módulos y Flujos de Usuario

### 1. Storefront & Experiencia de Compra (Clientes)
- **Catálogo de Productos (`/productos`):**
  - Vista en cuadrícula de tarjetas de productos, filtrado por categorías, indicador de stock en tiempo real y botón de acción rápida *"Agregar al Carrito"*.
  - Modo Administración integrado: los botones de alta, edición y baja de productos solo se habilitan para usuarios con rol `Administrador` (`ROLE_ADMIN`).
- **Carrito de Compras (`/cart`):**
  - Resumen de ítems seleccionados, control dinámico de cantidades, cálculo de subtotales y botón de vaciado de carrito.
- **Checkout & Facturación (`/checkout`):**
  - Formulario de datos de despacho y selección de método de pago.
  - **Desglose legal de IVA (CLP):** Cálculo conforme a la normativa tributaria chilena:
    - $\text{Neto} = \text{round}\left(\frac{\text{Total}}{1.19}\right)$
    - $\text{IVA} = \text{Total} - \text{Neto}$
  - Registro de pedido en estado `PENDIENTE` mediante llamada asíncrona a `pedidos-service`, permitiendo que la coreografía de eventos en RabbitMQ (`orders.exchange` y `payments.direct.exchange`) complete la confirmación de pago y reserva de inventario.
- **Seguimiento de Despacho (`/tracking`):**
  - Búsqueda interactiva de órdenes por ID.
  - Indicador de estado con badges dinámicos y línea de tiempo visual (`PENDIENTE` $\rightarrow$ `PAGADO` $\rightarrow$ `EN_PREPARACION` $\rightarrow$ `ENVIADO` $\rightarrow$ `ENTREGADO`).
  - Muestra el código de seguimiento de logística (`TRACK-2026-XXXXX`) generado por `envios-service`.

### 2. Gestión Operativa & Backoffice (Staff)
- **Gestión de Pedidos (`/pedidos`):**
  - Tabla de control de pedidos para administradores y despachadores (`ROLE_DESPACHADOR`).
  - Acciones de actualización de estado y trazabilidad de órdenes.
- **Panel Principal & Arquitectura (`/home`):**
  - Diagrama de la topología distribuida de microservicios, broker RabbitMQ, bases de datos y proveedores de identidad.
  - Acceso directo a la Consola de Auditoría TI y Métricas de Diagnóstico.

### 3. Autenticación Dual (Microsoft Entra ID + AWS Cognito)
- **Microsoft Entra ID (`/login`):**
  - Flujo OAuth 2.0 Authorization Code con PKCE vía `@azure/msal-browser`.
  - Destinado a Administradores y Despachadores institucionales.
- **AWS Cognito User Pool (`/login`):**
  - Autenticación directa de clientes (`USER_PASSWORD_AUTH`) o redirección a Cognito Hosted UI.
  - Registro de nuevos usuarios y confirmación por código.
- **Inyección en Tiempo de Ejecución (Zero Rebuild):**
  - La aplicación consulta `/assets/runtime-config.json` al iniciar.
  - En despliegues Docker en AWS EC2, el script `/docker-entrypoint.d/40-runtime-config.sh` genera este archivo desde las variables de entorno del contenedor sin requerir recompilar el código de Angular.

---

## Ejecución en Desarrollo Local

1. Instalar dependencias:
   ```bash
   pnpm install
   ```

2. Ejecutar pruebas unitarias:
   ```bash
   pnpm test
   ```

3. Iniciar el servidor de desarrollo:
   ```bash
   pnpm start
   ```

4. Acceder en el navegador:
   ```text
   http://localhost:4200
   ```

---

## Despliegue en Producción (AWS EC2 + CloudFront / Nginx)

El contenedor Nginx del frontend actúa como servidor web de archivos estáticos y como **Reverse Proxy Gateway** en el puerto `80`:
- `/` $\rightarrow$ Aplicación Angular en `/usr/share/nginx/html`.
- `/api/v1/productos` $\rightarrow$ Proxy interno hacia `productos-service:8082`.
- `/api/v1/pedidos` $\rightarrow$ Proxy interno hacia `pedidos-service:8081`.
- `/api/v1/carrito` $\rightarrow$ Proxy interno hacia `carrito-service:8083`.
- `/api/v1/notificaciones` $\rightarrow$ Proxy interno hacia `notifications-service:8084`.
- `/api/v1/envios` $\rightarrow$ Proxy interno hacia `envios-service:8085`.
- `/api/v1/pagos` $\rightarrow$ Proxy interno hacia `pagos-service:8086`.

### Parámetros de Entorno para Docker Compose
Configurables en el archivo `.env` del backend:
```bash
COGNITO_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_DOMAIN=https://<auth-domain>.auth.us-east-1.amazoncognito.com
COGNITO_REDIRECT_URI=https://<id>.cloudfront.net/login
```
