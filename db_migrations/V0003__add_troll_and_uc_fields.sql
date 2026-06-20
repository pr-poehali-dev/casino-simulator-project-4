-- Troll эффекты
ALTER TABLE casino_users ADD COLUMN IF NOT EXISTS troll_blackb BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE casino_users ADD COLUMN IF NOT EXISTS troll_block BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE casino_users ADD COLUMN IF NOT EXISTS troll_lucky_spins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE casino_users ADD COLUMN IF NOT EXISTS troll_unlucky_spins INTEGER NOT NULL DEFAULT 0;

-- UltraCheat доступ
ALTER TABLE casino_users ADD COLUMN IF NOT EXISTS uc_cheat BOOLEAN NOT NULL DEFAULT FALSE;

-- UltraCheat cooldowns (храним timestamp последнего использования)
ALTER TABLE casino_users ADD COLUMN IF NOT EXISTS uc_chips_at TIMESTAMP DEFAULT NULL;
ALTER TABLE casino_users ADD COLUMN IF NOT EXISTS uc_luck_at TIMESTAMP DEFAULT NULL;
ALTER TABLE casino_users ADD COLUMN IF NOT EXISTS uc_stealth_at TIMESTAMP DEFAULT NULL;

-- Stealth режим (блокировка spectator для обычных админов)
ALTER TABLE casino_users ADD COLUMN IF NOT EXISTS spectator_stealth_until TIMESTAMP DEFAULT NULL;