# Plan Completo de Implementación — LunchSync

> Generado: 2026-07-24
> Basado en: README.md (especificación técnica) + revisión de código fuente
> Actualizado: Sin Docker — ejecución local directa

---

## 📊 Estado Actual del Proyecto

### Arquitectura General
```
┌─────────────────────────────────────────────────────────────────┐
│                        LUNCHSYNC                                │
├─────────────────┬─────────────────────┬─────────────────────────┤
│  FRONTEND       │  BACKEND            │  WHATSAPP BOT           │
│  React + Vite   │  NestJS             │  Express +              │
│  Puerto 5173    │  Puerto 3000        │  whatsapp-web.js        │
│                 │                     │  Puerto 3001            │
└─────────────────┴─────────────────────┴─────────────────────────┘
         │                  │                      │
         │           ┌──────┴──────┐               │
         │           │  PostgreSQL │               │
         │           │  Puerto 5432│               │
         │           └─────────────┘               │
         │                                         │
         └──────────── HTTP ───────────────────────┘
                    (API REST)
```

### Repositorios
| Repositorio | Tecnología | Estado |
|-------------|------------|--------|
| `lunchsync-frontend` | React 19 + Vite + Tailwind | ✅ Inicializado |
| `lunchsync-backend` | NestJS + TypeORM | ✅ Inicializado |
| `lunchsync-whatsapp-bot` | Express + whatsapp-web.js | ✅ Inicializado |

---

## ⚠️ Cambio Importante: WhatsApp LID (Linked Device ID)

### Contexto
WhatsApp Web JS ya **no usa números de teléfono** como identificadores. Ahora usa **LIDs** (Linked Device IDs):
- **Usuarios:** `author: '137061734588514@lid'` (identificador único por dispositivo vinculado)
- **Grupos:** `from: '120363429839867374@g.us'` (ID del grupo)

### Ejemplo de mensaje WhatsApp
```javascript
{
  timestamp: 1785020609,
  from: '120363429839867374@g.us',      // ← WhatsApp Group ID
  to: '18293839651@c.us',               // ← Bot number
  author: '137061734588514@lid',        // ← User LID (no phone!)
  deviceType: 'android',
  isForwarded: false,
  body: '!pedir'
}
```

### Cambios Requeridos

#### 1. Tabla `users` (DDL)
```sql
-- AGREGAR campo whatsapp_lid
ALTER TABLE users ADD COLUMN whatsapp_lid VARCHAR(100) UNIQUE;

-- HACER phone_number nullable (ya no es obligatorio)
ALTER TABLE users ALTER COLUMN phone_number DROP NOT NULL;
```

#### 2. Entidad TypeORM (`User.entity.ts`)
```typescript
@Column({ type: 'varchar', length: 100, name: 'whatsapp_lid', unique: true, nullable: true })
whatsappLid!: string | null;

@Column({ type: 'varchar', length: 20, name: 'phone_number', unique: true, nullable: true })
phoneNumber!: string | null;
```

#### 3. UsersService — Nuevos métodos
```typescript
async findByWhatsappLid(lid: string): Promise<User | null> {
  return this.userRepo.findOne({ where: { whatsappLid: lid } });
}

async createPendingUserByLid(lid: string): Promise<User> {
  const user = this.userRepo.create({
    whatsappLid: lid,
    fullName: `Empleado ${lid.slice(0, 8)}`,
  });
  return this.userRepo.save(user);
}
```

#### 4. BotController — Cambio en parámetros
```typescript
// ANTES:
@Body() body: { phoneNumber: string; providerId: string }

// DESPUÉS:
@Body() body: { author: string; whatsappGroupId: string; providerId: string }
```

#### 5. WhatsApp Bot — Extraer datos del mensaje
```typescript
client.on('message', async (msg) => {
  if (!msg.from.endsWith('@g.us')) return;
  
  const author = msg.author || '';           // ← User LID
  const whatsappGroupId = msg.from;          // ← Group ID
  
  // Llamar al backend con estos datos
  await axios.post(`${BACKEND_URL}/bot/magic-link`, {
    author,
    whatsappGroupId,
    providerId,
  }, {
    headers: { 'x-bot-secret': BOT_SECRET }
  });
});
```

