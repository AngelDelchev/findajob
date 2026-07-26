import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      /*
       * Downgraded to a warning, deliberately.
       *
       * This rule flags any setState reached from an effect body, which includes the
       * "fetch on mount, then store the result" pattern used by every page here
       * (`useEffect(() => { void load() }, [load])`). React's own documentation lists
       * that as the correct approach for an app with no framework or data-fetching
       * library, so treating it as an error would mean 20-plus suppression comments
       * describing an intentional pattern.
       *
       * Kept as a warning rather than switched off so genuinely accidental cascading
       * updates still show up in `npm run lint` output.
       */
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
