# Pedidos360 - Frontend (Angular 22)

Aplicación web frontend moderna desarrollada en **Angular 22**, con diseño responsivo, catálogo comercial interactivo, carrito de compras, proceso de pago con desglose tributario legal e integración de autenticación dual (**Microsoft Entra ID** y **AWS Cognito**).

---

## 1. Diagrama de Arquitectura del Frontend

El siguiente diagrama ilustra cómo está organizada la aplicación por dentro: las vistas públicas, las vistas de administración, los guardianes de seguridad y la comunicación hacia el backend y los proveedores de identidad:

```mermaid
flowchart TD
    subgraph Usuario["Experiencia del Usuario (Navegador)"]
        UI_Cliente["🛍️ Módulo Cliente<br/>(/productos, /cart, /checkout, /tracking)"]
        UI_Staff["🛠️ Módulo Operativo / Backoffice<br/>(/pedidos, Gestión Productos, Consola TI)"]
    end

    subgraph Seguridad["Capa de Seguridad Angular"]
        Guards["🛡️ Route Guards<br/>(AuthGuard / AdminGuard / StaffGuard)"]
        AuthService["🔑 AuthService<br/>(Gestión de Tokens y Roles)"]
        Interceptor["📡 HTTP Auth Interceptor<br/>(Inyecta Bearer Token automáticamente)"]
    end

    subgraph Identidad["Autenticación Híbrida"]
        Azure["🏢 Microsoft Entra ID<br/>(OAuth2 PKCE para Staff / Administradores)"]
        Cognito["☁️ AWS Cognito<br/>(User Pool para Clientes de la Tienda)"]
    end

    subgraph Backend["Puerta de Enlace Backend"]
        Nginx["🌐 Nginx Reverse Proxy (:80)<br/>Enruta a los 6 Microservicios"]
    end

    UI_Cliente --> Interceptor
    UI_Staff --> Guards
    Guards --> AuthService
    AuthService --> Azure
    AuthService --> Cognito
    Interceptor -->|Peticiones HTTP con JWT| Nginx
```

---

## 2. Diagrama de Flujo del Proceso de Compra

Así recorre el cliente la plataforma desde que entra hasta que recibe su código de despacho:

```mermaid
flowchart LR
    A["1. Catálogo<br/>(/productos)<br/>Elegir productos"] --> B["2. Carrito<br/>(/cart)<br/>Ajustar cantidades"]
    B --> C["3. Checkout<br/>(/checkout)<br/>Datos de envío y<br/>Desglose Neto + IVA 19%"]
    C --> D["4. Pedido Creado<br/>Estado PENDIENTE<br/>en PostgreSQL"]
    D --> E["5. RabbitMQ Procesa<br/>Pago, Reserva Stock<br/>y Genera Guía"]
    E --> F["6. Seguimiento<br/>(/tracking)<br/>Código TRACK-2026-XXXXX<br/>y estado PAGADO"]
```

---

## 3. Páginas y Módulos Principales

| Ruta | Nombre | ¿Quién la usa? | ¿Qué permite hacer? |
|---|---|---|---|
| **`/productos`** | Catálogo | Todos | Ver productos con fotos, stock y precios. Los administradores ven además botones para crear, editar o eliminar productos. |
| **`/cart`** | Carrito | Clientes | Modificar unidades, ver subtotales y proceder al pago. |
| **`/checkout`** | Pago | Clientes | Ingresar datos de envío y pagar. Calcula automáticamente el desglose tributario chileno ($\text{Neto} = \text{Total} / 1.19$ e $\text{IVA} = 19\%$). |
| **`/tracking`** | Seguimiento | Clientes / Todos | Consultar cualquier orden con una línea de tiempo visual y ver su código de despacho (`TRACK-2026-XXXXX`). |
| **`/pedidos`** | Gestión de Órdenes | Staff (Admin / Despacho) | Ver todos los pedidos de la tienda, cambiar estados y controlar envíos. |
| **`/login`** | Iniciar Sesión | Todos | Acceso con Microsoft Entra ID (Staff) o AWS Cognito (Clientes). |
| **`/home`** | Inicio | Todos | Mapa visual de la arquitectura y acceso a la consola de diagnóstico para auditorías. |

---

## 4. Ejecución en Entorno Local

1. **Instalar dependencias del proyecto:**
   ```bash
   pnpm install
   ```

2. **Ejecutar pruebas unitarias (Vitest + Angular):**
   ```bash
   pnpm test
   ```

3. **Iniciar el servidor de desarrollo:**
   ```bash
   pnpm start
   ```

4. **Abrir en tu navegador:**
   ```text
   http://localhost:4200
   ```

---

## 5. Despliegue en Producción (Docker en EC2)

Cuando el frontend corre dentro de Docker en la máquina virtual EC2:
- Utiliza **Nginx** como servidor web en el puerto `80`.
- No solo sirve los archivos estáticos de Angular, sino que actúa como **Reverse Proxy** hacia los microservicios (`/api/v1/...`), evitando problemas de CORS en producción.
- Lee las variables de AWS Cognito desde `/assets/runtime-config.json`, generado automáticamente al arrancar el contenedor sin necesidad de recompilar la aplicación.
