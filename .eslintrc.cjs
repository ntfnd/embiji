module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  rules: {
    // No semicolons
    semi: 'off',
    '@typescript-eslint/semi': ['error', 'never'],
    // 4 spaces indentation - only TS version
    indent: 'off',
    '@typescript-eslint/indent': ['error', 4],
    // Other rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'off'
  },
  env: {
    browser: true,
    es2020: true,
    node: true
  },
  globals: {
    chrome: 'readonly'
  }
};