#### 6. Frontend — Registro opcional
```typescript
// EmployeeRegisterPage.tsx
// Agregar campo opcional de teléfono
<input
  type="tel"
  value={phoneNumber}
  onChange={(e) => setPhoneNumber(e.target.value)}
  placeholder="Tu teléfono (opcional)"
/>
```

### Historia de Usuario: Solicitud de Menú por WhatsApp

**Como** empleado/usuario del grupo de WhatsApp,
**quiero** poder solicitar mi menú escribiendo un comando en el grupo,
**para que** se me envíe un link privado de acceso seguro.

#### Criterios de Aceptación
1. El usuario escribe un comando en el grupo (ej: `!pedir`, `!almuerzo`)
2. El sistema identifica al usuario por su `author` (LID privado)
3. El sistema envía el link **SOLO al usuario** (chat privado)
4. El sistema confirma en el grupo: "Se te envió un link privado 📩"
5. Otros usuarios **NO** ven ni pueden usar el link
6. Si el usuario ya está registrado → accede directo al menú
7. Si es nuevo → completa nombre y teléfono → accede al menú

#### Flujo de Implementación

```
┌─────────────────────────────────────────────────────────────────┐
│  1. USUARIO ESCRIBE EN GRUPO WhatsApp                          │
│     msg.author = '137061734588514@lid' (LID privado)           │
│     msg.from = '120363429839867374@g.us' (grupo)               │
│     msg.body = '!pedir'                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. BOT IDENTIFICA AL USUARIO POR SU author (LID)              │
│     No usa número de teléfono, usa el LID único                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. BOT LLAMA AL BACKEND                                       │
│     POST /bot/magic-link                                       │
│     { author, whatsappGroupId, providerId }                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. BACKEND BUSCA/CREA USUARIO POR LID                         │
│     - Si existe → genera magic link                            │
│     - Si no existe → crea usuario pendiente con LID            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. BOT ENVÍA LINK EN PRIVADO                                  │
│     → Chat privado SOLO con el usuario (no en el grupo)        │
│     → Link: /employee/auth?token=xxx&jti=yyy                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. BOT CONFIRMA EN GRUPO                                      │
│     → "Se te envió un link privado 📩"                         │
│     → NO expone el link a otros usuarios                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. USUARIO ABRE EL LINK                                        │
│     → Frontend valida token                                    │
│     → Si registrado → JWT → redirect /employee/menu            │
│     → Si NO registrado → redirect /employee/register           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  8. FORMULARIO DE REGISTRO (solo nuevos usuarios)              │
│     → Nombre completo *                                        │
│     → Teléfono (opcional)                                      │
│     → Al completar → crear usuario con LID → JWT → menú        │
└─────────────────────────────────────────────────────────────────┘
```

#### Seguridad
| Aspecto | Implementación |
|---------|----------------|
| **Link privado** | Se envía SOLO al usuario via chat privado de WhatsApp |
| **No exposición en grupo** | El link NUNCA aparece en el grupo |
| **Confirmación en grupo** | Solo "Se te envió un link" (sin URL) |
| **Identificación** | Por `author` (LID), no por teléfono |
| **Replay attacks** | Token de un solo uso con `jti` único |
| **Expiración** | Token expira en 10 horas |

---

## 🔍 Levantamiento Detallado por Módulo

### 1. BACKEND (`lunchsync-backend`)

