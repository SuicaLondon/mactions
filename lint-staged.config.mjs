export default {
  '*.{ts,tsx,js,jsx,mjs,cjs}': [
    'node --experimental-strip-types scripts/hooks/lint-files.ts',
    'node --experimental-strip-types web/node_modules/prettier/bin/prettier.cjs --write --config web/prettier.config.mjs',
  ],
  '*.{json,md,css,html,yml,yaml}':
    'node --experimental-strip-types web/node_modules/prettier/bin/prettier.cjs --write --config web/prettier.config.mjs',
  '*.rs': 'rustfmt --edition 2021 --config skip_children=true',
};
