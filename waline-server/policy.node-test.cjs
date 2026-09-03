const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const {
  MAX_COMMENT_LENGTH,
  assertEnvironment,
  generatedAvatarUrl,
  missingEnvironment,
  preSaveComment,
  sortRepliesChronologically,
  validateComment,
} = require('./policy.cjs');

const completeEnvironment = {
  SITE_URL: 'https://aliouswe.com',
  SERVER_URL: 'https://comments.aliouswe.com',
  JWT_TOKEN: 'test-token',
  AKISMET_KEY: 'false',
  TURNSTILE_KEY: 'test-site-key',
  TURNSTILE_SECRET: 'test-secret-key',
  SMTP_HOST: 'smtp.resend.com',
  SMTP_PORT: '465',
  SMTP_USER: 'resend',
  SMTP_PASS: 'test-resend-key',
  SENDER_EMAIL: 'comments@notify.aliouswe.com',
  AUTHOR_EMAIL: 'owner@example.com',
  STATS_HASH_SECRET: 'test-stats-secret',
  POSTGRES_DATABASE: 'comments',
  POSTGRES_USER: 'comments',
  POSTGRES_PASSWORD: 'test-password',
  POSTGRES_HOST: 'db.example.com',
};

describe('Waline server policy', () => {
  it('requires nickname, valid email, and content', () => {
    assert.equal(validateComment({ mail: 'reader@example.com', comment: 'hello' }), '请填写昵称。');
    assert.equal(validateComment({ nick: 'Reader', mail: 'bad', comment: 'hello' }), '请填写有效的邮箱地址。');
    assert.equal(validateComment({ nick: 'Reader', mail: 'reader@example.com' }), '评论内容不能为空。');
  });

  it('enforces length and image restrictions on the server', () => {
    const base = { nick: 'Reader', mail: 'reader@example.com' };
    assert.match(validateComment({ ...base, comment: 'x'.repeat(MAX_COMMENT_LENGTH + 1) }), /2000/);
    assert.match(validateComment({ ...base, comment: '![tracking](https://example.com/a.png)' }), /不支持图片/);
    assert.equal(validateComment({ ...base, comment: 'A [normal link](https://example.com) is fine.' }), undefined);
  });

  it('returns Waline-compatible validation errors from the pre-save hook', () => {
    assert.deepEqual(preSaveComment({ nick: 'Reader', mail: 'bad', comment: 'hello' }), {
      errmsg: '请填写有效的邮箱地址。',
    });
    assert.equal(preSaveComment({ nick: 'Reader', mail: 'reader@example.com', comment: 'hello' }), undefined);
  });

  it('keeps top-level order while sorting nested replies from oldest to newest', () => {
    const response = {
      data: {
        data: [
          {
            objectId: 'new-root',
            children: [
              { objectId: 'reply-3', time: 300 },
              { objectId: 'reply-1', time: 100 },
              { objectId: 'reply-2', time: 200 },
            ],
          },
          { objectId: 'old-root', children: [] },
        ],
      },
    };

    sortRepliesChronologically(response);
    assert.deepEqual(response.data.data.map(({ objectId }) => objectId), ['new-root', 'old-root']);
    assert.deepEqual(
      response.data.data[0].children.map(({ objectId }) => objectId),
      ['reply-1', 'reply-2', 'reply-3'],
    );
  });

  it('generates private deterministic avatars and preserves the author avatar', () => {
    const environment = { AUTHOR_EMAIL: 'owner@example.com', SITE_URL: 'https://aliouswe.com/' };
    const first = generatedAvatarUrl({ nick: 'Reader', mail: 'reader@example.com' }, environment);
    const second = generatedAvatarUrl({ nick: 'Reader', mail: 'another@example.com' }, environment);
    assert.equal(first, second);
    assert.match(first, /^data:image\/svg\+xml;base64,/);
    assert.equal(generatedAvatarUrl({ nick: 'Owner', mail: 'OWNER@example.com' }, environment), 'https://aliouswe.com/avatar.webp');
  });

  it('fails closed when security, mail, or database configuration is missing', () => {
    assert.deepEqual(missingEnvironment({}), [
      'SITE_URL',
      'SERVER_URL',
      'JWT_TOKEN',
      'AKISMET_KEY',
      'TURNSTILE_KEY',
      'TURNSTILE_SECRET',
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASS',
      'SENDER_EMAIL',
      'AUTHOR_EMAIL',
      'STATS_HASH_SECRET',
      'PG_DB or POSTGRES_DATABASE',
      'PG_USER or POSTGRES_USER',
      'PG_PASSWORD or POSTGRES_PASSWORD',
      'PG_HOST or POSTGRES_HOST',
    ]);
  });

  it('starts only when the legacy Akismet integration stays disabled', () => {
    assert.doesNotThrow(() => assertEnvironment(completeEnvironment));
    assert.throws(
      () => assertEnvironment({ ...completeEnvironment, AKISMET_KEY: 'enabled-by-mistake' }),
      /AKISMET_KEY must be false/,
    );
  });
});
