// Include licenses for packages distributed in the browser bundle.
import fs from 'node:fs';
import path from 'node:path';

import { licenseFiles, licenseText, noticeSeparator } from './notices/licenses.ts';
import { repo } from './shared/paths.ts';

interface LockedPackage {
  version?: string;
  dev?: boolean;
  license?: string;
}

const includedBuildTools = new Set(['node_modules/vite', 'node_modules/tailwindcss']);

function packageNotice(location: string, pkg: LockedPackage): string {
  const directory = path.join(repo, 'web', location);
  const name = location.replace(/^node_modules\//, '');
  const heading = `\n${noticeSeparator}\n${name} ${pkg.version}\nLicense: ${pkg.license || 'See included text'}\n`;
  return (
    heading +
    licenseText(
      directory,
      licenseFiles(directory).filter((name) => /^(license|licence|notice)/i.test(name)),
    )
  );
}

function main() {
  const lockPath = path.join(repo, 'web/package-lock.json');
  const lock: { packages: Record<string, LockedPackage> } = JSON.parse(
    fs.readFileSync(lockPath, 'utf8'),
  );
  const notices = Object.entries(lock.packages)
    .filter(([location, pkg]) => location && (!pkg.dev || includedBuildTools.has(location)))
    .map(([location, pkg]) => packageNotice(location, pkg));

  const heading = 'mactions frontend dependency notices\nGenerated from web/package-lock.json.\n';
  const outputDirectory = path.join(repo, 'dist/licenses');
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, 'FRONTEND-LICENSES.txt'), heading + notices.join(''));
}

main();
