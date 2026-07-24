# Especificación Técnica de Proyecto: Sistema de Pedidos de Almuerzo para Mina

Documento de arquitectura y especificación de datos para el desarrollo de la aplicación de gestión de pedidos de almuerzo multi-proveedor, en **entorno 100% local**: **React (Vite)** en el frontend, **NestJS** en el backend y **PostgreSQL local** como base de datos.

> **Nota de migración:** esta versión reemplaza toda dependencia de Supabase (Auth, Realtime, Postgres gestionado) por una infraestructura local: PostgreSQL propio, autenticación JWT gestionada por NestJS, y WebSockets nativos (Socket.IO) para el tiempo real. También reemplaza Next.js por una separación clara de frontend (React + Vite) y backend (NestJS), ya que la app se diseñó como **Local First** con repositorios separados.

---

## 📄 0. Resumen del Proyecto

| Parámetro | Detalle |
| :--- | :--- |
| **Nombre del Proyecto** | MinaLunch / LunchSync |
| **Tipo de Aplicación** | Web App con apariencia nativa iOS (PWA instalable) + Panel de Administración (Superuser y Proveedores) |
| **Arquitectura** | Repositorios separados: `lunchsync-frontend` (React/Vite) y `lunchsync-backend` (NestJS) |
| **Frontend** | React 18 + Vite + TypeScript estricto + Tailwind CSS + shadcn/ui, con lenguaje visual nativo iOS (Human Interface Guidelines) |
| **Backend** | NestJS (TypeORM + WebSockets Gateway con Socket.IO) |
| **Base de Datos** | PostgreSQL — instancia **local** (Docker Compose para desarrollo) |
| **Tiempo Real** | Socket.IO (Gateway de NestJS), no Supabase Realtime |
| **Autenticación** | JWT propio: Superuser/Proveedores por email+password; Empleados por Magic Link (token firmado) |
| **Bot de WhatsApp** | `whatsapp-web.js` como microservicio Node independiente, comunicado con el backend vía cola interna/HTTP |
| **Estado del Documento** | Especificación para entorno local de desarrollo, lista para uso como contexto de vibecoding con IA |

---

## 🤖 1. Principios para Desarrollo Asistido por IA (Anti-Alucinación)

Esta sección existe para que cualquier asistente de IA Opencode que trabaje sobre este proyecto **no invente estructuras, tablas, endpoints ni convenciones** que no estén aquí. Debe tratarse como la **fuente única de verdad**.

### 1.1 Reglas obligatorias para la IA
1. **No inventar entidades ni columnas.** Si una tabla o campo no está en la sección 5 (Modelo de Datos), no debe crearse "por conveniencia". Si hace falta un campo nuevo, se debe proponer explícitamente antes de escribir código, no asumirlo.
2. **No mezclar Supabase.** Prohibido usar `@supabase/supabase-js`, Supabase Auth, Supabase Realtime o cualquier SDK de Supabase. Todo pasa por NestJS + TypeORM + Socket.IO + PostgreSQL local.
3. **No usar Next.js.** El frontend es React puro con Vite (SPA), sin App Router, sin Server Actions, sin `getServerSideProps`. Cualquier lógica de servidor vive en NestJS.
4. **Prohibido `any`.** Ver sección 4 (Convenciones TypeScript). Si la IA no puede tipar algo, debe generar un tipo/interfaz explícito, nunca degradar a `any` ni a `unknown` sin narrowing.
5. **Seguir los patrones de diseño definidos** (sección 3.2) en vez de crear estructuras ad-hoc por módulo.
6. **Un cambio, un contrato.** Antes de generar código para un módulo nuevo, la IA debe listar: entidades que toca, DTOs de entrada/salida, endpoints (método + ruta), y eventos de socket que emite/escucha. Recién después escribir la implementación.
7. **Nomenclatura fija:** tablas y columnas en inglés y `snake_case` (ya definidas abajo); clases y tipos de TypeScript en `PascalCase`; variables y funciones en `camelCase`; eventos de socket en `kebab-case` (ej. `order-status-updated`).
8. **No renombrar ni "mejorar" nombres existentes** de tablas/columnas/eventos sin que se pida explícitamente — la IA debe usar los nombres exactos de este documento.
9. **Checklist antes de dar por cerrada una tarea:** compila con `strict: true`, no hay `any`, respeta el esquema de la sección 5, usa DTOs con `class-validator`, y el módulo sigue la estructura de carpetas de la sección 6.
10. Las sesiones de WhatsApp no deben almacenarse en la base de datos.

La IA debe asumir que las sesiones son persistidas en el sistema de archivos local.

La ruta oficial será:

```text
/storage/whatsapp/{provider_id}
```

Está prohibido almacenar:

- Credenciales de WhatsApp
- Local Storage de WhatsApp
- IndexedDB de WhatsApp
- Session Data de Chromium

dentro de PostgreSQL.
``

