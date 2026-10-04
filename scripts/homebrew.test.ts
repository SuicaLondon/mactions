import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { generateHomebrewFormula } from './homebrew.ts';

function releaseFixture(
  root: string,
  manifest: unknown = { version: '0.2.0', arch: 'arm64', min_macos: 12 },
  withGitHubCli = true,
) {
  const bundle = path.join(root, 'mactions-0.2.0-macos-arm64');
  fs.mkdirSync(path.join(bundle, 'libexec'), { recursive: true });
  fs.writeFileSync(path.join(bundle, 'mactions'), 'fixture manager');
  if (withGitHubCli) fs.writeFileSync(path.join(bundle, 'libexec/gh'), 'fixture GitHub CLI');
  fs.writeFileSync(path.join(bundle, 'manifest.json'), JSON.stringify(manifest));
  const archive = `${bundle}.tar.gz`;
  execFileSync('/usr/bin/tar', ['-czf', archive, '-C', root, path.basename(bundle)]);
  return archive;
}

test('generates a formula with the final archive checksum and bundled tools', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mactions-homebrew-'));
  try {
    const archive = releaseFixture(root);
    const output = path.join(root, 'tap/Formula/mactions.rb');
    assert.equal(generateHomebrewFormula(archive, output), output);
    const formula = fs.readFileSync(output, 'utf8');
    const checksum = createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
    assert.ok(formula.includes(`sha256 "${checksum}"`));
    assert.ok(formula.includes('license "MIT"'));
    assert.ok(formula.includes('/v0.2.0/mactions-0.2.0-macos-arm64.tar.gz'));
    assert.ok(formula.includes('bin.write_exec_script libexec/"mactions"'));
    assert.ok(formula.includes('assert_path_exists libexec/"libexec/gh"'));
    execFileSync('/usr/bin/ruby', ['-c', output]);
    fs.writeFileSync(
      path.join(root, 'mactions-0.2.0-macos-arm64/mactions'),
      'changed signed bytes',
    );
    execFileSync('/usr/bin/tar', ['-czf', archive, '-C', root, 'mactions-0.2.0-macos-arm64']);
    generateHomebrewFormula(archive, output);
    assert.notEqual(fs.readFileSync(output, 'utf8'), formula);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('rejects incompatible or mismatched release manifests', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mactions-homebrew-'));
  try {
    for (const manifest of [
      { version: '0.3.0', arch: 'arm64', min_macos: 12 },
      { version: '0.2.0', arch: 'x64', min_macos: 12 },
      { version: '0.2.0', arch: 'arm64', min_macos: 15 },
      null,
    ]) {
      const archive = releaseFixture(root, manifest);
      assert.throws(
        () => generateHomebrewFormula(archive, path.join(root, 'mactions.rb')),
        /manifest must match/,
      );
    }
    assert.equal(fs.existsSync(path.join(root, 'mactions.rb')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('rejects archives that omit the bundled GitHub CLI', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mactions-homebrew-'));
  try {
    const archive = releaseFixture(root, undefined, false);
    assert.throws(
      () => generateHomebrewFormula(archive, path.join(root, 'mactions.rb')),
      /missing libexec\/gh/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
