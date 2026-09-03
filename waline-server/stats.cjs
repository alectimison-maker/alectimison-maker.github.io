const { createHmac } = require('node:crypto');
const { Pool } = require('pg');

const STATS_VISITOR_COOKIE = 'aliouswe_stats_visitor';
const VISITOR_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/u;
const POST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const DEFAULT_LOCAL_ORIGINS = ['http://localhost:4321', 'http://127.0.0.1:4321'];

class StatsInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StatsInputError';
    this.statusCode = 400;
  }
}

const text = (value) => String(value ?? '').trim();

const normalizePostId = (value) => {
  const postId = text(value);
  if (!POST_ID_PATTERN.test(postId)) throw new StatsInputError('Invalid post id.');
  return postId;
};

const parseCookies = (cookieHeader) => {
  const cookies = new Map();
  text(cookieHeader).split(';').forEach((part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!name) return;
    try {
      cookies.set(name, decodeURIComponent(value));
    } catch {
      cookies.set(name, value);
    }
  });
  return cookies;
};

const validVisitorId = (value) => {
  const visitorId = text(value);
  return VISITOR_ID_PATTERN.test(visitorId) ? visitorId : undefined;
};

const readVisitorId = (request, body) => {
  const headers = request?.headers ?? {};
  const cookieHeader = headers.cookie ?? headers.Cookie;
  const cookieVisitor = parseCookies(cookieHeader).get(STATS_VISITOR_COOKIE);
  const headerVisitor = headers['x-stats-visitor'] ?? headers['X-Stats-Visitor'];
  const bodyVisitor = body?.visitorId;
  return [cookieVisitor, headerVisitor, bodyVisitor].map(validVisitorId).find(Boolean);
};

const hashVisitorId = (visitorId, secret) => {
  if (!validVisitorId(visitorId)) throw new StatsInputError('A valid visitor id is required.');
  if (!text(secret)) throw new Error('STATS_HASH_SECRET is not configured.');
  return createHmac('sha256', text(secret)).update(visitorId).digest('hex');
};

const parseBoolean = (value, fallback = false) => {
  const normalized = text(value).toLowerCase();
  if (!normalized) return fallback;
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

const getPostgresConfig = (environment = process.env) => ({
  host: environment.PG_HOST || environment.POSTGRES_HOST,
  port: Number(environment.PG_PORT || environment.POSTGRES_PORT || 5432),
  user: environment.PG_USER || environment.POSTGRES_USER,
  password: environment.PG_PASSWORD || environment.POSTGRES_PASSWORD,
  database: environment.PG_DB || environment.POSTGRES_DATABASE,
  ssl: parseBoolean(environment.PG_SSL || environment.POSTGRES_SSL, true)
    ? { rejectUnauthorized: false }
    : false,
  max: 1,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
});

const createStatsPool = (environment = process.env) => new Pool(getPostgresConfig(environment));

const getAllowedOrigins = (environment = process.env) => {
  const origins = new Set(DEFAULT_LOCAL_ORIGINS);
  [environment.SITE_URL, ...(text(environment.STATS_ALLOWED_ORIGINS).split(',').map((origin) => origin.trim()).filter(Boolean))]
    .forEach((origin) => {
      try {
        origins.add(new URL(origin).origin);
      } catch {}
    });
  return origins;
};

const requestPath = (request) => new URL(request?.url || '/', 'https://internal.stats').pathname.replace(/\/+$/u, '') || '/';

const setCorsHeaders = (response, request, environment) => {
  const origin = request?.headers?.origin ?? request?.headers?.Origin;
  const allowedOrigins = getAllowedOrigins(environment);
  response.setHeader('Vary', 'Origin');
  if (!origin || !allowedOrigins.has(origin)) return;
  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Stats-Visitor');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
};

const sendJson = (response, request, environment, statusCode, payload) => {
  setCorsHeaders(response, request, environment);
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
};

const readBody = async (request) => {
  if (request?.body && typeof request.body === 'object') return request.body;
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('body must be an object');
    return parsed;
  } catch {
    throw new StatsInputError('Request body must be valid JSON.');
  }
};

const toCount = (value) => {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : 0;
};

const statsFromRow = (row = {}) => ({
  views: toCount(row.views),
  likes: toCount(row.likes),
  liked: Boolean(row.liked),
});

const statsQuery = `
  SELECT
    COALESCE(stats.views_total, 0)::text AS views,
    COALESCE(stats.likes_total, 0)::text AS likes,
    CASE
      WHEN $2::text IS NULL THEN false
      ELSE EXISTS (
        SELECT 1 FROM blog_post_likes likes
        WHERE likes.post_id = $1 AND likes.visitor_hash = $2
      )
    END AS liked
  FROM (SELECT $1::text AS post_id) requested
  LEFT JOIN blog_post_stats stats ON stats.post_id = requested.post_id
`;

const withTransaction = async (pool, callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    throw error;
  } finally {
    client.release();
  }
};

