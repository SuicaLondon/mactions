// Include licenses for the frontend packages actually distributed in the browser bundle.
import fs from 'node:fs';
import path from 'node:path';
import { repo } from './lib.ts';
process.chdir(repo);
interface LockedPackage { version?: string; dev?: boolean; license?: string }
const lock: { packages: Record<string, LockedPackage> } = JSON.parse(fs.readFileSync('web/package-lock.json', 'utf8'));
let text = 'mactions frontend dependency notices\nGenerated from web/package-lock.json.\n';
for (const [location, pkg] of Object.entries(lock.packages)) {
  if (!location || (pkg.dev && !['node_modules/vite', 'node_modules/tailwindcss'].includes(location))) continue;
  const directory = path.join('web', location);
  const licenses = fs.readdirSync(directory).filter(name => /^(license|licence|notice)/i.test(name) && fs.statSync(path.join(directory, name)).isFile());
  if (!licenses.length) throw new Error(`Missing license text: ${location}`);
  text += `\n${'='.repeat(72)}\n${location.replace(/^node_modules\//, '')} ${pkg.version}\nLicense: ${pkg.license || 'See included text'}\n`;
  for (const license of licenses) text += `\n--- ${license} ---\n${fs.readFileSync(path.join(directory, license), 'utf8')}\n`;
}
fs.writeFileSync('docs/FRONTEND-LICENSES.txt', text);
