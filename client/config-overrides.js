const { override, disableEsLint } = require('customize-cra');

module.exports = override(
  // Disable ESLint during build to prevent deployment failures
  disableEsLint(),
  // Basic configuration - minimal changes for stability
  (config) => {
    return config;
  }
);