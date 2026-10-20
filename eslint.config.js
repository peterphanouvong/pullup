// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // `.expo` is generated; `supabase/functions` is Deno (npm: specifiers),
    // excluded from tsc for the same reason.
    ignores: ["dist/*", ".expo/*", "supabase/functions/*"],
  },
  {
    // Scoped to TypeScript: eslint-config-expo registers the plugin for
    // these files only, so an unscoped override errors on plain .js files.
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-empty-object-type": ["warn", { allowInterfaces: "with-single-extends" }],
    },
  },
]);
