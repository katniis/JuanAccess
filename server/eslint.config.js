import js from '@eslint/js';
import globals from 'globals';

export default [
   {
      ignores: ['node_modules/**', 'dist/**', 'coverage/**'],
   },

   js.configs.recommended,

   {
      files: ['**/*.js'],
      languageOptions: {
         ecmaVersion: 'latest',
         sourceType: 'module',
         globals: {
            ...globals.node,
         },
      },

      rules: {
         'no-unused-vars': ['error', { ignoreRestSiblings: true }],
         // 'no-console': 'warn',
         'no-undef': 'error',
         eqeqeq: 'error',
         // curly: 'error',
      },
   },

   {
      files: ['src/__tests__/**/*.js'],
      languageOptions: {
         globals: {
            ...globals.jest,
         },
      },
   },
];
