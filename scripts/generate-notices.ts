// Resolve locked Rust dependencies and collect their license texts.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { licenseFiles, licenseText, noticeSeparator } from './notices/licenses.ts';
import { repo } from './shared/paths.ts';

interface CargoPackage {
  name: string;
  version: string;
  manifest_path: string;
  source: string | null;
  license_file: string | null;
  license: string | null;
  repository: string | null;
}

function dependencies(): CargoPackage[] {
  let triple = 'x86_64-apple-darwin';
  if (process.arch === 'arm64') triple = 'aarch64-apple-darwin';
  const output = execFileSync(
    'cargo',
    ['metadata', '--locked', '--format-version', '1', '--filter-platform', triple],
    { cwd: repo, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  const metadata: { packages: CargoPackage[] } = JSON.parse(output);
  return metadata.packages.filter((pkg) => pkg.source).sort((a, b) => a.name.localeCompare(b.name));
}

function packageNotice(pkg: CargoPackage): string {
  const directory = path.dirname(pkg.manifest_path);
  const heading = `\n${noticeSeparator}\n${pkg.name} ${pkg.version}\nLicense: ${pkg.license || 'See included license'}\nSource: ${pkg.repository || pkg.source}\n`;
  return (
    heading +
    licenseText(directory, licenseFiles(directory, pkg.license_file)).replaceAll('\r\n', '\n')
  );
}

function main() {
  const heading =
    'mactions dependency license texts\nGenerated from Cargo.lock; includes build and test dependencies.\n';
  const notices = dependencies().map(packageNotice).join('');
  const outputDirectory = path.join(repo, 'dist/licenses');
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, 'DEPENDENCY-LICENSES.txt'), heading + notices);
  console.log('Wrote dist/licenses/DEPENDENCY-LICENSES.txt');
}

main();
