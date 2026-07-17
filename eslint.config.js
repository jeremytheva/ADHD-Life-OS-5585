import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
        React: true,
        JSX: true
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },
        sourceType: 'module'
      }
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'no-undef': 'error', 
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': 'off',
      // JSX identifiers are not reported as references by the base rule.
      // Component names remain checked by the React compiler/toolchain, while
      // local variables and function parameters are still enforced here.
      'no-unused-vars': ['error', { varsIgnorePattern: '^(React|[A-Z][A-Za-z0-9_]*)$', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-case-declarations': 'off',
      'no-useless-catch': 'off'
    },
  }
];
