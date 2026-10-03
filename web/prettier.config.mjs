import { fileURLToPath, URL } from 'node:url';

import { classFunctions } from './lint/cn/cn-context.ts';

/** @satisfies {import('prettier').Config & { tailwindStylesheet: string, tailwindFunctions: string[], tailwindPreserveWhitespace: boolean }} */
const config = {
  plugins: [fileURLToPath(import.meta.resolve('prettier-plugin-tailwindcss'))],
  tailwindStylesheet: fileURLToPath(new URL('./src/styles/index.css', import.meta.url)),
  tailwindFunctions: classFunctions,
  tailwindPreserveWhitespace: true,
  printWidth: 100,
  singleQuote: true,
  trailingComma: 'all',
};

export default config;
