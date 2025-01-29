
-- Consolidated Table Creations Migration
CREATE TABLE IF NOT EXISTS message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id),
  property_id uuid REFERENCES properties(id),
  status text CHECK (status IN ('interested', 'not_interested', 'dnc')) DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES message_threads(id),
  content text NOT NULL,
  from_number text NOT NULL,
  to_number text NOT NULL,
  direction text CHECK (direction IN ('outbound', 'inbound')),
  status text CHECK (status IN ('sent', 'delivered', 'failed')),
  ai_analysis jsonb DEFAULT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  status text CHECK (status IN ('interested', 'not_interested', 'dnc')) NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  source text CHECK (source IN ('user', 'ai')) DEFAULT 'user',
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
  reasoning text,
  created_at timestamptz DEFAULT now()
);
