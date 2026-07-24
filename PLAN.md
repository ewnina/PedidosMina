# Plan de Implementación — LunchSync

Basado en la especificación técnica del README.md. Cada tarea sigue el orden del checklist (sección 10) y respeta las restricciones del documento.

---

## Fase 0: Preparación del Entorno

### 0.1 Inicializar repositorios
- Crear `lunchsync-backend` (NestJS) con `strict: true` en tsconfig
- Crear `lunchsync-frontend` (React + Vite + TypeScript strict)
- Crear `lunchsync-whatsapp-bot` (Node independiente)
- Configurar Docker Compose con servicios: `postgres:16`, `backend`, `whatsapp-bot`

### 0.2 Configurar herramientas
- ESLint + Prettier en los 3 repos
- `class-validator`, `class-transformer` en backend
- `socket.io-client` en frontend
- `@nestjs/websockets`, `socket.io` en backend
- `@nestjs/jwt`, `passport-jwt` en backend
- `whatsapp-web.js` en el bot
- Tailwind CSS + shadcn/ui en frontend

---

## Tarea 1: PostgreSQL local (Docker Compose) + DDL

### Pasos
1. Crear `docker-compose.yml` en la raíz del proyecto (o repo de backend):
   ```yaml
   services:
     postgres:
       image: postgres:16
       environment:
         POSTGRES_DB: lunchsync
         POSTGRES_USER: lunchsync
         POSTGRES_PASSWORD: admin123
       ports:
         - "5432:5432"
       volumes:
         - pgdata:/var/lib/postgresql/data
         - ./init.sql:/docker-entrypoint-initdb.d/init.sql
   volumes:
     pgdata:
   ```
2. Crear `init.sql` con todo el DDL de la sección 5.2 (14 tablas: `providers`, `provider_accounts`, `provider_bots`, `delivery_zones`, `users`, `auth_tokens`, `daily_menus`, `menu_services`, `combo_groups`, `combo_options`, `orders`, `order_items`, `order_item_selections`, `audit_logs`, `whatsapp_logs`).
3. Agregar `uuid-ossp` extension.
4. Agregar la función PL/pgSQL `process_order_with_stock_check` (sección 6).
5. Ejecutar `docker compose up -d postgres` y verificar conexión.

### Restricciones
- No usar extensiones propietarias de Supabase.
- Tablas y columnas en inglés y `snake_case`.
- Claves primarias UUID con `uuid_generate_v4()`.
- Timestamps con `TIMESTAMPTZ`.

---

## Tarea 2: TypeORM en NestJS → PostgreSQL local

### Pasos
1. Configurar `TypeOrmModule.forRootAsync` en `AppModule` apuntando a `localhost:5432`, db `lunchsync`.
2. Crear entidades TypeORM para cada tabla del DDL en `src/modules/<dominio>/entities/`:
   - `Provider.entity.ts`
   - `ProviderAccount.entity.ts`
   - `ProviderBot.entity.ts`
   - `DeliveryZone.entity.ts`
   - `User.entity.ts`
   - `AuthToken.entity.ts`
   - `DailyMenu.entity.ts`
   - `MenuService.entity.ts`
   - `ComboGroup.entity.ts`
   - `ComboOption.entity.ts`
   - `Order.entity.ts`
   - `OrderItem.entity.ts`
   - `OrderItemSelection.entity.ts`
   - `AuditLog.entity.ts`
   - `WhatsappLog.entity.ts`
3. Cada entidad con decoradores `@Entity()`, `@PrimaryGeneratedColumn('uuid')`, `@Column()`, `@ManyToOne()`, `@OneToMany()`, etc.
4. Configurar `synchronize: false` (usar el DDL directo para control total).

### Restricciones
- Sin dependencias de Supabase.
- Nombres de tabla/columna exactos del DDL.

---

## Tarea 3: MenuRealtimeGateway (Socket.IO)

### Pasos
1. Crear `src/modules/realtime/menu-realtime.gateway.ts`:
   - Namespace `/realtime`
   - CORS `origin: true`
   - `handleConnection`: unir al room `menu-realtime-{dailyMenuId}`
   - Método `emitComboOptionUpdate(dailyMenuId, payload)` que emite `combo-option-updated`