#### 1.1 Configuración Base
| Archivo | Estado | Detalle |
|---------|--------|---------|
| `tsconfig.json` | ⚠️ | `strict: true` pero faltan flags: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` |
| `.env` | ✅ | DB, JWT, WHATSAPP_BOT_URL configurados |
| `database.config.ts` | ✅ | TypeORM con PostgreSQL, `synchronize: false` |
| `entities.ts` | ✅ | 16 entidades registradas |
| `app.module.ts` | ✅ | Todos los módulos importados |

#### 1.2 Módulos Implementados

| Módulo | Controllers | Services | Entities | Estado |
|--------|-------------|----------|----------|--------|
| **auth** | `AuthController` | `AuthService` | `AuthToken`, `UserVerification` | ✅ |
| **providers** | `ProvidersController` | `ProvidersService` | `Provider` | ✅ |
| **provider-accounts** | `ProviderAccountsController` | `ProviderAccountsService` | `ProviderAccount` | ✅ |
| **provider-bots** | - | - | `ProviderBot` | ✅ |
| **users** | - | `UsersService` | `User` | ✅ |
| **menus/daily-menus** | `DailyMenusController` | `DailyMenusService` | `DailyMenu` | ✅ |
| **menus/menu-services** | `MenuServicesController` | `MenuServicesService` | `MenuService` | ✅ |
| **menus/combo-groups** | `ComboGroupsController` | `ComboGroupsService` | `ComboGroup` | ✅ |
| **menus/combo-options** | `ComboOptionsController` | `ComboOptionsService` | `ComboOption` | ✅ |
| **orders** | `OrdersController` | `OrdersService` | `Order`, `OrderItem`, `OrderItemSelection` | ✅ |
| **delivery-zones** | `DeliveryZonesController` | `DeliveryZonesService` | `DeliveryZone` | ✅ |
| **whatsapp** | `WhatsappController` | `WhatsappService` | `WhatsappLog` | ✅ |
| **realtime** | - | - | - | ✅ |
| **bot** | `BotController` | - | - | ✅ |
| **audit** | - | - | `AuditLog` | ✅ |
| **employee** | `EmployeeController` | `EmployeeService` | - | ✅ |

#### 1.3 Autenticación
| Componente | Estado |
|------------|--------|
| JWT Strategy (`passport-jwt`) | ✅ |
| `JwtAuthGuard` | ✅ |
| `RolesGuard` | ✅ |
| Login (`POST /auth/login`) | ✅ |
| Magic Link Generate | ✅ |
| Magic Link Validate | ✅ |
| Complete Registration | ✅ |

#### 1.4 Integración WhatsApp (Backend ↔ Bot)

**Flujo de comunicación:**
```
┌──────────────────┐         HTTP POST/GET        ┌──────────────────────┐
│                  │ ──────────────────────────▶  │                      │
│  NestJS Backend  │    /api/start, /api/send     │  WhatsApp Bot        │
│  (WhatsappModule)│ ◀──────────────────────────  │  (Express:3001)      │
│                  │    { status, success }        │                      │
└────────┬─────────┘                              └──────────┬───────────┘
         │                                                   │
         │  EventEmitter2                                    │  whatsapp-web.js
         │  (order.created,                                  │  (Client)
         │   order.accepted,                                 │
         │   order.cancelled)                                │
         ▼                                                   ▼
┌──────────────────┐                              ┌──────────────────────┐
│  OrderWhatsApp   │ ─── sendRawMessage ───────▶ │  Grupo WhatsApp      │
│  Listener        │                              │  del Proveedor       │
└──────────────────┘                              └──────────────────────┘

┌──────────────────┐    POST /bot/magic-link     ┌──────────────────────┐
│  WhatsApp Bot    │ ──────────────────────────▶ │  NestJS Backend      │
│  (on message)    │    { author, groupId,        │  BotController       │
│                  │      providerId }            │                      │
└──────────────────┘                              └──────────────────────┘
         │
         │  1. Enviar link por PRIVADO (chat individual)
         │  2. Confirmar en GRUPO "Se te envió link"
         ▼
