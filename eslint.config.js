import { defineConfig, globalIgnores } from 'eslint/config'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import neostandard from 'neostandard'

export default defineConfig([
  ...neostandard({
    ts: true,
    noJsx: true,
  }),
  globalIgnores(['dist/**', 'node_modules/**', 'bun.lock']),
  {
    rules: {
      eqeqeq: ['error', 'always'],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'no-unused-vars': 'off',
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    languageOptions: {
      globals: {
        Bun: 'readonly',
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        WebSocket: 'readonly',
      },
    },
  },
])
