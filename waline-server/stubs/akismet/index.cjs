module.exports = {
  client() {
    throw new Error('Akismet is disabled; Turnstile, rate limits, and duplicate detection are used instead.');
  },
};