┌──────────────────┐
│  WhatsApp        │
│  - Privado: link │ ◀── Solo usuario ve el link
│  - Grupo: msg    │ ◀── "Se te envió link privado 📩"
└──────────────────┘
```

**Adapter HTTP (`HttpWhatsappSender`):**
| Método | Endpoint Bot | Estado |
|--------|--------------|--------|
| `sendMessage()` | `POST /api/send` | ✅ |
| `getStatus()` | `GET /api/status/:providerId` | ✅ |
| `start()` | `POST /api/start/:providerId` | ✅ |
| `stop()` | `POST /api/stop/:providerId` | ✅ |
| `restart()` | `POST /api/restart/:providerId` | ✅ |
| `unlink()` | `POST /api/unlink/:providerId` | ✅ |
| `getQr()` | `GET /api/qr/:providerId` | ✅ |

**Eventos Internos (NestJS EventEmitter2):**
| Evento | Listener | Acción |
|--------|----------|--------|
| `order.created` | `OrderWhatsAppListener` | Envía notificación al grupo |
| `order.created` | `OrderWebSocketListener` | Emite `combo-option-updated` |
| `order.accepted` | `OrderWhatsAppListener` | Envía confirmación al grupo |
| `order.cancelled` | `OrderWhatsAppListener` | Envía cancelación al grupo |

**Gateway WebSocket (`WhatsappGateway`):**
| Evento | Namespace | Estado |
|--------|-----------|--------|
| `whatsapp-status-changed` | `/whatsapp` | ✅ |
| `whatsapp-qr-generated` | `/whatsapp` | ✅ |
| `whatsapp-connected` | `/whatsapp` | ✅ |
| `whatsapp-disconnected` | `/whatsapp` | ✅ |
| `whatsapp-authentication-failed` | `/whatsapp` | ✅ |
| `whatsapp-message-sent` | `/whatsapp` | ✅ |
| `whatsapp-message-received` | `/whatsapp` | ✅ |

#### 1.5 Función de Stock
| Componente | Estado |
|------------|--------|
| `process_order_with_stock_check` | ✅ Invocada desde `OrdersService` |
| Transaction management | ✅ Via `dataSource.query()` |

#### 1.6 Nota: Campo `whatsapp_group_id`
El campo `whatsapp_group_id` en la tabla `provider_bots` debe almacenar el **ID del grupo de WhatsApp** (`from: '120363429839867374@g.us'`), no un número de teléfono.

```sql
-- Ejemplo de valor válido
INSERT INTO provider_bots (provider_id, whatsapp_group_id)
VALUES ('uuid-del-proveedor', '120363429839867374@g.us');
```

#### 1.7 Nota: Campos LID en `orders`
La tabla `orders` actualmente almacena `employee_phone`. Para mantener consistencia con el nuevo modelo LID, se recomienda agregar:

```sql
-- Opcional: referenciar el LID del empleado en el pedido
ALTER TABLE orders ADD COLUMN employee_whatsapp_lid VARCHAR(100);
```

Esto permite trazabilidad completa desde el mensaje de WhatsApp hasta el pedido.

#### 1.8 Nota: Campos LID en `whatsapp_logs`
La tabla `whatsapp_logs` actualmente almacena `recipient_phone_or_group`. Para mantener consistencia con el nuevo modelo LID, se recomienda agregar:

```sql
-- Opcional: referenciar el LID del destinatario
ALTER TABLE whatsapp_logs ADD COLUMN recipient_whatsapp_lid VARCHAR(100);
```

---

### 2. FRONTEND (`lunchsync-frontend`)

#### 2.1 Configuración
| Archivo | Estado |
|---------|--------|
| `tsconfig.app.json` | ✅ `strict: true` + flags completos |
| `package.json` | ✅ React 19, Vite, Tailwind, framer-motion |
| `App.tsx` | ✅ Rutas configuradas |

#### 2.2 Componentes UI (iOS)
| Componente | Estado |
|------------|--------|
| `IosButton` | ✅ |
| `IosCard` | ✅ |
| `IosHeader` | ✅ |
| `IosModal` | ✅ |
| `IosTabBar` | ✅ |

#### 2.3 Layouts
| Layout | Estado |
|--------|--------|
| `AdminLayout` | ✅ |
| `ProviderLayout` | ✅ |
| `EmployeeLayout` | ✅ |

#### 2.4 Páginas
| Rol | Página | Estado |
|-----|--------|--------|
| **Auth** | `LoginPage` | ✅ |
| **Admin** | `DashboardPage` | ✅ |
| **Admin** | `ProvidersPage` | ✅ |
| **Admin** | `AccountsPage` | ✅ |
| **Provider** | `ProviderDashboardPage` | ✅ |
| **Provider** | `MenusPage` | ✅ |
| **Provider** | `OrdersPage` | ✅ |
| **Provider** | `WhatsAppPage` | ✅ |
| **Provider** | `ZonesPage` | ✅ |
| **Employee** | `EmployeeAuthPage` | ✅ |
| **Employee** | `EmployeeRegisterPage` | ✅ |
| **Employee** | `EmployeeMenuPage` | ✅ |
| **Employee** | `EmployeeOrdersPage` | ✅ |
| **Employee** | `EmployeeProfilePage` | ✅ |

#### 2.5 Contexts
| Context | Estado |
|---------|--------|
| `AuthContext` | ✅ |
| `ThemeContext` | ✅ |

#### 2.6 Integración API y Realtime
| Componente | Estado |
|------------|--------|
| `lib/api.ts` | ✅ Axios client con interceptores |
| `lib/socket.ts` | ✅ Socket.IO menu + whatsapp |
| `hooks/useProviders.ts` | ✅ CRUD proveedores |

---

### 3. WHATSAPP BOT (`lunchsync-whatsapp-bot`)

#### 3.1 Estructura
| Archivo | Estado |
|---------|--------|
| `src/index.ts` | ✅ Express server (port 3001) |
| `src/client.ts` | ✅ Gestión instancias whatsapp-web.js |
| `src/message-factory.ts` | ✅ 3 templates de mensajes |
| `src/api/routes.ts` | ✅ Endpoints internos |
| `src/types/index.ts` | ✅ Tipos TypeScript |

#### 3.2 Endpoints
| Método | Ruta | Auth | Estado |
|--------|------|------|--------|
| GET | `/api/status/:providerId` | ❌ | ✅ |
| GET | `/api/status` | ❌ | ✅ |
| POST | `/api/start/:providerId` | ❌ | ✅ |
| POST | `/api/stop/:providerId` | ❌ | ✅ |
| POST | `/api/restart/:providerId` | ❌ | ✅ |
| POST | `/api/unlink/:providerId` | ❌ | ✅ |
| GET | `/api/qr/:providerId` | ❌ | ✅ |
| POST | `/api/send` | ❌ | ✅ |
| POST | `/api/send-debug` | ✅ `x-bot-secret` | ✅ |
| GET | `/api/chats/:providerId` | ✅ `x-bot-secret` | ✅ |

#### 3.3 Funcionalidades
| Función | Estado |
|---------|--------|
| Instancias en memoria (`Map`) | ✅ |
| Mutex por provider | ✅ |
| Limpieza de lockfiles | ✅ |
| Kill Chrome huérfano | ✅ |
| Retry init (2 intentos) | ✅ |
| QR a DataURL | ✅ |
| Sesiones en disco (`storage/whatsapp/`) | ✅ |
| Manejo de mensajes entrantes (debug) | ✅ |

---

## 🔴 Faltante Crítico

### A. Base de Datos (ejecución local)

| # | Tarea | Prioridad | Estado |
|---|-------|-----------|--------|
| 1 | **init.sql** — Script DDL con las 14 tablas + función `process_order_with_stock_check` | 🔴 Alta | ❌ Pendiente |
| 2 | **`.env.example`** — Documentar variables de entorno requeridas | 🟡 Media | ❌ Pendiente |
| 3 | **Script de setup** — Script para crear BD y ejecutar DDL (psql) | 🟡 Media | ❌ Pendiente |
| 4 | **Migración users** — Agregar campo `whatsapp_lid` y hacer `phone_number` nullable | 🔴 Alta | ❌ Pendiente |
| 5 | **Migración orders** — Agregar campo `employee_whatsapp_lid` (opcional, para trazabilidad) | 🟡 Media | ❌ Pendiente |
| 6 | **Migración whatsapp_logs** — Agregar campo `recipient_whatsapp_lid` (opcional) | 🟢 Baja | ❌ Pendiente |

### B. Backend — Seguridad

| # | Tarea | Prioridad | Estado |
|---|-------|-----------|--------|
| 4 | **Auth en endpoints del bot** — `/api/start`, `/stop`, `/restart`, `/send` sin protección | 🔴 Alta | ❌ Pendiente |
| 5 | **Tenant isolation** — Verificar filtro `provider_id` en todos los controllers/services | 🔴 Alta | ⚠️ Parcial |
| 6 | **Rate limiting** — Implementar throttling en endpoints de auth | 🟡 Media | ❌ Pendiente |
| 7 | **CORS configurado** — Definir orígenes permitidos (no `true` en producción) | 🟡 Media | ❌ Pendiente |

### C. Backend — TypeScript Strict

| # | Tarea | Prioridad | Estado |
|---|-------|-----------|--------|
| 8 | **tsconfig.json** — Agregar `noUncheckedIndexedAccess: true` | 🟡 Media | ❌ Pendiente |
| 9 | **tsconfig.json** — Agregar `exactOptionalPropertyTypes: true` | 🟡 Media | ❌ Pendiente |
| 10 | **tsconfig.json** — Agregar `noImplicitOverride: true` | 🟡 Media | ❌ Pendiente |
| 11 | **tsconfig.json** — Cambiar `noFallthroughCasesInSwitch: true` | 🟡 Media | ❌ Pendiente |

### D. Backend — Funcionalidad

| # | Tarea | Prioridad | Estado |
|---|-------|-----------|--------|
| 12 | **Auditoría** — Implementar `AuditService` para registrar acciones | 🟡 Media | ⚠️ Entidad existe, service pendiente |
| 13 | **DTOs faltantes** — Verificar que todos los endpoints tengan DTOs con `class-validator` | 🟡 Media | ✅ 16 DTOs con class-validator |
| 14 | **Validación de tenant** — Crear decorator/guard para filtrar por `provider_id` automáticamente | 🟡 Media | ❌ Pendiente |
| 15 | **Refresh token** — Implementar endpoint `POST /auth/refresh` | 🟡 Media | ❌ Pendiente |
| 16 | **WhatsApp LID** — Actualizar entidad `User` con campo `whatsapp_lid` (VARCHAR 100, UNIQUE) | 🔴 Alta | ❌ Pendiente |
| 17 | **WhatsApp LID** — Actualizar `UsersService` con métodos `findByWhatsappLid()` y `createPendingUserByLid()` | 🔴 Alta | ❌ Pendiente |
| 18 | **WhatsApp LID** — Actualizar `BotController` para recibir `author` (LID) en vez de `phoneNumber` | 🔴 Alta | ❌ Pendiente |
| 19 | **WhatsApp LID** — Actualizar `AuthService.validateMagicLink()` para retornar `whatsappLid` | 🔴 Alta | ❌ Pendiente |
| 20 | **WhatsApp LID** — Actualizar `AuthService.completeRegistration()` para aceptar `phoneNumber` opcional | 🟡 Media | ❌ Pendiente |

### E. WhatsApp Bot

| # | Tarea | Prioridad | Estado |
|---|-------|-----------|--------|
| 21 | **Auth interna** — Proteger endpoints públicos con `x-bot-secret` | 🔴 Alta | ⚠️ Solo `/send-debug` y `/chats` |
| 22 | **Callback al backend** — Notificar cambios de estado (connected/disconnected) vía HTTP | 🟡 Media | ❌ Pendiente |
| 23 | **Logging estructurado** — Reemplazar `console.log` con Winston/Pino | 🟡 Media | ❌ Pendiente |
| 24 | **Manejo de mensajes entrantes** — Procesar comandos desde WhatsApp (`!pedir`, `!almuerzo`) | 🔴 Alta | ❌ Pendiente |
| 25 | **Graceful shutdown** — Limpiar instancias al recibir SIGTERM | 🟢 Baja | ❌ Pendiente |
| 26 | **WhatsApp LID** — Extraer `author` (LID) y `from` (group ID) de mensajes entrantes | 🔴 Alta | ❌ Pendiente |
| 27 | **WhatsApp LID** — Llamar a backend `/bot/magic-link` con `author` y `whatsappGroupId` | 🔴 Alta | ❌ Pendiente |
| 28 | **Link privado** — Enviar magic link por **chat privado** al usuario (no al grupo) | 🔴 Alta | ❌ Pendiente |
| 29 | **Confirmación grupo** — Enviar mensaje "Se te envió un link privado 📩" al grupo | 🔴 Alta | ❌ Pendiente |

### F. Frontend

| # | Tarea | Prioridad | Estado |
|---|-------|-----------|--------|
| 30 | **shadcn/ui** — Instalar y configurar componentes base | 🟡 Media | ❌ Pendiente |
| 31 | **PWA** — Configurar `manifest.json` + meta tags + service worker | 🟡 Media | ✅ `manifest.json` + meta tags configurados |
| 32 | **Integración API** — Verificar que todos los hooks consuman endpoints reales | 🟡 Media | ⚠️ `api.ts` + `useProviders` listos |
| 33 | **Socket.IO client** — Implementar hook para tiempo real en pedidos | 🟡 Media | ✅ `socket.ts` configurado |
| 34 | **Modo oscuro** — Implementar `prefers-color-scheme: dark` | 🟢 Baja | ❌ Pendiente |
| 35 | **Registro LID** — Actualizar `EmployeeRegisterPage` para recibir LID y registrar nombre + teléfono opcional | 🔴 Alta | ❌ Pendiente |
| 36 | **Redirección menú** — Después de registro, redirect automático a `/employee/menu` | 🔴 Alta | ❌ Pendiente |

### G. Testing

| # | Tarea | Prioridad | Estado |
|---|-------|-----------|--------|
| 37 | **Unit tests backend** — Tests para services críticos (auth, orders, menus) | 🟡 Media | ⚠️ Solo `app.controller.spec.ts` |
| 38 | **Integration tests** — Tests de flujo completo (crear pedido → stock → WhatsApp) | 🟡 Media | ❌ Pendiente |
| 39 | **E2E tests** — Tests end-to-end con supertest | 🟢 Baja | ❌ Pendiente |

---

## 📋 Orden de Implementación Recomendado

```
FASE 1: Base de Datos (Tareas 1-6)
    │
    ├── 1.1 init.sql (DDL completo + función stock)
    ├── 1.2 .env.example
    ├── 1.3 Script de setup (psql)
    ├── 1.4 Migración users (whatsapp_lid + phone_number nullable)
    ├── 1.5 Migración orders (employee_whatsapp_lid)
    └── 1.6 Migración whatsapp_logs (recipient_whatsapp_lid)
    │
