const Application = require('@waline/vercel');
const {
  assertEnvironment,
  chronologicalRepliesPlugin,
  generatedAvatarUrl,
  preSaveComment,
} = require('./policy.cjs');

assertEnvironment();

module.exports = Application({
  plugins: [chronologicalRepliesPlugin],
  secureDomains: ['aliouswe.com', 'www.aliouswe.com', 'comments.aliouswe.com'],
  preSave: preSaveComment,
  avatarUrl: generatedAvatarUrl,
});