### 1.2 Formato recomendado de prompt para pedir features a la IA
```
Contexto: usa la especificación MinaLunch/LunchSync (este documento) como única fuente de verdad.
Tarea: <descripción concreta>
Restricciones: no Supabase, no Next.js, no "any", seguir patrones de la sección 3.2.
Antes de programar: lista entidades, DTOs y endpoints/eventos afectados.
```

### 1.3 Tenant Isolation (Multi-Tenant Security)

Todo dato del sistema pertenece a un proveedor (tenant).

#### Reglas obligatorias

1. Todo acceso a datos deberá filtrar por `provider_id`.
2. Ningún usuario proveedor podrá visualizar registros de otro proveedor.
3. Ningún usuario proveedor podrá modificar registros de otro proveedor.
4. Ningún usuario proveedor podrá eliminar registros de otro proveedor.
5. El `provider_id` nunca será recibido desde el frontend como fuente de verdad.
6. El `provider_id` siempre deberá obtenerse desde el JWT validado por NestJS.
7. Todo controlador, servicio o repositorio deberá aplicar filtros de tenant antes de ejecutar consultas.
8. El Superuser es el único rol autorizado para omitir el filtro de tenant.

#### Ejemplos



## 🎯 2. Alcance, Roles y Flujo Operativo

### 2.1 Jerarquía de Autenticación y Usuarios
1. **Superuser (Administrador General)**
   - Único rol con permisos para registrar, activar/desactivar y configurar nuevos proveedores (`providers`).
   - Crea y gestiona los accesos iniciales de los usuarios asignados a cada proveedor.
2. **Provider Users (Administradores/Operadores de Comedor)**
   - Acceden mediante login con credenciales (email/password) y reciben un **JWT** emitido por NestJS.
   - Publican y gestionan sus menús diarios, servicios, grupos de combo y opciones.
   - Visualizan los pedidos entrantes en tiempo real (vía Socket.IO) y gestionan el stock/inventario.
3. **Empleados (Clientes/Consumidores)**
   - Acceden vía **Magic Link**: un token firmado y de un solo uso, asociado a su número de teléfono, sin contraseña tradicional.
   - El bot de WhatsApp envía este Magic Link automáticamente al grupo correspondiente del proveedor.

### 2.2 Flujo Operativo y Restricciones de Tiempo
1. **Publicación del menú:** los proveedores publican su menú diario a partir de las 05:00 PM del día anterior.
2. **Recepción de pedidos:** la plataforma acepta pedidos hasta las 08:00 AM del día de consumo (`daily_menus.order_cutoff_time`).
3. **Confirmación y notificación:** al aceptar un pedido en el panel administrativo, el backend dispara un evento que el microservicio de WhatsApp traduce en un mensaje al grupo del proveedor.
4. **Inventario en tiempo real:** las opciones del menú se deshabilitan instantáneamente en las pantallas de los usuarios cuando el stock llega a cero, mediante el Gateway de WebSockets de NestJS (no Supabase Realtime).


## 🔐 2.3 Validación de Propiedad del Magic Link

Con el objetivo de evitar el uso indebido de enlaces compartidos entre empleados, todo **Magic Link** deberá estar asociado al empleado y a su número de teléfono registrado en el sistema.

### Reglas de Seguridad

1. Cada Magic Link será generado para un único user (`id`) y contendrá un identificador único (`jti`) firmado criptográficamente.
2. El token tendrá un tiempo de expiración configurable y será de **un solo uso**.
3. Una vez utilizado correctamente, el token será invalidado y no podrá volver a emplearse.
4. Si el token ha expirado, fue revocado o ya fue utilizado, el backend responderá con **401 Unauthorized**.

### Validación de Propiedad

Debido a que un enlace puede ser compartido accidental o intencionalmente dentro de un grupo de WhatsApp, el sistema **no debe asumir que quien abre el enlace es el propietario del número telefónico**.

El navegador web no tiene acceso al número de teléfono del usuario de WhatsApp, por lo que la validación de identidad deberá realizarse mediante un mecanismo adicional.

El backend deberá verificar la propiedad del Magic Link mediante uno de los siguientes mecanismos:

* Confirmación mediante un código OTP enviado al número de teléfono registrado.
* Confirmación iniciada desde una conversación con el bot de WhatsApp.
* Cualquier otro mecanismo de verificación que demuestre la posesión del número telefónico registrado para el empleado.

### Flujo de Validación

1. El empleado recibe un Magic Link enviado por el bot de WhatsApp.
2. El empleado abre el enlace desde su navegador.
3. El frontend envía el token al endpoint de validación.
4. El backend valida:

   * Firma del token.
   * Fecha de expiración.
   * Estado de revocación.
   * Que el token no haya sido utilizado previamente.
5. Si el token requiere verificación de identidad, el backend iniciará el mecanismo de validación definido (OTP, confirmación por WhatsApp u otro equivalente).
6. Solo después de completar satisfactoriamente la validación de identidad se emitirá el JWT de sesión para el empleado.