2. Definir interfaz `ComboOptionUpdatedPayload` con `optionId`, `isAvailable`, `stockQuantity`.
3. Exportar el gateway para que `OrdersService` y `MenuService` lo inyecten.
4. Registrar `MenuRealtimeGateway` en el módulo `RealtimeModule`.

### Restricciones
- No usar Supabase Realtime.
- Eventos en `kebab-case`.

---

## Tarea 4: Función `process_order_with_stock_check` en BD local

### Pasos
1. La función ya está incluida en `init.sql` (Tarea 1).
2. Crear un servicio o repositorio en `OrdersModule` que ejecute la función vía `dataSource.query()` dentro de una transacción TypeORM.
3. La función recibe: `p_user_id`, `p_provider_id`, `p_daily_menu_id`, `p_delivery_zone_id`, `p_menu_service_id`, `p_selected_option_ids`, `p_total_amount`, `p_order_number`, `p_special_instructions`.
4. Retorna el `UUID` de la orden creada.
5. Después de ejecutar la función, emitir evento interno `OrderCreatedEvent`.

### Restricciones
- Usar `query()` de TypeORM, no triggers.
- No modificar la función PL/pgSQL.

---

## Tarea 5: AuthModule — JWT (proveedores) + Magic Link (empleados)

### Pasos
#### 5.1 JWT para Superuser y proveedores
1. Configurar `JwtModule.registerAsync` con secret desde env.
2. Crear estrategia `passport-jwt` (extraer token de `Authorization: Bearer`).
3. Crear `JwtAuthGuard` y `RolesGuard`.
4. Endpoints:
   - `POST /auth/login` — email + password → JWT
   - `POST /auth/register` — solo Superuser, crea `provider_accounts`
   - `POST /auth/refresh` — refresh token

#### 5.2 Magic Link para empleados
1. `POST /auth/magic-link/generate` — recibe `user_id`, `provider_id` → genera token firmado con `jti`, expiry, y lo almacena en `auth_tokens`.
2. `POST /auth/magic-link/validate` — recibe el token → valida firma, expiración, no usado, no revocado.
3. Si requiere verificación, iniciar flujo OTP/WhatsApp.
4. Al completar verificación, emitir JWT de sesión para el empleado.

#### 5.3 Seguridad Magic Link
- Token de un solo uso.
- Asociado a `user_id` + `phone_number`.
- `jti` único para prevenir replay attacks.
- Intentos fallidos registrados en `audit_logs`.
- `provider_id` desde JWT, nunca del frontend.

### Restricciones
- No usar Supabase Auth.
- `provider_id` siempre del JWT.
- Filtrar por tenant en todas las consultas.

---

## Tarea 6: Microservicio WhatsApp + Adapter en NestJS

### Pasos
#### 6.1 Microservicio `lunchsync-whatsapp-bot`
1. `src/index.ts`: servidor Express mínimo que expone endpoints internos.
2. `src/client.ts`: inicializa `whatsapp-web.js` con sesión por `provider_id`.
3. `src/message-factory.ts`: `WhatsappMessageFactory` construye mensajes según tipo de evento.
4. Endpoints:
   - `POST /start/:providerId`
   - `POST /stop/:providerId`
   - `POST /restart/:providerId`
   - `POST /unlink/:providerId`
   - `GET /status/:providerId`
   - `GET /qr/:providerId`
5. Sesiones persistidas en `/storage/whatsapp/{provider_id}` (sistema de archivos).
6. Eventos emitidos al backend via HTTP callback o cola.

#### 6.2 Adapter en NestJS (`WhatsappModule`)
1. Interfaz `IWhatsappSender` con métodos: `sendMessage`, `getStatus`, `start`, `stop`, `restart`, `unlink`.
2. Implementación `HttpWhatsappSender` que se comunica con el microservicio.
3. Endpoints públicos (protegidos por JWT + tenant filter):
   - `GET /providers/:providerId/whatsapp/status`
   - `POST /providers/:providerId/whatsapp/start`
   - `POST /providers/:providerId/whatsapp/stop`
   - `POST /providers/:providerId/whatsapp/restart`
   - `POST /providers/:providerId/whatsapp/unlink`
   - `GET /providers/:providerId/whatsapp/qr`
