
-- Consolidated Data Management Migration
DO $$
BEGIN
  -- Update existing rows with default values
  UPDATE user_settings 
  SET 
    phone_number_selection = COALESCE(phone_number_selection, 'sequential'),
    message_wheel_mode = COALESCE(message_wheel_mode, 'sequential'),
    message_wheel_delay = COALESCE(message_wheel_delay, 60),
    active_ai = COALESCE(active_ai, 'deepseek');

  -- Insert or update example data as necessary (placeholder for user data updates)
END $$;