### Consideraciones de Seguridad

* Compartir un Magic Link no debe ser suficiente para obtener acceso al sistema.
* La autenticación deberá requerir tanto la posesión del Magic Link como la validación de identidad del propietario del número telefónico asociado.
* Todos los intentos fallidos de validación deberán registrarse para fines de auditoría.
* Los tokens deberán utilizar identificadores únicos (`jti`) para impedir ataques de repetición (Replay Attacks).
* El backend nunca confiará en información proporcionada por el navegador para identificar el número de teléfono del usuario.

### Multi-Tenant Security

Todas las consultas realizadas por usuarios
de proveedor deberán filtrar obligatoriamente
por provider_id.

Ningún usuario podrá acceder,
modificar o eliminar registros
pertenecientes a otro proveedor.

Todo endpoint deberá recibir
el provider_id desde el JWT
y nunca desde el frontend.

Prohibido confiar en:

- query string
- body
- headers enviados por el cliente

La fuente oficial del provider_id
será el JWT validado por NestJS.

## 📱 2.4 Administración de WhatsApp del Proveedor

Cada proveedor dispondrá de un módulo para administrar la instancia de WhatsApp utilizada por el bot de pedidos. Este módulo permitirá controlar el ciclo de vida de la conexión sin necesidad de acceder al servidor.

### Objetivos

* Permitir al proveedor gestionar su propia instancia de WhatsApp.
* Facilitar la recuperación ante desconexiones o cambios de dispositivo.
* Mostrar en tiempo real el estado de conexión del bot.
* Evitar la intervención del Superuser para tareas operativas diarias.

### Funcionalidades

#### Estado de la conexión

El sistema mostrará el estado actual de la instancia de WhatsApp del proveedor.

Estados soportados:

* **Disconnected** – La instancia no está iniciada.
* **Starting** – El servicio está iniciando.
* **Waiting QR** – Esperando que el proveedor escanee el código QR.
* **Connected** – WhatsApp conectado y operativo.
* **Reconnecting** – Intentando recuperar la conexión.
* **Authentication Failed** – Error durante la autenticación.
* **Stopped** – Instancia detenida manualmente.

El estado deberá actualizarse en tiempo real mediante Socket.IO.

### Operaciones Disponibles

El proveedor podrá ejecutar las siguientes acciones desde el panel de administración:

#### Iniciar Bot

Inicia la instancia de `whatsapp-web.js` correspondiente al proveedor.

Si la sesión no existe o expiró, el backend solicitará la generación de un nuevo código QR.

#### Detener Bot

Finaliza la instancia de WhatsApp de forma controlada, manteniendo la sesión almacenada para permitir una futura reconexión.

Mientras el bot permanezca detenido:

* No se enviarán mensajes.
* No se recibirán pedidos desde WhatsApp.
* No se procesarán eventos entrantes.

#### Reiniciar Bot

Detiene e inicia nuevamente la instancia.

Esta operación será utilizada para recuperar conexiones inestables sin eliminar la sesión existente.

#### Desvincular WhatsApp

Elimina completamente la sesión autenticada del proveedor.

Al ejecutar esta acción:

* Se eliminarán las credenciales almacenadas.
* La próxima conexión requerirá escanear nuevamente un código QR.
* No se perderá ninguna información de pedidos ni configuración del proveedor.

Esta operación requerirá una confirmación explícita del usuario.

### Código QR

Cuando la instancia requiera autenticación, el backend generará un código QR que será enviado en tiempo real al frontend mediante Socket.IO.

El QR únicamente será visible para usuarios administradores del proveedor.

### Arquitectura

El microservicio de WhatsApp será responsable de administrar una instancia independiente de `whatsapp-web.js` para cada proveedor.

Cada instancia mantendrá de forma aislada:

* Sesión autenticada.
* Estado de conexión.
* Cola de mensajes.
* Eventos recibidos.
* Configuración propia del proveedor.

La comunicación entre NestJS y el microservicio de WhatsApp se realizará mediante HTTP interno y eventos, manteniendo desacoplada la lógica del bot respecto al backend principal.

### Persistencia de Sesiones WhatsApp

Las sesiones de `whatsapp-web.js` NO serán almacenadas en la base de datos.

Cada proveedor tendrá una carpeta exclusiva asociada a su `provider_id`.

Estructura:

```text
/storage
└── whatsapp
    ├── a67e1f0d-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    │   ├── Default
    │   ├── IndexedDB
    │   ├── Local Storage
    │   └── Session Data
    │
    ├── b57d4c7a-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    │   ├── Default
    │   ├── IndexedDB
    │   └── Local Storage
```

La carpeta deberá crearse automáticamente durante el registro inicial del proveedor o durante la primera inicialización de la instancia de WhatsApp.

La ruta estará basada en:

```typescript
/storage/whatsapp/{provider_id}
```

