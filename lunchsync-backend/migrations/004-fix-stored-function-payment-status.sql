CREATE OR REPLACE FUNCTION public.process_order_with_stock_check(
    p_user_id uuid,
    p_provider_id uuid,
    p_daily_menu_id uuid,
    p_delivery_zone_id uuid,
    p_menu_service_id uuid,
    p_selected_option_ids uuid[],
    p_total_amount numeric,
    p_order_number character varying,
    p_special_instructions text,
    p_employee_name character varying,
    p_employee_phone character varying,
    p_provider_name character varying,
    p_delivery_zone_name character varying,
    p_service_name character varying
)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
    v_order_id UUID;
    v_order_item_id UUID;
    v_option_id UUID;
    v_opt RECORD;
BEGIN
    FOREACH v_option_id IN ARRAY p_selected_option_ids LOOP
        SELECT id, option_name, stock_quantity, is_unlimited, is_available
        INTO v_opt
        FROM combo_options
        WHERE id = v_option_id FOR UPDATE;

        IF NOT v_opt.is_available THEN
            RAISE EXCEPTION 'La opcion % ya no esta disponible.', v_opt.option_name;
        END IF;

        IF NOT v_opt.is_unlimited THEN
            IF v_opt.stock_quantity < 1 THEN
                RAISE EXCEPTION 'La opcion % se ha agotado.', v_opt.option_name;
            END IF;

            UPDATE combo_options
            SET stock_quantity = stock_quantity - 1,
                is_available = CASE WHEN (stock_quantity - 1) <= 0 THEN FALSE ELSE TRUE END
            WHERE id = v_option_id;
        END IF;
    END LOOP;

    INSERT INTO orders (
        order_number, user_id, provider_id, daily_menu_id, delivery_zone_id,
        total_amount, order_status, payment_status, special_instructions,
        employee_name, employee_phone, provider_name, delivery_zone_name
    ) VALUES (
        p_order_number, p_user_id, p_provider_id, p_daily_menu_id, p_delivery_zone_id,
        p_total_amount, 'pending', 'unpaid', p_special_instructions,
        p_employee_name, p_employee_phone, p_provider_name, p_delivery_zone_name
    ) RETURNING id INTO v_order_id;

    INSERT INTO order_items (order_id, menu_service_id, service_name, quantity, unit_price, subtotal)
    VALUES (v_order_id, p_menu_service_id, p_service_name, 1, p_total_amount, p_total_amount)
    RETURNING id INTO v_order_item_id;

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
$function$;
