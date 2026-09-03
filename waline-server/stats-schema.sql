CREATE TABLE IF NOT EXISTS blog_post_stats (
  post_id TEXT PRIMARY KEY,
  views_total BIGINT NOT NULL DEFAULT 0 CHECK (views_total >= 0),
  likes_total BIGINT NOT NULL DEFAULT 0 CHECK (likes_total >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_post_daily_views (
  post_id TEXT NOT NULL REFERENCES blog_post_stats(post_id) ON DELETE CASCADE,
  visitor_hash CHAR(64) NOT NULL,
  view_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, visitor_hash, view_date)
);

CREATE TABLE IF NOT EXISTS blog_post_likes (
  post_id TEXT NOT NULL REFERENCES blog_post_stats(post_id) ON DELETE CASCADE,
  visitor_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, visitor_hash)
);

CREATE INDEX IF NOT EXISTS blog_post_daily_views_date_idx
  ON blog_post_daily_views (view_date);
