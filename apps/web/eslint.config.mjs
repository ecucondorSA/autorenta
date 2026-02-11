import js from '@eslint/js';
import angular from '@angular-eslint/eslint-plugin';
import angularTemplate from '@angular-eslint/eslint-plugin-template';
import parser from '@typescript-eslint/parser';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import importPlugin from 'eslint-plugin-import';

const tsProjectOptions = {
  languageOptions: {
    parser,
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
};

export default [
  {
    ignores: [
      'dist/**/*',
      'out-tsc/**/*',
      'coverage/**/*',
      'node_modules/**/*',
      'tmp/**/*',
      'src/**/*.html', // Ignore HTML files to avoid parsing errors
      'src/index.html',
    ],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    ...tsProjectOptions,
    plugins: {
      '@angular-eslint': angular,
      '@typescript-eslint': typescriptEslint,
      import: importPlugin,
    },
    rules: {
      ...angular.configs['recommended'].rules,
      ...typescriptEslint.configs['recommended'].rules,
      'import/no-unresolved': 'off', // Disabled due to Angular module resolution
      'import/order': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off', // Too many existing violations
      '@typescript-eslint/no-explicit-any': 'warn', // Downgrade to warning
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'off', // Disabled for test files with jasmine globals
      '@angular-eslint/prefer-inject': 'off', // Allow constructor injection for now
      // Allow intentional logging but flag console.log (CLAUDE.md §4)
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
    },
  },
  // Restrict direct Supabase access in features/ and shared/ (CLAUDE.md §4)
  // Supabase must be accessed through core/services/ facades only
  {
    files: ['src/app/features/**/*.ts', 'src/app/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/supabase-client.service*'],
              message:
                'Import Supabase through core/services/ facades, not directly. See CLAUDE.md §4.',
            },
          ],
        },
      ],
    },
  },
  // Allow console in infrastructure/debug services that wrap or extend it
  {
    files: [
      'src/app/core/services/infrastructure/logger.service.ts',
      'src/app/core/services/infrastructure/sentry.service.ts',
      'src/app/core/services/infrastructure/global-error-handler.ts',
      'src/app/core/services/admin/debug.service.ts',
      'src/app/core/services/bookings/booking-flow-logger.service.ts',
      'src/server.ts',
      'src/test-setup.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  // Relaxed rules for test files
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/*.vitest.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Allow 'any' in tests for mocking
      '@typescript-eslint/no-unused-vars': 'off', // Allow unused vars in test setup
      'no-console': 'off', // Allow console in tests
    },
  },
];
