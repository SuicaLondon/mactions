import { describe, expect, it } from 'vitest';

import { mergeTargets, targetCount, targetKindCopy, targetSelectOptions } from './target-options';

describe('mergeTargets', () => {
  it('keeps one target per case-insensitive name', () => {
    expect(
      mergeTargets([
        { kind: 'repo', name: 'Acme/App', private: false },
        { kind: 'repo', name: 'acme/app', private: true },
      ]),
    ).toEqual([{ kind: 'repo', name: 'acme/app', private: true }]);
  });
});

describe('targetSelectOptions', () => {
  it('describes organizations and repository visibility', () => {
    expect(
      targetSelectOptions([
        { kind: 'org', name: 'acme', private: false },
        { kind: 'repo', name: 'acme/app', private: true },
        { kind: 'repo', name: 'acme/site', private: false },
      ]).map(({ detail }) => detail),
    ).toEqual(['Organization', 'Private', 'Public']);
  });
});

describe('targetKindCopy', () => {
  it('names the target kind', () => {
    expect(targetKindCopy('repo').label).toBe('Repository');
    expect(targetKindCopy('org').loadMoreLabel).toBe('Load more organizations');
  });
});

describe('targetCount', () => {
  it('counts targets with the kind name in singular or plural', () => {
    expect(targetCount('org', 1)).toBe('1 organization');
    expect(targetCount('org', 9)).toBe('9 organizations');
    expect(targetCount('repo', 1)).toBe('1 repository');
    expect(targetCount('repo', 9)).toBe('9 repositories');
  });
});
