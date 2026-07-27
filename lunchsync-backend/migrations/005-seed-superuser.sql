-- Seed: Create provider + superuser account
-- Run: PGPASSWORD='LunchSync2026!' psql -U lunchsync -d lunchsync -f migrations/005-seed-superuser.sql

-- 1. Create provider if none exists
DO $$
DECLARE
  v_provider_id UUID;
BEGIN
  SELECT id INTO v_provider_id FROM providers LIMIT 1;

  IF v_provider_id IS NULL THEN
    INSERT INTO providers (name, phone_number)
    VALUES ('Proveedor Principal', '+5800000000000')
    RETURNING id INTO v_provider_id;
    RAISE NOTICE 'Provider created: %', v_provider_id;
  ELSE
    RAISE NOTICE 'Using existing provider: %', v_provider_id;
  END IF;

  -- 2. Create superuser account (skip if email already exists)
  IF NOT EXISTS (SELECT 1 FROM provider_accounts WHERE email = 'admin@traymelo.com') THEN
    INSERT INTO provider_accounts (provider_id, email, password_hash, full_name, role, is_active)
    VALUES (v_provider_id, 'admin@traymelo.com', '$2b$10$WfuVIoj94MHPvKRTG6rWUOux/KWf2ee4xNlChbCCk8RgLqZhutiEy', 'Administrador', 'superuser', true);
    RAISE NOTICE 'Superuser created: admin@traymelo.com';
  ELSE
    RAISE NOTICE 'Superuser already exists';
  END IF;
END $$;
