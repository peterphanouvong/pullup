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
      // The React Compiler only treats `use` + capital/digit as a hook, so
      // `use$` gets memoised like a plain call and skipped on re-render:
      // hook order shifts and release builds crash. `useSelector` is the
      // same function under a name the compiler recognises.
      "no-restricted-imports": ["error", {
        paths: [{
          name: "@legendapp/state/react",
          importNames: ["use$"],
          message: "Import useSelector instead: the React Compiler does not see use$ as a hook.",
        }],
      }],
    },
  },
]);