Ejemplo:

```typescript
/storage/whatsapp/3d16dd1f-1790-4f92-8c20-6f0f9e6c9253
```

Cada proveedor tendrá:

- Sesión independiente.
- Credenciales independientes.
- Caché independiente.
- Estado independiente.

La eliminación de una sesión mediante la opción "Desvincular WhatsApp" deberá eliminar completamente la carpeta asociada al proveedor.

La eliminación de una sesión nunca deberá afectar otras instancias de WhatsApp.

### Endpoints

| Método | Endpoint                                  | Descripción                                                            |
| ------ | ----------------------------------------- | ---------------------------------------------------------------------- |
| GET    | `/providers/:providerId/whatsapp/status`  | Obtiene el estado de la instancia.                                     |
| POST   | `/providers/:providerId/whatsapp/start`   | Inicia el bot.                                                         |
| POST   | `/providers/:providerId/whatsapp/stop`    | Detiene el bot.                                                        |
| POST   | `/providers/:providerId/whatsapp/restart` | Reinicia el bot.                                                       |
| POST   | `/providers/:providerId/whatsapp/unlink`  | Elimina la sesión y solicita una nueva vinculación.                    |
| GET    | `/providers/:providerId/whatsapp/qr`      | Obtiene el código QR cuando la instancia está esperando autenticación. |

### Eventos Socket.IO

El backend emitirá los siguientes eventos en tiempo real:

* `whatsapp-status-changed`
* `whatsapp-qr-generated`
* `whatsapp-connected`
* `whatsapp-disconnected`
* `whatsapp-authentication-failed`
* `whatsapp-message-sent`
* `whatsapp-message-received`

### Seguridad

* Cada proveedor únicamente podrá administrar su propia instancia de WhatsApp.
* El Superuser podrá visualizar y administrar todas las instancias.
* Todas las operaciones de inicio, detención, reinicio y desvinculación deberán registrarse en el log de auditoría del sistema.
* Nunca se expondrán las credenciales de autenticación ni los archivos de sesión al frontend.


---

## 🏗️ 3. Arquitectura Técnica

### 3.1 Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| Frontend | React 18 + Vite + TypeScript (`strict`) + Tailwind CSS + shadcn/ui |
| Estado/datos remotos | TanStack Query (React Query) para fetch/cache de API REST |
| Tiempo real (cliente) | `socket.io-client` |
| Backend | NestJS (Modules, Controllers, Services, Gateways) |
| ORM | TypeORM sobre PostgreSQL |
| Base de datos | PostgreSQL local (Docker Compose: `postgres:16`) |
| Tiempo real (servidor) | `@nestjs/websockets` + `socket.io` |
| Autenticación | `@nestjs/jwt` + `passport-jwt`; Magic Link con token firmado propio |
| Validación | `class-validator` + `class-transformer` en todos los DTOs |
| Bot de WhatsApp | `whatsapp-web.js` en microservicio Node separado, comunicado por HTTP interno o cola (BullMQ/Redis opcional) |
| Contenerización dev | Docker Compose (`postgres`, `backend`, `whatsapp-bot`) |

### 3.2 Patrones de Diseño a Aplicar

Para evitar que la IA improvise arquitecturas distintas en cada módulo, se fija el siguiente set de patrones:

- **Repository Pattern:** todo acceso a datos pasa por repositorios de TypeORM inyectados en los `Service`, nunca queries sueltas en los `Controller`.
- **DTO + Validation Pattern:** cada endpoint tiene un DTO de entrada (`class-validator`) y un DTO de salida (mapeo explícito, nunca se devuelve la entidad de TypeORM cruda).
- **Dependency Injection:** nativa de NestJS; los servicios se inyectan por constructor, nunca se instancian con `new` dentro de otro servicio.
- **Module Pattern:** un `Module` de NestJS por dominio (`ProvidersModule`, `OrdersModule`, `MenusModule`, `AuthModule`, `WhatsappModule`), cada uno exporta solo lo necesario.
- **Strategy Pattern:** para el control de stock (`process_order_with_stock_check`) y para los distintos métodos de pago (`payment_status`), de modo que agregar un nuevo método no rompa el flujo existente.
- **Observer/Event Emitter Pattern:** los cambios de estado de pedidos y stock se publican como eventos internos (`@nestjs/event-emitter`) que a su vez alimentan el Gateway de WebSockets y el envío de WhatsApp, desacoplando "qué pasó" de "quién reacciona".
- **Factory Pattern:** para la construcción de mensajes de WhatsApp (`WhatsappMessageFactory`), centralizando el formato según el tipo de evento (nuevo pedido, cancelación, etc.).
- **Adapter Pattern:** el módulo de WhatsApp expone una interfaz `IWhatsappSender` interna; la implementación concreta con `whatsapp-web.js` queda aislada detrás de esa interfaz para poder reemplazarla sin tocar el resto del backend.

---

