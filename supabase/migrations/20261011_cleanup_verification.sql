-- ============================================================================
-- EcoQala: Before/After AI Cleanup Verification & Rewards Schema
-- Migration: 20261011_cleanup_verification.sql
-- Compatible with Supabase PostgreSQL and private Supabase Storage
-- ============================================================================

-- 1. Create Enums for Verification Status and Decision
CREATE TYPE cleanup_status_enum AS ENUM (
  'approved',
  'manual_review',
  'rejected',
  'retake_required',
  'verification_failed'
);

-- 2. Table: cleanup_submissions
CREATE TABLE IF NOT EXISTS cleanup_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,
  user_id UUID,
  wallet_address TEXT,
  task_id TEXT,
  task_title TEXT NOT NULL,
  city_name TEXT NOT NULL,
  category TEXT DEFAULT 'trash',
  before_image_path TEXT NOT NULL,
  after_image_path TEXT NOT NULL,
  before_hash TEXT NOT NULL,
  after_hash TEXT NOT NULL,
  status cleanup_status_enum NOT NULL DEFAULT 'manual_review',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  verified_at TIMESTAMPTZ,
  reviewed_by UUID,
  CONSTRAINT different_hashes_check CHECK (before_hash <> after_hash)
);

CREATE INDEX IF NOT EXISTS idx_cleanup_submissions_user_id ON cleanup_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_submissions_status ON cleanup_submissions(status);
CREATE INDEX IF NOT EXISTS idx_cleanup_submissions_hashes ON cleanup_submissions(before_hash, after_hash);

-- 3. Table: verification_results
CREATE TABLE IF NOT EXISTS verification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES cleanup_submissions(id) ON DELETE CASCADE,
  ai_provider TEXT NOT NULL, -- 'gemini', 'openai', etc.
  model_name TEXT NOT NULL,
  model_output JSONB NOT NULL,
  final_decision cleanup_status_enum NOT NULL,
  confidence NUMERIC(4, 3) CHECK (confidence >= 0 AND confidence <= 1),
  review_reason TEXT NOT NULL,
  review_reason_kz TEXT,
  review_reason_ru TEXT,
  rule_violations TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_verification_results_submission ON verification_results(submission_id);

-- 4. Table: reward_transactions (Guarantees exactly one reward per submission)
CREATE TABLE IF NOT EXISTS reward_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID UNIQUE NOT NULL REFERENCES cleanup_submissions(id) ON DELETE RESTRICT,
  user_id UUID,
  wallet_address TEXT,
  points INTEGER NOT NULL CHECK (points > 0),
  solana_tx_signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reward_transactions_user ON reward_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_wallet ON reward_transactions(wallet_address);

-- 5. Atomic Reward Function to prevent race conditions & duplicate awards
CREATE OR REPLACE FUNCTION award_cleanup_reward(
  p_submission_id UUID,
  p_points INTEGER,
  p_solana_signature TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission cleanup_submissions%ROWTYPE;
  v_reward_id UUID;
BEGIN
  -- Lock and read submission row
  SELECT * INTO v_submission
  FROM cleanup_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Submission not found');
  END IF;

  IF v_submission.status <> 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only approved submissions can receive rewards');
  END IF;

  -- Ensure not already rewarded
  IF EXISTS (SELECT 1 FROM reward_transactions WHERE submission_id = p_submission_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Submission has already been rewarded');
  END IF;

  -- Insert atomic reward transaction
  INSERT INTO reward_transactions (
    submission_id,
    user_id,
    wallet_address,
    points,
    solana_tx_signature
  ) VALUES (
    p_submission_id,
    v_submission.user_id,
    v_submission.wallet_address,
    p_points,
    p_solana_signature
  ) RETURNING id INTO v_reward_id;

  RETURN jsonb_build_object(
    'success', true,
    'reward_id', v_reward_id,
    'points', p_points,
    'submission_id', p_submission_id
  );
END;
$$;

-- 6. Row-Level Security (RLS) Policies
ALTER TABLE cleanup_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own submissions
CREATE POLICY "Users can read own cleanup submissions"
  ON cleanup_submissions FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Service role can perform all operations
CREATE POLICY "Service role full access on cleanup_submissions"
  ON cleanup_submissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on verification_results"
  ON verification_results FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on reward_transactions"
  ON reward_transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
