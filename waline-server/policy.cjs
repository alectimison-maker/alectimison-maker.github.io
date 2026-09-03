const { createHash } = require('node:crypto');

const MAX_COMMENT_LENGTH = 2_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IMAGE_PATTERN = /!\[[^\]]*\]\([^)]*\)|<img\b|data:image\//i;
const REQUIRED_ENVIRONMENT = [
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
];

const DATABASE_ENVIRONMENT_GROUPS = [
  ['PG_DB', 'POSTGRES_DATABASE'],
  ['PG_USER', 'POSTGRES_USER'],
  ['PG_PASSWORD', 'POSTGRES_PASSWORD'],
  ['PG_HOST', 'POSTGRES_HOST'],
];

const text = (value) => String(value ?? '').trim();

const validateComment = (comment) => {
  const nick = text(comment?.nick);
  const mail = text(comment?.mail);
  const content = text(comment?.comment);

  if (!nick) return '请填写昵称。';
  if (!EMAIL_PATTERN.test(mail)) return '请填写有效的邮箱地址。';
  if (!content) return '评论内容不能为空。';
  if ([...content].length > MAX_COMMENT_LENGTH) return `评论不能超过 ${MAX_COMMENT_LENGTH} 个字符。`;
  if (IMAGE_PATTERN.test(content)) return '评论暂不支持图片，请改为普通文字链接。';
  return undefined;
};

const preSaveComment = (comment) => {
  const errmsg = validateComment(comment);
  return errmsg ? { errmsg } : undefined;
};

const sortRepliesChronologically = (responseBody) => {
  const rootComments = responseBody?.data?.data;
  if (!Array.isArray(rootComments)) return responseBody;

  rootComments.forEach((comment) => {
    if (!Array.isArray(comment?.children)) return;
    comment.children.sort((left, right) => {
      const timeDifference = Number(left?.time ?? 0) - Number(right?.time ?? 0);
      return timeDifference || String(left?.objectId ?? '').localeCompare(String(right?.objectId ?? ''));
    });
  });
  return responseBody;
};

const chronologicalRepliesPlugin = {
  middlewares: [async (ctx, next) => {
    await next();
    sortRepliesChronologically(ctx.body);
  }],
};

const escapeXml = (value) => value.replace(/[<>&'\"]/g, (character) => ({
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  "'": '&apos;',
  '"': '&quot;',
})[character]);

const generatedAvatarUrl = (comment, environment = process.env) => {
  const mail = text(comment?.mail).toLowerCase();
  const authorMail = text(environment.AUTHOR_EMAIL).toLowerCase();
  if (mail && authorMail && mail === authorMail) return `${text(environment.SITE_URL).replace(/\/+$/, '')}/avatar.webp`;

  const nick = text(comment?.nick) || '?';
  const digest = createHash('sha256').update(nick).digest();
  const palettes = [
    ['#2350dc', '#f3eee2'],
    ['#ef3038', '#f3eee2'],
    ['#0b5d45', '#dffcf2'],
    ['#6941c6', '#f3eee2'],
    ['#9a4d16', '#fff2dc'],
  ];
  const [background, foreground] = palettes[digest[0] % palettes.length];
  const initial = escapeXml(Array.from(nick)[0].toUpperCase());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="${background}"/><text x="48" y="52" fill="${foreground}" font-family="serif" font-size="42" text-anchor="middle" dominant-baseline="middle">${initial}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

const missingEnvironment = (environment = process.env) => {
  const missing = REQUIRED_ENVIRONMENT.filter((key) => !text(environment[key]));
  DATABASE_ENVIRONMENT_GROUPS.forEach((alternatives) => {
    if (!alternatives.some((key) => text(environment[key]))) missing.push(alternatives.join(' or '));
  });
  return missing;
};

const assertEnvironment = (environment = process.env) => {
  const missing = missingEnvironment(environment);
  if (missing.length) throw new Error(`Missing required Waline environment: ${missing.join(', ')}`);
  if (text(environment.AKISMET_KEY).toLowerCase() !== 'false') {
    throw new Error('AKISMET_KEY must be false because the legacy Akismet client is intentionally excluded.');
  }
};

module.exports = {
  MAX_COMMENT_LENGTH,
  assertEnvironment,
  chronologicalRepliesPlugin,
  generatedAvatarUrl,
  missingEnvironment,
  preSaveComment,
  sortRepliesChronologically,
  validateComment,
};