## 🔒 4. Convenciones de TypeScript (Fuertemente Tipado)

Reglas obligatorias para frontend y backend:

1. **`tsconfig.json` con modo estricto:**
   ```jsonc
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "noUncheckedIndexedAccess": true,
       "exactOptionalPropertyTypes": true,
       "noImplicitOverride": true,
       "noFallthroughCasesInSwitch": true,
       "forceConsistentCasingInFileNames": true
     }
   }
   ```
2. **Prohibido `any`.** Si el tipo real se desconoce (ej. payload externo de WhatsApp), se define una interfaz o un `unknown` con *type guard* explícito antes de usarlo.
3. **Un tipo/interfaz por entidad de dominio**, compartido entre DTOs de request/response cuando aplique (se recomienda un paquete `@lunchsync/types` o carpeta `shared-types` si los repos lo permiten).
4. **Enums explícitos** para campos de estado en vez de `string` libre:
   ```typescript
   export enum OrderStatus {
     Pending = 'pending',
     Accepted = 'accepted',
     InPreparation = 'in_preparation',
     Delivered = 'delivered',
     Cancelled = 'cancelled',
   }

   export enum PaymentStatus {
     Unpaid = 'unpaid',
     Paid = 'paid',
     PayrollDeduction = 'payroll_deduction',
   }
   ```
5. **DTOs tipados con `class-validator`:**
   ```typescript
   import { IsUUID, IsArray, IsDecimal, IsOptional, IsString } from 'class-validator';

   export class CreateOrderDto {
     @IsUUID()
     dailyMenuId!: string;

     @IsUUID()
     deliveryZoneId!: string;

     @IsUUID()
     menuServiceId!: string;

     @IsArray()
     @IsUUID('4', { each: true })
     selectedOptionIds!: string[];

     @IsOptional()
     @IsString()
     specialInstructions?: string;
   }
   ```
6. **Nunca tipar respuestas de `fetch`/`axios` como `any`**; se define siempre una interfaz de respuesta (`ApiResponse<T>`) y se valida con un *type guard* o `zod` si el payload viene de un tercero (ej. WhatsApp).

---

## 🗄️ 5. Modelo de Datos (PostgreSQL local)

### 5.1 Convenciones de Nomenclatura
- **Tablas y columnas:** en inglés y `snake_case` (`providers`, `daily_menus`, `orders`, etc.).
- **Tipos de datos:** claves primarias `UUID`, fechas con zona horaria `TIMESTAMPTZ`.
- Este esquema es PostgreSQL estándar (no depende de ninguna extensión propietaria de Supabase); se ejecuta igual en una instancia local vía Docker.

### 5.1.1 Convención Multi-Tenant

Las siguientes tablas pertenecen a un proveedor y deben incluir aislamiento por tenant:

- providers
- provider_accounts
- provider_bots
- delivery_zones
- daily_menus
- menu_services
- combo_groups
- combo_options
- orders
- whatsapp_logs
- audit_logs

Todas las consultas sobre estas tablas deberán filtrar por `provider_id`.


### 5.2 Esquema de Base de Datos (DDL)

