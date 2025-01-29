
-- Consolidated Performance Optimizations Migration
DO $$
BEGIN
  -- Create indexes for performance improvements
  CREATE INDEX IF NOT EXISTS idx_workspace_users_user_id ON workspace_users(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
  CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
  CREATE INDEX IF NOT EXISTS idx_message_analytics_date ON message_analytics(date);
END $$;
