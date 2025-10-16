import js from '@eslint/js';
import angular from '@angular-eslint/eslint-plugin';
import angularTemplate from '@angular-eslint/eslint-plugin-template';
import parser from '@typescript-eslint/parser';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import importPlugin from 'eslint-plugin-import';

const tsProjectOptions = {
  parser,
  parserOptions: {
    project: ['tsconfig.json'],
    tsconfigRootDir: import.meta.dirname,
    ecmaVersion: 'latest',
    sourceType: 'module',
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
      'import/no-unresolved': ['error', { commonjs: true }],
      'import/order': [
        'warn',
        {
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always',
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object'],
          pathGroups: [
            {
              pattern: '@{app,core,shared,features}/**',
              group: 'internal',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
        },
      ],
      '@typescript-eslint/explicit-function-return-type': ['error'],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/**/*.html'],
    plugins: {
      '@angular-eslint/template': angularTemplate,
    },
    rules: {
      ...angularTemplate.configs['recommended'].rules,
    },
  },
];