FASE 2: WhatsApp LID (Tareas 16-27) ← NUEVO
    │
    ├── 2.1 Actualizar entidad User (whatsapp_lid)
    ├── 2.2 Actualizar UsersService (findByWhatsappLid)
    ├── 2.3 Actualizar BotController (recibir author)
    ├── 2.4 Actualizar AuthService (validar con LID)
    ├── 2.5 Actualizar WhatsApp Bot (extraer author del msg)
    └── 2.6 Actualizar Frontend (registro opcional)
    │
FASE 3: Seguridad (Tareas 5-10)
    │
    ├── 3.1 Auth en endpoints del bot
    ├── 3.2 Tenant isolation guard
    └── 3.3 CORS + Rate limiting
    │
FASE 4: TypeScript Strict (Tareas 8-11)
    │
    └── 4.1 Actualizar tsconfig.json backend
    │
FASE 5: Funcionalidad Core (Tareas 12-15)
    │
    ├── 5.1 Auditoría
    ├── 5.2 DTOs completos
    └── 5.3 Refresh token
    │
FASE 6: WhatsApp Bot + Historia de Usuario (Tareas 21-29)
    │
    ├── 6.1 Auth interna
    ├── 6.2 Callback al backend
    ├── 6.3 Logging estructurado
    ├── 6.4 Procesar comandos (!pedir, !almuerzo)
    ├── 6.5 Extraer author (LID) y from (group ID)
    ├── 6.6 Enviar link por chat privado
    └── 6.7 Confirmar en grupo "Se te envió link"
    │
