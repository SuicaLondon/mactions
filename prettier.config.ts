import { fileURLToPath, URL } from 'node:url';

import type { Config } from 'prettier';

import { classFunctions } from './lint/cn/cn-context.ts';

const config = {
  plugins: [fileURLToPath(import.meta.resolve('prettier-plugin-tailwindcss'))],
  tailwindStylesheet: fileURLToPath(new URL('./web/src/styles/index.css', import.meta.url)),
  tailwindFunctions: classFunctions,
  tailwindPreserveWhitespace: true,
  printWidth: 100,
  singleQuote: true,
  trailingComma: 'all',
} satisfies Config & {
  tailwindStylesheet: string;
  tailwindFunctions: string[];
  tailwindPreserveWhitespace: boolean;
};

export default config;
