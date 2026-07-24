-- LunchSync Database Initialization
-- PostgreSQL localhost - DDL v1.0

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

-- 2. USUARIOS PROVEEDORES (login con credenciales)
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

-- 6. TOKENS DE ACCESO SEGURO (Magic Links)
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

-- 7. VERIFICACIONES DE USUARIO (OTP, WhatsApp)
CREATE TABLE user_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_token_id UUID NOT NULL REFERENCES auth_tokens(id) ON DELETE CASCADE,
    verification_type VARCHAR(50),
    code_hash VARCHAR(255),
    expires_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    attempts INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. MENÚS DIARIOS POR PROVEEDOR
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

-- 9. SERVICIOS / COMBOS DEL MENÚ
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

-- 10. GRUPOS DE COMPONENTES DEL PLATO
CREATE TABLE combo_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_service_id UUID NOT NULL REFERENCES menu_services(id) ON DELETE CASCADE,
    group_name VARCHAR(100) NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    min_select INT DEFAULT 1,
    max_select INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. OPCIONES DISPONIBLES DENTRO DE CADA GRUPO
CREATE TABLE combo_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    combo_group_id UUID NOT NULL REFERENCES combo_groups(id) ON DELETE CASCADE,
    option_name VARCHAR(150) NOT NULL,
    extra_price DECIMAL(10, 2) DEFAULT 0.00,
    initial_stock INT DEFAULT NULL,
    stock_quantity INT DEFAULT NULL,
    is_unlimited BOOLEAN DEFAULT TRUE,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. PEDIDOS
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
    order_status VARCHAR(50) DEFAULT 'pending',
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    special_instructions TEXT NULL,
    confirmed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 13. DETALLE DEL PEDIDO
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

-- 14. SELECCIONES ESPECÍFICAS DE COMBOS
CREATE TABLE order_item_selections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    combo_group_id UUID NOT NULL REFERENCES combo_groups(id),
    combo_option_id UUID NOT NULL REFERENCES combo_options(id),
    group_name VARCHAR(100) NOT NULL,
    option_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 15. LOGS DE AUDITORÍA
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

-- 16. LOGS DE WHATSAPP
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

-- =============================================================================
-- FUNCIÓN ALMACENADA: Control Atómico de Stock
-- =============================================================================

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
