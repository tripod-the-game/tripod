-- game_state: per-user, per-date hint and reveal status
CREATE TABLE IF NOT EXISTS game_state (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_date       text        NOT NULL,
  hints_used      integer     NOT NULL DEFAULT 0,
  hinted_positions integer[]  NOT NULL DEFAULT '{}',
  revealed        boolean     NOT NULL DEFAULT false,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, game_date)
);

ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own game_state"
  ON game_state FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- input_values: per-user, per-date grid letter values
CREATE TABLE IF NOT EXISTS input_values (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_date   text        NOT NULL,
  values      jsonb       NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, game_date)
);

ALTER TABLE input_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own input_values"
  ON input_values FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- submissions: per-user submission history (multiple rows per date allowed)
CREATE TABLE IF NOT EXISTS submissions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_date   text        NOT NULL,
  values      jsonb       NOT NULL DEFAULT '{}',
  validation  jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own submissions"
  ON submissions FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- game_results: per-user final outcome used for stats
CREATE TABLE IF NOT EXISTS game_results (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_date   text        NOT NULL,
  solved      boolean     NOT NULL DEFAULT false,
  attempts    integer     NOT NULL DEFAULT 0,
  hints_used  integer     NOT NULL DEFAULT 0,
  revealed    boolean     NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, game_date)
);

ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own game_results"
  ON game_results FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
