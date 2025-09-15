module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'plugin:security/recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['security', 'node'],
  rules: {
    // JavaScript/Node.js Standards
    'no-unused-vars': 'warn',
    'no-console': 'off', // Allow console.log in backend
    'prefer-const': 'error',
    'no-var': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
    'template-curly-spacing': ['error', 'never'],
    
    // Node.js specific
    'node/no-unsupported-features/es-syntax': 'off',
    'node/no-missing-import': 'off',
    'node/no-unpublished-require': 'off',
    'node/exports-style': ['error', 'module.exports'],
    'node/prefer-global/buffer': ['error', 'always'],
    'node/prefer-global/console': ['error', 'always'],
    'node/prefer-global/process': ['error', 'always'],
    
    // Security rules
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-non-literal-require': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-pseudoRandomBytes': 'error',
    
    // API Standards
    'max-len': ['error', { code: 100, ignoreUrls: true, ignoreStrings: true }],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'comma-dangle': ['error', 'es5'],
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
    'camelcase': ['error', { properties: 'never' }],
    'new-cap': ['error', { newIsCap: true, capIsNew: false }],
    
    // Error handling
    'handle-callback-err': 'error',
    'no-throw-literal': 'error',
    
    // Async/await
    'require-await': 'error',
    'no-return-await': 'error',
  },
  overrides: [
    {
      files: ['*.test.js', '*.spec.js'],
      env: {
        jest: true,
      },
      rules: {
        'security/detect-object-injection': 'off',
        'node/no-unpublished-require': 'off',
      },
    },
    {
      files: ['src/migrations/*.js'],
      rules: {
        'no-console': 'off',
        'security/detect-non-literal-fs-filename': 'off',
      },
    },
  ],
};