```sql
-- Habilitar extensión UUID (disponible en PostgreSQL estándar)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROVEEDORES (Multi-tenant)
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. USUARIOS PROVEEDORES (login con credenciales, no confundir con "users"/empleados)
CREATE TABLE provider_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) DEFAULT 'operator',
    last_login TIMESTAMPTZ NULL,
    failed_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ NULL,
    password_changed_at TIMESTAMPTZ NULL,
    full_name VARCHAR(150) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. BOTS Y CONFIGURACIÓN DE WHATSAPP POR PROVEEDOR
CREATE TABLE provider_bots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    whatsapp_group_id VARCHAR(100) NOT NULL,
    session_folder_path VARCHAR(500) NULL,
    session_folder_name VARCHAR(200) NULL,
    client_version VARCHAR(50) NULL,
    is_online BOOLEAN DEFAULT FALSE,
    last_connected_at TIMESTAMPTZ NULL,
    last_disconnected_at TIMESTAMPTZ NULL,
    disconnect_reason TEXT NULL,
    last_qr_generated_at TIMESTAMPTZ NULL,
    last_message_at TIMESTAMPTZ NULL,
    bot_status VARCHAR(50) DEFAULT 'disconnected',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. ZONAS DE DISTRIBUCIÓN
CREATE TABLE delivery_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    zone_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. USUARIOS / EMPLEADOS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    employee_code VARCHAR(50) NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. TOKENS DE ACCESO SEGURO (Magic Links, emitidos y validados por NestJS)
CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    jti UUID NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    revoked_at TIMESTAMPTZ NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. MENÚS DIARIOS POR PROVEEDOR
CREATE TABLE daily_menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    serving_date DATE NOT NULL,
    published_at TIMESTAMPTZ NULL,
    order_cutoff_time TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_provider_date UNIQUE (provider_id, serving_date)
);

-- 8. SERVICIOS / COMBOS DEL MENÚ
CREATE TABLE menu_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    daily_menu_id UUID NOT NULL REFERENCES daily_menus(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_stock INT DEFAULT NULL,
    remaining_stock INT DEFAULT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. GRUPOS DE COMPONENTES DEL PLATO
CREATE TABLE combo_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_service_id UUID NOT NULL REFERENCES menu_services(id) ON DELETE CASCADE,
    group_name VARCHAR(100) NOT NULL, -- ej: "Arroz", "Carne", "Habichuela", "Ensalada"
    is_required BOOLEAN DEFAULT TRUE,
    min_select INT DEFAULT 1,
    max_select INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. OPCIONES DISPONIBLES DENTRO DE CADA GRUPO
CREATE TABLE combo_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    combo_group_id UUID NOT NULL REFERENCES combo_groups(id) ON DELETE CASCADE,
    option_name VARCHAR(150) NOT NULL, -- ej: "Arroz Blanco", "Moro Rojo", "Cerdo BBQ"
    extra_price DECIMAL(10, 2) DEFAULT 0.00,
    initial_stock INT DEFAULT NULL,
    stock_quantity INT DEFAULT NULL,
    is_unlimited BOOLEAN DEFAULT TRUE,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. PEDIDOS
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(20) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id),
    provider_id UUID NOT NULL REFERENCES providers(id),
    daily_menu_id UUID NOT NULL REFERENCES daily_menus(id),
    delivery_zone_id UUID NOT NULL REFERENCES delivery_zones(id),
    employee_name VARCHAR(150) NOT NULL,
    employee_phone VARCHAR(20) NOT NULL,
    provider_name VARCHAR(150) NOT NULL,
    delivery_zone_name VARCHAR(100) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    order_status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, in_preparation, delivered, cancelled
    payment_status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, paid, payroll_deduction
    special_instructions TEXT NULL,
    confirmed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_verifications (
    id UUID PRIMARY KEY,
    auth_token_id UUID NOT NULL,
    verification_type VARCHAR(50),
    code_hash VARCHAR(255),
    expires_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    attempts INT DEFAULT 0,
    created_at TIMESTAMPTZ
);

-- 12. DETALLE DEL PEDIDO
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_service_id UUID NOT NULL REFERENCES menu_services(id),
    service_name VARCHAR(150) NOT NULL,
    service_description TEXT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 13. SELECCIONES ESPECÍFICAS DE COMBOS
CREATE TABLE order_item_selections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    combo_group_id UUID NOT NULL REFERENCES combo_groups(id),
    combo_option_id UUID NOT NULL REFERENCES combo_options(id),
    group_name VARCHAR(100) NOT NULL,
    option_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 14. LOGS DE NOTIFICACIONES
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NULL REFERENCES providers(id),
    user_id UUID NULL REFERENCES users(id),
    entity VARCHAR(100) NOT NULL,
    entity_id UUID NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSONB NULL,
    new_values JSONB NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id),
    order_id UUID NULL REFERENCES orders(id),
    recipient_phone_or_group VARCHAR(100) NOT NULL,
    message_type VARCHAR(50) NOT NULL,
    message_payload TEXT NOT NULL,
    response_payload TEXT NULL,
    error_message TEXT NULL,
    attempts INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'sent',
    sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

> Nota: se agregó la tabla `provider_accounts` (ausente en la versión original) porque el documento original mencionaba login por email/password para proveedores pero no tenía tabla de credenciales; se deja explícita aquí para que la IA no la invente de forma distinta en cada corrida.

---

## ⚙️ 6. Función Almacenada para Control Atómico de Stock

Se mantiene como función **PL/pgSQL nativa de PostgreSQL** (no es una particularidad de Supabase, corre igual en local). Se invoca desde el `OrdersService` de NestJS con TypeORM (`query()` o `dataSource.query`) dentro de una transacción.

```sql
CREATE OR REPLACE FUNCTION process_order_with_stock_check(
    p_user_id UUID,
    p_provider_id UUID,
    p_daily_menu_id UUID,
    p_delivery_zone_id UUID,
    p_menu_service_id UUID,
    p_selected_option_ids UUID[],
    p_total_amount DECIMAL(10, 2),
    p_order_number VARCHAR(20),
    p_special_instructions TEXT
) RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_order_item_id UUID;
    v_option_id UUID;
    v_opt RECORD;