FASE 7: Frontend + Registro (Tareas 30-36)
    │
    ├── 7.1 shadcn/ui
    ├── 7.2 PWA
    ├── 7.3 Socket.IO client
    ├── 7.4 Registro con LID (nombre + teléfono opcional)
    └── 7.5 Redirección a menú después de registro
    │
FASE 8: Testing (Tareas 37-39)
    │
    ├── 8.1 Unit tests
    ├── 8.2 Integration tests
    └── 8.3 E2E tests
```

---

## 🔗 Diagrama de Dependencias

```
              ┌─────────────────┐
              │     init.sql    │
              │  (PostgreSQL)   │
              │  + whatsapp_lid │
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ PostgreSQL│  │ Backend  │  │   Bot    │
   │   (DDL)  │  │ (NestJS) │  │ (Express)│
   └──────────┘  └────┬─────┘  └────┬─────┘
                      │              │
                      │    HTTP      │
                      │  (author,    │
                      │   groupId)   │
                      └──────────────┘
                             │
                             ▼
                      ┌──────────┐
                      │ Frontend │
                      │ (React)  │
                      │ Registro │
                      │ opcional │
                      └──────────┘
```

---

## 📁 Archivos Existentes (Referencia)

### Backend
- `src/app.module.ts` — Módulo raíz
- `src/config/database.config.ts` — Configuración PostgreSQL
- `src/common/entities.ts` — Registro de 16 entidades
- `src/common/enums/index.ts` — `OrderStatus`, `PaymentStatus`, `BotStatus`
- `src/modules/auth/` — JWT + Magic Link
- `src/modules/users/` — UsersService + User entity ← **REQUIERE CAMBIOS (whatsapp_lid)**
- `src/modules/bot/` — BotController ← **REQUIERE CAMBIOS (recibir author)**
- `src/modules/orders/` — CRUD + función stock + listeners
- `src/modules/whatsapp/` — Adapter HTTP + Gateway + Service
- `src/modules/realtime/` — MenuRealtimeGateway

### Frontend
- `src/App.tsx` — Rutas configuradas
- `src/components/ui/` — Componentes iOS base
- `src/contexts/` — Auth + Theme
- `src/pages/` — Todas las páginas por rol
- `src/pages/employee/EmployeeAuthPage.tsx` — Validación de magic link
- `src/pages/employee/EmployeeRegisterPage.tsx` ← **REQUIERE CAMBIOS (recibir LID, nombre + teléfono opcional, redirect menú)**
- `src/lib/api.ts` — Cliente HTTP tipado
- `src/lib/socket.ts` — Socket.IO configurado
- `src/hooks/useProviders.ts` — Hook CRUD proveedores
- `public/manifest.json` — PWA configurada

### WhatsApp Bot
- `src/index.ts` — Servidor Express
- `src/client.ts` — Gestión instancias ← **REQUIERE CAMBIOS (extraer author, enviar link privado, confirmar en grupo)**
- `src/api/routes.ts` — Endpoints internos
- `src/message-factory.ts` — Templates de mensajes ← **REQUIERE CAMBIOS (agregar template confirmación grupo)**

---

## ✅ Resumen de Estado

### Completado ✅ (15 tareas)
- Backend: 14 módulos + auth + eventos + WebSocket
- Frontend: 14 páginas + componentes iOS + API client + Socket.IO
- WhatsApp Bot: Express + instancias + QR + envío mensajes
- Comunicación Backend↔Bot: Adapter HTTP funcional
- PWA: manifest.json + meta tags
- DTOs: 16 DTOs con class-validator

### Pendiente ❌ (25 tareas)
- init.sql + setup de BD
- **WhatsApp LID: 8 tareas (NUEVO)**
- **Historia de Usuario: 4 tareas (NUEVO)**
- Auth en endpoints del bot
- TypeScript strict flags
- Tenant isolation guard
- Auditoría service
- Callback del bot al backend
- Logging estructurado
- shadcn/ui
- Tests

### Parcial ⚠️ (4 tareas)
- Tenant isolation (verificar)
- Auth bot (solo debug)
- Integración API (hooks básicos)
- Tests (solo 1 spec)

---

## ✅ Checklist de Implementación

- [x] init.sql con DDL completo
- [x] .env.example documentado
- [x] Script de setup de BD
- [x] Migración users (whatsapp_lid + phone_number nullable)
- [x] Migración orders (employee_whatsapp_lid)
- [x] Migración whatsapp_logs (recipient_whatsapp_lid)
- [x] Actualizar entidad User con whatsapp_lid
- [x] Actualizar UsersService con findByWhatsappLid
- [x] Actualizar BotController para recibir author
- [x] Actualizar AuthService para usar LID
- [x] Actualizar WhatsApp Bot para extraer author
- [x] Enviar link por chat privado (no al grupo)
- [x] Confirmar en grupo "Se te envió link"
- [x] Procesar comandos (!pedir, !almuerzo)
- [x] Frontend: Registro con LID (nombre + teléfono opcional)
- [x] Frontend: Redirección a menú después de registro
- [x] Auth en endpoints del bot
- [x] Tenant isolation guard
- [x] tsconfig.json backend con todos los flags strict
- [x] Auditoría de acciones
- [x] DTOs completos con class-validator
- [x] Callback del bot al backend
- [x] PWA configurada
- [x] Socket.IO client en frontend
- [x] Unit tests para services críticos
- [ ] Integration tests de flujo completo
