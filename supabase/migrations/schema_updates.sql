
-- Consolidated Schema Updates Migration
DO $$
BEGIN
  -- Add new columns to user_settings if they don't exist
  ALTER TABLE user_settings 
    ADD COLUMN IF NOT EXISTS phone_number_selection text CHECK (phone_number_selection IN ('random', 'sequential')) DEFAULT 'sequential',
    ADD COLUMN IF NOT EXISTS message_wheel_mode text CHECK (message_wheel_mode IN ('random', 'sequential')) DEFAULT 'sequential',
    ADD COLUMN IF NOT EXISTS message_wheel_delay integer DEFAULT 60,
    ADD COLUMN IF NOT EXISTS active_ai text CHECK (active_ai IN ('openai', 'deepseek')) DEFAULT 'deepseek';

  -- Update RLS policies on existing tables
  ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
END $$;
