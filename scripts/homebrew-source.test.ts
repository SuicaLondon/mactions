import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

import { generateHomebrewSourceFormula } from './homebrew-source.ts';
import { repo } from './shared/paths.ts';

interface SourceOptions {
  version?: string;
  license?: string;
  licenseText?: string;
  omit?: string;
  assetsScript?: boolean;
}

function sourceFixture(root: string, options: SourceOptions = {}) {
  const source = path.join(root, 'mactions-source');
  fs.rmSync(source, { recursive: true, force: true });
  const files: Record<string, string> = {
    'Cargo.toml': `[package]\nname = "mactions"\nversion = "${options.version ?? '0.3.0'}"\nlicense = "${options.license ?? 'MIT'}"\n`,
    'Cargo.lock': '# Fixture lockfile',
    LICENSE: options.licenseText ?? fs.readFileSync(path.join(repo, 'LICENSE'), 'utf8'),
    'build.rs': 'fn main() {}',
    'src/main.rs': 'fn main() {}',
    'src/lib.rs': '// Fixture library',
    'docs/THIRD-PARTY-NOTICES.md': '# Fixture notices',
    'scripts/frontend-notices.ts': '// Fixture frontend notice generator',
    'scripts/generate-notices.ts': '// Fixture Rust notice generator',
    'scripts/notices/licenses.ts': '// Fixture license helper',
    'scripts/shared/paths.ts': '// Fixture path helper',
    'web/index.html': '<div id="root"></div>',
    'web/src/main.tsx': '// Fixture frontend',
    'web/package-lock.json': '{}',
    'web/package.json': JSON.stringify({ scripts: { 'build:assets': 'vite build' } }),
  };
  if (options.assetsScript === false) files['web/package.json'] = '{}';
  for (const [name, content] of Object.entries(files)) {
    if (name === options.omit) continue;
    const destination = path.join(source, name);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, content);
  }
  const archive = path.join(root, 'mactions-source.tar.gz');
  execFileSync('/usr/bin/tar', ['-czf', archive, '-C', root, 'mactions-source']);
  return archive;
}

function withFixture(run: (root: string, output: string) => void) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mactions-homebrew-source-'));
  try {
    run(root, path.join(root, 'Formula/mactions.rb'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('generates licensed source-build metadata from the final archive bytes', () => {
  withFixture((root, output) => {
    const archive = sourceFixture(root);
    const url = 'https://github.com/SuicaLondon/mactions/archive/refs/tags/v0.3.0.tar.gz';
    assert.equal(generateHomebrewSourceFormula(archive, url, output), output);
    const formula = fs.readFileSync(output, 'utf8');
    const checksum = createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
    assert.ok(formula.includes(`url "${url}"`));
    assert.ok(formula.includes(`sha256 "${checksum}"`));
    assert.ok(!formula.includes('  version "0.3.0"'));
    assert.ok(formula.includes('license "MIT"'));
    assert.ok(formula.includes('depends_on "node" => :build'));
    assert.ok(formula.includes('depends_on "rust" => :build'));
    assert.ok(formula.includes('depends_on "gh"'));
    assert.ok(formula.includes('"cargo", "install", *std_cargo_args'));
    assert.ok(
      formula.includes('"node", "--experimental-strip-types", "scripts/frontend-notices.ts"'),
    );
    assert.ok(
      formula.includes('"node", "--experimental-strip-types", "scripts/generate-notices.ts"'),
    );
    assert.ok(formula.includes('pkgshare.install "LICENSE", "docs/THIRD-PARTY-NOTICES.md"'));
    assert.ok(!formula.includes('macos-arm64.tar.gz'));
    assert.ok(!formula.includes('libexec/gh'));
    execFileSync('/usr/bin/ruby', ['-c', output]);
    fs.writeFileSync(
      path.join(root, 'mactions-source/src/main.rs'),
      'fn main() { println!("new"); }',
    );
    execFileSync('/usr/bin/tar', ['-czf', archive, '-C', root, 'mactions-source']);
    generateHomebrewSourceFormula(archive, url, output);
    assert.notEqual(fs.readFileSync(output, 'utf8'), formula);
  });
});

test('allows only the same local source archive for unpublished-source validation', () => {
  withFixture((root, output) => {
    const archive = sourceFixture(root);
    const url = pathToFileURL(archive).href;
    generateHomebrewSourceFormula(archive, url, output);
    const formula = fs.readFileSync(output, 'utf8');
    assert.ok(formula.includes(`url "${url}"`));
    assert.ok(formula.includes('  version "0.3.0"'));
    for (const other of [
      pathToFileURL(path.join(root, 'other.tar.gz')).href,
      `${url}?download=1`,
      `${url}#fragment`,
    ])
      assert.throws(() => generateHomebrewSourceFormula(archive, other, output), /matching/);
  });
});

test('rejects source URLs that name a different version, repository, or transport', () => {
  withFixture((root, output) => {
    const archive = sourceFixture(root);
    for (const url of [
      'https://github.com/SuicaLondon/mactions/archive/refs/tags/v0.2.0.tar.gz',
      'https://github.com/SuicaLondon/other/archive/refs/tags/v0.3.0.tar.gz',
      'http://github.com/SuicaLondon/mactions/archive/refs/tags/v0.3.0.tar.gz',
      'https://github.com/SuicaLondon/mactions/archive/refs/heads/main.tar.gz',
    ])
      assert.throws(() => generateHomebrewSourceFormula(archive, url, output), /matching/);
    assert.equal(fs.existsSync(output), false);
  });
});

test('rejects unlicensed or incomplete source archives before writing a formula', () => {
  withFixture((root, output) => {
    const cases: [SourceOptions, RegExp][] = [
      [{ license: 'Apache-2.0' }, /Cargo.toml must declare the MIT/],
      [{ licenseText: 'All rights reserved' }, /SuicaLondon MIT/],
      [{ omit: 'LICENSE' }, /missing LICENSE/],
      [{ omit: 'Cargo.lock' }, /missing Cargo.lock/],
      [{ omit: 'web/package-lock.json' }, /missing web\/package-lock.json/],
      [{ omit: 'scripts/notices/licenses.ts' }, /missing scripts\/notices\/licenses.ts/],
      [{ assetsScript: false }, /build:assets/],
      [{ version: '0.3.0-beta.1' }, /stable package version/],
    ];
    for (const [options, error] of cases) {
      const archive = sourceFixture(root, options);
      assert.throws(
        () => generateHomebrewSourceFormula(archive, pathToFileURL(archive).href, output),
        error,
      );
    }
    assert.equal(fs.existsSync(output), false);
  });
});

test('rejects archives with sources outside the single package directory', () => {
  withFixture((root, output) => {
    const archive = sourceFixture(root);
    fs.writeFileSync(path.join(root, 'outside.txt'), 'unexpected source');
    execFileSync('/usr/bin/tar', ['-czf', archive, '-C', root, 'mactions-source', 'outside.txt']);
    assert.throws(
      () => generateHomebrewSourceFormula(archive, pathToFileURL(archive).href, output),
      /inside one directory/,
    );
    assert.equal(fs.existsSync(output), false);
  });
});
