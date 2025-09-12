// eslint.config.mjs
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';

export default [
  // Ignore build output and vendor dirs
  { ignores: ['.next/', 'node_modules/', 'dist/', 'next-env.d.ts'] },

  // TypeScript + JS recommended (flat) rules
  ...tseslint.configs.recommended,

  // Global rule adjustments to reduce noise while we migrate
  {
    rules: {
      // Allow gradual typing; surface as warnings for now
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow intentionally unused via leading underscore, warn otherwise
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },

  // Next.js rules (choose 'core-web-vitals' for stricter a11y/perf)
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
    settings: { next: { rootDir: ['./'] } },
  },

  // JS-only overrides: disable TS-specific unused-vars on plain JS, use base rule if needed
  {
    files: ['**/*.js'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // API routes: allow 'any' to reduce noise until types are introduced
  {
    files: ['app/api/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];