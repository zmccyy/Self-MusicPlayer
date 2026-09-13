const js = require('@eslint/js')
const tsParser = require('@typescript-eslint/parser')
const tsPlugin = require('@typescript-eslint/eslint-plugin')
const reactHooks = require('eslint-plugin-react-hooks')
const globals = require('globals')

module.exports = [
  js.configs.recommended,
  {
    ignores: ['dist', 'node_modules', 'public/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: globals.browser,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Prevent duplicate reporting between ESLint core and TS rules.
      'no-unused-vars': 'off',
      // TS 的 lib 类型（如 RequestInit）不由 ESLint no-undef 判定，交由 tsc 检查。
      'no-undef': 'off',
    },
  },
]

