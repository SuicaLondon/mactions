import { after, describe, it } from 'node:test';

import { RuleTester, type RuleTesterConfig } from '@typescript-eslint/rule-tester';

// typescript-eslint's RuleTester runs on the host test framework, so each rule case becomes a
// node:test test.
RuleTester.afterAll = after;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

/** A rule tester that parses TypeScript; pass `ecmaFeatures.jsx` for JSX cases. */
export function ruleTester(config?: RuleTesterConfig) {
  return new RuleTester(config);
}
