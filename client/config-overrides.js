const { override, disableEsLint, addWebpackPlugin } = require('customize-cra');
const { IgnorePlugin } = require('webpack');

module.exports = override(
  // Disable ESLint completely
  disableEsLint(),
  // Ignore ESLint during build
  (config) => {
    // Remove ESLint plugin
    config.plugins = config.plugins.filter(plugin => 
      plugin.constructor.name !== 'ESLintWebpackPlugin' && 
      plugin.constructor.name !== 'ESLintPlugin'
    );
    
    // Disable all ESLint loaders
    if (config.module && config.module.rules) {
      config.module.rules = config.module.rules.map(rule => {
        if (rule.use && Array.isArray(rule.use)) {
          rule.use = rule.use.filter(useItem => 
            !(useItem.loader && useItem.loader.includes('eslint')) &&
            !(useItem && useItem.includes && useItem.includes('eslint'))
          );
        }
        return rule;
      });
    }
    
    return config;
  }
);