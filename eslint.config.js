import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Catches the temporal-dead-zone footgun we hit twice — useEffect
      // dep array referencing state declared further down in the same
      // component, throwing ReferenceError → blank screen.
      'no-use-before-define': ['error', {
        functions: false,        // function declarations are hoisted, OK
        classes: true,
        variables: true,         // const/let → must declare before use
        allowNamedExports: false,
      }],
    },
  },
])