4. Eventos Socket.IO: `whatsapp-status-changed`, `whatsapp-qr-generated`, `whatsapp-connected`, `whatsapp-disconnected`, `whatsapp-authentication-failed`, `whatsapp-message-sent`, `whatsapp-message-received`.

### Restricciones
- Sesiones en sistema de archivos, NO en BD.
- Cada proveedor con carpeta `/storage/whatsapp/{provider_id}`.
- Adapter Pattern: `IWhatsappSender` desacopla implementación.

---

## Tarea 7: Evento `OrderCreatedEvent` → WebSocket + WhatsApp

### Pasos
1. Usar `@nestjs/event-emitter` para eventos internos.
2. Definir `OrderCreatedEvent` con payload: `orderId`, `providerId`, `dailyMenuId`, `orderData`.
3. En `OrdersService`, después de `process_order_with_stock_check`, emitir `OrderCreatedEvent`.
4. Crear listeners:
   - `OrderWebSocketListener`: inyecta `MenuRealtimeGateway` y llama `emitComboOptionUpdate`.
   - `OrderWhatsAppListener`: inyecta `IWhatsappSender` y envía notificación al grupo del proveedor.
5. El listener de WhatsApp se ejecuta solo cuando el proveedor acepta el pedido (cambio a `accepted`).

### Restricciones
- Usar Observer/Event Emitter Pattern (`@nestjs/event-emitter`).
- Desacoplar "qué pasó" de "quién reacciona".

---

## Tarea 8: Strict TypeScript + cero `any`

### Pasos
1. En `tsconfig.json` de backend y frontend:
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
2. Reemplazar cualquier `any` por tipos concretos o `unknown` con type guards.
3. Definir enums explícitos: `OrderStatus`, `PaymentStatus`, `BotStatus`.
4. Todos los DTOs con `class-validator`.
5. Respuestas de API tipadas con `ApiResponse<T>`.
6. Agregar script de lint/typecheck en CI.

### Restricciones
- Prohibido `any`.
- Prohibido `unknown` sin narrowing.
- Un tipo/interfaz por entidad de dominio.

---

## Tarea 9: Diseño nativo iOS

### Pasos
1. Configurar Tailwind con tokens iOS:
   - Tipografía: `-apple-system, "SF Pro Text", "SF Pro Display", system-ui`
   - Safe areas: `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`
   - Paleta modo oscuro: `#000`, `#1C1C1E`, `#2C2C2E`
2. Componentes base (`src/components/ui/`):
   - `IosCard` — bordes redondeados, sombra sutil
   - `IosButton` — con `active:scale-[0.97]`
   - `IosSheet` — modal desde abajo
   - `IosTabBar` — barra inferior fija
   - `IosHeader` — large title colapsable
3. Transiciones con `framer-motion`:
   - Curva `cubic-bezier(0.32, 0.72, 0, 1)`
   - Slide horizontal push/pop
4. PWA:
   - `manifest.json` con `display: "standalone"`
   - Meta tags `apple-mobile-web-app-capable`
   - Íconos para pantalla de inicio
5. Soportar `prefers-color-scheme: dark`.

### Restricciones
- Usar Tailwind + shadcn/ui como base.
- Ajustar tokens de diseño según lineamientos iOS.

---

## Resumen de Dependencias entre Tareas

```
0. Preparación (setup inicial)
  │
  ├── 1. PostgreSQL + DDL (base de datos lista)
  │     │
  │     ├── 2. TypeORM + Entidades (ORM configurado, depende de BD)
  │     │     │
  │     │     ├── 3. MenuRealtimeGateway (Socket.IO, independiente)
  │     │     ├── 4. Función stock (ya en DDL, solo integrar)
  │     │     ├── 5. AuthModule (JWT + Magic Link, parcialmente independiente)
  │     │     ├── 6. WhatsApp (microservicio + adapter, independiente)
  │     │     └── 7. OrderCreatedEvent (depende de 3, 4, 5, 6)
  │     │
  │     └── 8. Strict TypeScript (transversal, aplicar desde el inicio)
  │
  └── 9. Diseño iOS frontend (independiente, puede hacerse en paralelo)
```

Las tareas 3, 4, 5, 6 y 9 pueden desarrollarse en paralelo una vez completadas las tareas 0, 1 y 2. La tarea 7 es la integración final que une todos los módulos.