BEGIN
    -- 1. Validar disponibilidad y decrementar stock de opciones limitadas
    FOREACH v_option_id IN ARRAY p_selected_option_ids LOOP
        SELECT id, option_name, stock_quantity, is_unlimited, is_available
        INTO v_opt
        FROM combo_options
        WHERE id = v_option_id FOR UPDATE;

        IF NOT v_opt.is_available THEN
            RAISE EXCEPTION 'La opción "%" ya no está disponible.', v_opt.option_name;
        END IF;

        IF NOT v_opt.is_unlimited THEN
            IF v_opt.stock_quantity < 1 THEN
                RAISE EXCEPTION 'La opción "%" se ha agotado.', v_opt.option_name;
            END IF;

            UPDATE combo_options
            SET stock_quantity = stock_quantity - 1,
                is_available = CASE WHEN (stock_quantity - 1) <= 0 THEN FALSE ELSE TRUE END
            WHERE id = v_option_id;
        END IF;
    END LOOP;

    -- 2. Crear la orden principal
    INSERT INTO orders (
        order_number, user_id, provider_id, daily_menu_id, delivery_zone_id,
        total_amount, order_status, payment_status, special_instructions
    ) VALUES (
        p_order_number, p_user_id, p_provider_id, p_daily_menu_id, p_delivery_zone_id,
        p_total_amount, 'pending', 'payroll_deduction', p_special_instructions
    ) RETURNING id INTO v_order_id;

    -- 3. Crear el detalle del servicio
    INSERT INTO order_items (order_id, menu_service_id, quantity, unit_price, subtotal)
    VALUES (v_order_id, p_menu_service_id, 1, p_total_amount, p_total_amount)
    RETURNING id INTO v_order_item_id;

    -- 4. Guardar selecciones
    INSERT INTO order_item_selections (order_item_id, combo_group_id, combo_option_id, group_name, option_name)
    SELECT
        v_order_item_id,
        co.combo_group_id,
        co.id,
        cg.group_name,
        co.option_name
    FROM combo_options co
    JOIN combo_groups cg ON cg.id = co.combo_group_id
    WHERE co.id = ANY(p_selected_option_ids);

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;
```

Después de ejecutar la función, el `OrdersService` debe emitir un evento interno (`OrderCreatedEvent`) que dispara: (a) la notificación por WebSocket a los clientes conectados a ese `daily_menu_id`, y (b) el mensaje al bot de WhatsApp.

---

## ⚡ 7. Tiempo Real: Gateway de WebSockets en NestJS (reemplazo de Supabase Realtime)

### 7.1 Backend — Gateway

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface ComboOptionUpdatedPayload {
  optionId: string;
  isAvailable: boolean;
  stockQuantity: number | null;
}

@WebSocketGateway({ cors: { origin: true }, namespace: '/realtime' })
export class MenuRealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    const dailyMenuId = client.handshake.query['dailyMenuId'];
    if (typeof dailyMenuId === 'string') {
      client.join(`menu-realtime-${dailyMenuId}`);
    }
  }

  handleDisconnect(_client: Socket): void {
    // Limpieza si aplica
  }

  emitComboOptionUpdate(dailyMenuId: string, payload: ComboOptionUpdatedPayload): void {
    this.server.to(`menu-realtime-${dailyMenuId}`).emit('combo-option-updated', payload);
  }
}
```

El `OrdersService`/`MenuService` inyecta `MenuRealtimeGateway` y llama `emitComboOptionUpdate(...)` cada vez que `process_order_with_stock_check` decrementa stock, en lugar de depender de un trigger de Supabase Realtime.

### 7.2 Frontend — Hook de React (Vite)

```tsx
import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

interface ComboOption {
  id: string;
  optionName: string;
  isAvailable: boolean;
  stockQuantity: number | null;
}

interface ComboOptionUpdatedPayload {
  optionId: string;
  isAvailable: boolean;
  stockQuantity: number | null;
}

interface MenuSelectionProps {
  initialOptions: ComboOption[];
  dailyMenuId: string;
}

export function MenuSelection({ initialOptions, dailyMenuId }: MenuSelectionProps): JSX.Element {
  const [options, setOptions] = useState<ComboOption[]>(initialOptions);

  useEffect(() => {
    const socket: Socket = io(`${import.meta.env.VITE_API_WS_URL}/realtime`, {
      query: { dailyMenuId },
    });

    socket.on('combo-option-updated', (payload: ComboOptionUpdatedPayload) => {
      setOptions((prev) =>
        prev.map((opt) =>
          opt.id === payload.optionId
            ? { ...opt, isAvailable: payload.isAvailable, stockQuantity: payload.stockQuantity }
            : opt,
        ),
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [dailyMenuId]);

  return (
    <div className="grid gap-4 px-4">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          disabled={!opt.isAvailable}
          className={`ios-card p-4 rounded-2xl border transition-all active:scale-[0.97] ${
            opt.isAvailable
              ? 'bg-white border-gray-200 shadow-sm'
              : 'bg-gray-100 opacity-50 cursor-not-allowed'
          }`}
        >
          <span className="text-[15px] font-medium">{opt.optionName}</span>
          {!opt.isAvailable && (
            <span className="ml-2 text-red-500 font-semibold text-[13px]">(Agotado)</span>
          )}
        </button>
      ))}
    </div>
  );
}
```

---

