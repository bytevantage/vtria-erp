const { override } = require('customize-cra');

module.exports = override(
  // Basic configuration - minimal changes for stability
  (config) => {
    return config;
  }
);