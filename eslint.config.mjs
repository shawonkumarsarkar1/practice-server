import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';

/**
 * Enhanced ESLint Configuration for TypeScript Backend Development
 * Focused on immediate error detection and resolution
 */

export default defineConfig([
  // =========================================================================
  // CONFIGURATION 1: BASE JAVASCRIPT SETTINGS
  // =========================================================================
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2025,
        ...globals.node,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-undefined': 'error',
      'no-unused-vars': 'off',
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'arrow-spacing': 'error',
      'no-duplicate-imports': 'error',
      'no-restricted-syntax': ['error', 'ForInStatement', 'WithStatement'],
    },
  },

  // =========================================================================
  // CONFIGURATION 2: ENHANCED TYPESCRIPT-SPECIFIC SETTINGS
  // =========================================================================
  {
    files: ['**/*.{ts,mts,cts}'],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json', // Ensure this points to your tsconfig
        tsconfigRootDir: typeof process !== 'undefined' ? process.cwd() : '',
      },
    },
    rules: {
      // 🔴 CRITICAL ERRORS - Must fix immediately
      '@typescript-eslint/no-unused-vars': 'error', // Changed from warn to error
      '@typescript-eslint/no-explicit-any': 'error', // Changed from warn to error
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',

      // 🟠 STRICT TYPE CHECKS - Prevent common bugs
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',

      // 🔵 CODE QUALITY - Better practices
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn', // Warn on non-null assertions

      // ⚡ PERFORMANCE & BEST PRACTICES
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      '@typescript-eslint/prefer-for-of': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
    },
  },

  // =========================================================================
  // CONFIGURATION 3: NODE.JS SPECIFIC RULES FOR BACKEND
  // =========================================================================
  {
    files: ['**/*.{ts,mts,cts}'],
    rules: {
      // Node.js specific error prevention
      'no-process-exit': 'error',
      'no-sync': 'error', // Prefer async methods in Node.js
      'handle-callback-err': 'error',
    },
  },

  // =========================================================================
  // CONFIGURATION 4: PRETTIER INTEGRATION
  // =========================================================================
  eslintConfigPrettier,

  // =========================================================================
  // CONFIGURATION 5: IGNORE PATTERNS
  // =========================================================================
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'logs/**',
      'coverage/**', // Test coverage
      '*.min.js', // Minified files
    ],
  },
]);
