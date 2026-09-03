const Application = require('@waline/vercel');
const {
  assertEnvironment,
  chronologicalRepliesPlugin,
  generatedAvatarUrl,
  preSaveComment,
} = require('./policy.cjs');
const { createStatsHandler, createStatsPool, createStatsRepository } = require('./stats.cjs');

assertEnvironment();

const walineHandler = Application({
  plugins: [chronologicalRepliesPlugin],
  secureDomains: ['aliouswe.com', 'www.aliouswe.com', 'comments.aliouswe.com'],
  preSave: preSaveComment,
  avatarUrl: generatedAvatarUrl,
});

const statsHandler = createStatsHandler({
  environment: process.env,
  repository: createStatsRepository({ pool: createStatsPool() }),
});

module.exports = (request, response) => {
  const path = new URL(request.url || '/', 'https://internal.waline').pathname.replace(/\/+$/u, '') || '/';
  return path === '/stats' || path.startsWith('/stats/')
    ? statsHandler(request, response)
    : walineHandler(request, response);
};