## 📱 8. Lenguaje Visual Nativo iOS

Para que la web app "se sienta" como una app nativa de iOS (no solo responsive):

1. **Tipografía:** usar el stack de sistema `-apple-system, "SF Pro Text", "SF Pro Display", system-ui`.
2. **Safe areas:** respetar `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` en el layout raíz, especialmente para tab bar inferior y notch.
3. **Navegación:** tab bar inferior fija (Menú, Pedidos, Historial, Perfil) + header superior tipo "large title" que se colapsa al hacer scroll, como en apps nativas iOS.
4. **Gestos y transiciones:** transiciones de push/pop tipo iOS (slide horizontal) entre pantallas, usar `framer-motion` con curvas de easing tipo `cubic-bezier(0.32, 0.72, 0, 1)` (la curva estándar de UINavigationController).
5. **Componentes:** listas tipo "grouped" de iOS (bordes redondeados, separadores sutiles), botones con estado `active:scale-[0.97]` para simular el feedback táctil, modales tipo "sheet" que suben desde abajo.
6. **PWA instalable:** `manifest.json` con `display: "standalone"`, íconos para pantalla de inicio, y meta tags `apple-mobile-web-app-capable` para que al agregarse a la pantalla de inicio se vea sin barra de navegador.
7. **Modo oscuro:** soportar `prefers-color-scheme: dark` con la paleta de grises de iOS (`#000`, `#1C1C1E`, `#2C2C2E`).

Esto se documenta como lineamiento; la implementación detallada de componentes puede apoyarse en shadcn/ui + Tailwind, ajustando tokens de diseño (radios, sombras, tipografía) a los valores anteriores.

---

## 📂 9. Estructura de Proyectos (Repositorios Separados)

### 9.1 `lunchsync-backend` (NestJS)
```
src/
├── modules/
│   ├── auth/                  # JWT, Magic Link, guards y estrategias Passport
│   ├── providers/              # CRUD de proveedores (solo Superuser)
│   ├── provider-accounts/      # Cuentas de proveedores (login email/password)
│   ├── menus/                  # daily_menus, menu_services, combo_groups, combo_options
│   ├── orders/                 # orders, order_items, order_item_selections + función de stock
│   ├── delivery-zones/
│   ├── whatsapp/               # Adapter hacia el microservicio whatsapp-web.js
│   └── realtime/               # MenuRealtimeGateway (Socket.IO)
├── common/
│   ├── dto/                    # DTOs compartidos
│   ├── enums/                  # OrderStatus, PaymentStatus, BotStatus
│   ├── guards/
│   └── interceptors/
├── config/                     # Configuración tipada (env, TypeORM)
└── main.ts
```

### 9.2 `lunchsync-frontend` (React + Vite)
```
src/
├── pages/
│   ├── auth/                   # Pantalla de validación de Magic Link
│   ├── employee/
│   │   ├── menu/               # Armado de plato y selección de zona
│   │   └── history/            # Historial de pedidos y estado de pago
│   └── admin/
│       └── dashboard/          # Panel del proveedor: aceptar/rechazar, métricas
├── components/
│   ├── ui/                     # Componentes base (botones, modales, badges) estilo iOS
│   ├── menu/                   # Armador interactivo de combos y selector de zona
│   └── realtime/               # Hook/provider de Socket.IO
├── lib/
│   ├── api/                    # Cliente HTTP tipado hacia NestJS (axios/fetch + tipos)
│   └── socket/                 # Configuración de socket.io-client
├── types/                      # Tipos e interfaces compartidos (sin `any`)
└── main.tsx
```

### 9.3 `lunchsync-whatsapp-bot` (microservicio Node independiente)
```
src/
├── client.ts                   # Inicialización de whatsapp-web.js
├── message-factory.ts          # Factory de mensajes salientes
├── api/                        # Endpoints internos que el backend NestJS invoca
└── index.ts
```

---

## 📋 10. Checklist de Implementación

- [ ] Levantar PostgreSQL local (Docker Compose) e instalar el esquema DDL de la sección 5.
- [ ] Configurar TypeORM en NestJS apuntando a la instancia local (sin SDK de Supabase).
- [ ] Implementar `MenuRealtimeGateway` con Socket.IO para reemplazar Supabase Realtime.
- [ ] Configurar la función almacenada `process_order_with_stock_check` en la base local.
- [ ] Implementar `AuthModule`: JWT para proveedores/superuser y Magic Link para empleados.
- [ ] Levantar el microservicio `whatsapp-web.js` y conectar el `WhatsappModule` del backend vía adapter.
- [ ] Configurar el evento `OrderCreatedEvent` para disparar WebSocket + notificación de WhatsApp al aceptar un pedido.
- [ ] Activar `strict: true` y cero `any` en ambos repos (frontend y backend) como gate de CI.
- [ ] Aplicar lineamientos de diseño nativo iOS (sección 8) en los componentes base antes de construir pantallas específicas.
