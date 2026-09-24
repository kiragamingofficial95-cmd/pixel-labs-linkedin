-- Pixel Labs — Posts Table Schema
-- For Vercel Postgres / Supabase

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  topic TEXT NOT NULL,
  generated_text TEXT NOT NULL,
  label TEXT NOT NULL CHECK (label IN ('VALUE', 'PROMO')),
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted')),
  posted_at TIMESTAMPTZ,
  impressions INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  reposts INTEGER DEFAULT 0,
  profile_views_delta INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_posts_label ON posts(label);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

-- Ratio state table
CREATE TABLE IF NOT EXISTS ratio_state (
  id SERIAL PRIMARY KEY,
  total_posts INTEGER DEFAULT 0,
  value_posts INTEGER DEFAULT 0,
  promo_posts INTEGER DEFAULT 0,
  last_action TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial ratio state if not exists
INSERT INTO ratio_state (total_posts, value_posts, promo_posts, last_action)
VALUES (0, 0, 0, NULL)
ON CONFLICT DO NOTHING;

-- Create a view for quick ratio stats
CREATE VIEW IF NOT EXISTS v_ratio_stats AS
SELECT
  COALESCE(value_posts, 0) as value_count,
  COALESCE(promo_posts, 0) as promo_count,
  COALESCE(total_posts, 0) as total,
  CASE WHEN total_posts > 0
    THEN ROUND(100.0 * COALESCE(value_posts, 0) / total_posts, 1)
    ELSE 0 END as value_pct
FROM ratio_state;