const ensurePostStats = (client, postId) => client.query(
  `INSERT INTO blog_post_stats (post_id) VALUES ($1) ON CONFLICT (post_id) DO NOTHING`,
  [postId],
);

const createStatsRepository = ({ pool, clock = () => new Date() }) => ({
  async getStats(postId, visitorHash) {
    const result = await pool.query(statsQuery, [postId, visitorHash || null]);
    return statsFromRow(result.rows[0]);
  },

  async recordView(postId, visitorHash) {
    return withTransaction(pool, async (client) => {
      await ensurePostStats(client, postId);
      const viewDate = clock().toISOString().slice(0, 10);
      const inserted = await client.query(
        `
          INSERT INTO blog_post_daily_views (post_id, visitor_hash, view_date)
          VALUES ($1, $2, $3)
          ON CONFLICT (post_id, visitor_hash, view_date) DO NOTHING
          RETURNING post_id
        `,
        [postId, visitorHash, viewDate],
      );
      if (inserted.rowCount > 0) {
        await client.query(
          `UPDATE blog_post_stats SET views_total = views_total + 1, updated_at = NOW() WHERE post_id = $1`,
          [postId],
        );
      }
      const result = await client.query(statsQuery, [postId, visitorHash]);
      return { ...statsFromRow(result.rows[0]), counted: inserted.rowCount > 0 };
    });
  },

  async setLike(postId, visitorHash, liked) {
    return withTransaction(pool, async (client) => {
      await ensurePostStats(client, postId);
      const changed = liked
        ? await client.query(
          `
            INSERT INTO blog_post_likes (post_id, visitor_hash)
            VALUES ($1, $2)
            ON CONFLICT (post_id, visitor_hash) DO NOTHING
            RETURNING post_id
          `,
          [postId, visitorHash],
        )
        : await client.query(
          `DELETE FROM blog_post_likes WHERE post_id = $1 AND visitor_hash = $2 RETURNING post_id`,
          [postId, visitorHash],
        );
      if (changed.rowCount > 0) {
        await client.query(
          `
            UPDATE blog_post_stats
            SET likes_total = GREATEST(0, likes_total ${liked ? '+' : '-'} 1), updated_at = NOW()
            WHERE post_id = $1
          `,
          [postId],
        );
      }
      const result = await client.query(statsQuery, [postId, visitorHash]);
      return { ...statsFromRow(result.rows[0]), changed: changed.rowCount > 0 };
    });
  },
});

const createStatsHandler = ({ repository, environment = process.env }) => async (request, response) => {
  setCorsHeaders(response, request, environment);
  const path = requestPath(request);
  const method = text(request?.method).toUpperCase();

  if (path !== '/stats' && !path.startsWith('/stats/')) {
    sendJson(response, request, environment, 404, { error: 'Not found.' });
    return;
  }
  if (method === 'OPTIONS') {
    response.writeHead(204, {});
    response.end();
    return;
  }

  try {
    if (method === 'GET' && path === '/stats') {
      const url = new URL(request.url || '/', 'https://internal.stats');
      const postId = normalizePostId(url.searchParams.get('postId'));
      const visitorId = readVisitorId(request);
      const visitorHash = visitorId ? hashVisitorId(visitorId, environment.STATS_HASH_SECRET) : undefined;
      const stats = await repository.getStats(postId, visitorHash);
      sendJson(response, request, environment, 200, { postId, ...stats });
      return;
    }

    if (method !== 'POST') {
      sendJson(response, request, environment, 405, { error: 'Method not allowed.' });
      return;
    }

    const body = await readBody(request);
    const postId = normalizePostId(body.postId);
    const visitorId = readVisitorId(request, body);
    if (!visitorId) throw new StatsInputError('A valid visitor id is required.');
    const visitorHash = hashVisitorId(visitorId, environment.STATS_HASH_SECRET);

    if (path === '/stats/view') {
      const stats = await repository.recordView(postId, visitorHash);
      sendJson(response, request, environment, 200, { postId, ...stats });
      return;
    }
    if (path === '/stats/like') {
      if (typeof body.liked !== 'boolean') throw new StatsInputError('The liked value must be boolean.');
      const stats = await repository.setLike(postId, visitorHash, body.liked);
      sendJson(response, request, environment, 200, { postId, ...stats, liked: body.liked });
      return;
    }

    sendJson(response, request, environment, 404, { error: 'Not found.' });
  } catch (error) {
    if (error instanceof StatsInputError) {
      sendJson(response, request, environment, error.statusCode, { error: error.message });
      return;
    }
    console.error('Stats request failed', error);
    sendJson(response, request, environment, 500, { error: 'Stats service unavailable.' });
  }
};

module.exports = {
  STATS_VISITOR_COOKIE,
  createStatsHandler,
  createStatsPool,
  createStatsRepository,
  getAllowedOrigins,
  getPostgresConfig,
  hashVisitorId,
  normalizePostId,
  parseCookies,
  readVisitorId,
};
