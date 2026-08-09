module.exports = {
  init() {
    return {
      database() {
        return {
          command: { aggregate: {} },
        };
      },
    };
  },
};
