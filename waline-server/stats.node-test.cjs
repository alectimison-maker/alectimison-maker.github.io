const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const {
  STATS_VISITOR_COOKIE,
  createStatsHandler,
  createStatsRepository,
  getAllowedOrigins,
  hashVisitorId,
  normalizePostId,
  readVisitorId,
} = require('./stats.cjs');

const environment = {
  SITE_URL: 'https://aliouswe.com',
  STATS_HASH_SECRET: 'test-secret',
};

const makeResponse = () => ({
  headers: {},
  statusCode: 200,
  body: '',
  setHeader(name, value) {
    this.headers[name.toLowerCase()] = value;
  },
  writeHead(statusCode, headers) {
    this.statusCode = statusCode;
    Object.entries(headers).forEach(([name, value]) => this.setHeader(name, value));
  },
  end(body = '') {
    this.body = body;
  },
});

describe('Stats helpers', () => {
  it('accepts ordinary post ids and rejects path traversal', () => {
    assert.equal(normalizePostId('everything-i-kown-about-pid'), 'everything-i-kown-about-pid');
    assert.throws(() => normalizePostId('../secrets'), /Invalid post id/);
    assert.throws(() => normalizePostId(''), /Invalid post id/);
  });

  it('reads the visitor id from a cookie, with safe request fallbacks', () => {
    const cookieVisitor = '11111111-1111-4111-8111-111111111111';
    const headerVisitor = '22222222-2222-4222-8222-222222222222';
    assert.equal(
      readVisitorId({
        headers: { cookie: `${STATS_VISITOR_COOKIE}=${cookieVisitor}`, 'x-stats-visitor': headerVisitor },
      }),
      cookieVisitor,
    );
    assert.equal(
      readVisitorId({ headers: { 'x-stats-visitor': headerVisitor } }),
      headerVisitor,
    );
    assert.equal(readVisitorId({ headers: {}, body: { visitorId: 'too-short' } }), undefined);
  });

  it('hashes visitor ids without storing the raw browser identifier', () => {
    const first = hashVisitorId('visitor-123456789012', environment.STATS_HASH_SECRET);
    const second = hashVisitorId('visitor-123456789012', environment.STATS_HASH_SECRET);
    assert.equal(first, second);
    assert.match(first, /^[a-f0-9]{64}$/);
    assert.notEqual(first, 'visitor-123456789012');
  });

  it('allows the production origin and local development origins only', () => {
    const origins = getAllowedOrigins(environment);
    assert.equal(origins.has('https://aliouswe.com'), true);
    assert.equal(origins.has('https://evil.example'), false);
  });
});

describe('Stats handler', () => {
  it('returns stats and CORS headers for the configured site', async () => {
    const calls = [];
    const repository = {
      getStats: async (postId, visitorHash) => {
        calls.push({ method: 'getStats', postId, visitorHash });
        return { views: 12, likes: 3, liked: true };
      },
    };
    const response = makeResponse();

    await createStatsHandler({ repository, environment })(
      {
        method: 'GET',
        url: '/stats?postId=datum',
        headers: {
          origin: 'https://aliouswe.com',
          cookie: `${STATS_VISITOR_COOKIE}=11111111-1111-4111-8111-111111111111`,
        },
      },
      response,
    );

    assert.deepEqual(JSON.parse(response.body), {
      postId: 'datum',
      views: 12,
      likes: 3,
      liked: true,
    });
    assert.equal(response.headers['access-control-allow-origin'], 'https://aliouswe.com');
    assert.equal(calls[0].postId, 'datum');
    assert.match(calls[0].visitorHash, /^[a-f0-9]{64}$/);
  });

  it('does not allow a like mutation without an anonymous visitor id', async () => {
    const response = makeResponse();
    const repository = { setLike: async () => assert.fail('should not reach repository') };

    await createStatsHandler({ repository, environment })(
      { method: 'POST', url: '/stats/like', headers: {}, body: { postId: 'datum', liked: true } },
      response,
    );

    assert.equal(response.statusCode, 400);
    assert.match(response.body, /visitor/i);
  });

  it('handles preflight requests without touching the repository', async () => {
    const response = makeResponse();
    await createStatsHandler({ repository: { getStats: async () => assert.fail() }, environment })(
      { method: 'OPTIONS', url: '/stats', headers: { origin: 'https://aliouswe.com' } },
      response,
    );
    assert.equal(response.statusCode, 204);
    assert.equal(response.headers['access-control-allow-methods'], 'GET, POST, OPTIONS');
  });
});

const fakePool = ({ dailyInserted = 1, likeChanged = 1 } = {}) => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('blog_post_daily_views')) return { rowCount: dailyInserted, rows: [] };
      if (sql.includes('INSERT INTO blog_post_likes')) return { rowCount: likeChanged, rows: [] };
      if (sql.includes('DELETE FROM blog_post_likes')) return { rowCount: likeChanged, rows: [] };
      if (sql.includes('SELECT') && sql.includes('blog_post_stats')) {
        return { rowCount: 1, rows: [{ views: '4', likes: '2', liked: true }] };
      }
      return { rowCount: 1, rows: [] };
    },
    release() {},
  };
  return {
    calls,
    async connect() {
      return client;
    },
    async query(sql, params) {
      calls.push({ sql, params });
      return { rowCount: 1, rows: [{ views: '4', likes: '2', liked: true }] };
    },
  };
};

describe('Stats repository', () => {
  it('increments a daily view only when the unique insert succeeds', async () => {
    const pool = fakePool({ dailyInserted: 1 });
    const repository = createStatsRepository({
      pool,
      clock: () => new Date('2026-09-03T00:00:00.000Z'),
    });
    const result = await repository.recordView('datum', 'a'.repeat(64));

    assert.equal(result.counted, true);
    assert.equal(pool.calls.some(({ sql }) => sql.includes('views_total = views_total + 1')), true);
    assert.equal(pool.calls.some(({ params }) => params?.includes('2026-09-03')), true);
  });

  it('does not increment a duplicate daily view', async () => {
    const pool = fakePool({ dailyInserted: 0 });
    const repository = createStatsRepository({ pool });
    const result = await repository.recordView('datum', 'a'.repeat(64));

    assert.equal(result.counted, false);
    assert.equal(pool.calls.some(({ sql }) => sql.includes('views_total = views_total + 1')), false);
  });

  it('changes the aggregate only when a like relation changes', async () => {
    const pool = fakePool({ likeChanged: 1 });
    const repository = createStatsRepository({ pool });
    const result = await repository.setLike('datum', 'a'.repeat(64), true);

    assert.equal(result.changed, true);
    assert.equal(pool.calls.some(({ sql }) => sql.includes('likes_total = GREATEST(0, likes_total + 1)')), true);
  });
});
