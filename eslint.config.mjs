import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

const compat = new FlatCompat({ baseDirectory: import.meta.dirname })

/** @type {import('eslint').Linter.Config[]} */
const config = [
  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript recommended rules (type-unaware, safe for CI speed)
  ...tseslint.configs.recommended,

  // Next.js core web vitals + accessibility rules
  ...compat.extends('next/core-web-vitals'),

  // React Hooks rules (exhaustive-deps, rules-of-hooks)
  {
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },

  // Project-wide overrides
  {
    rules: {
      // TypeScript already enforces this; the ESLint rule causes false positives
      'no-undef': 'off',

      // Allow explicit `any` where escape hatches are genuinely needed,
      // but warn to keep it visible in the diff
      '@typescript-eslint/no-explicit-any': 'warn',

      // Unused vars: ignore leading-underscore names (conventional for intentional ignores)
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],

      // next/core-web-vitals already enforces img rules via eslint-plugin-next
      '@next/next/no-img-element': 'error',
    },
  },

  // Ignore generated / vendor / build directories
  {
    ignores: [
      '.next/**',
      '.agents/**',
      'node_modules/**',
      '_reference/**',
      'public/**',
      'dist/**',
      'next-env.d.ts',
    ],
  },
]

export default config
