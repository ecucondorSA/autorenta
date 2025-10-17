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
    },
  },
];
